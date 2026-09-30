// MusicEngine — port of Beyond the Void's class Music.
//
// Public contract (must match Phase 3 / studio expectations exactly):
//   const e = new MusicEngine();
//   await e.init();              // user-gesture handler
//   e.load(track);
//   e.play();
//   e.stop();
//   e.setMute(b); e.toggleMute(); e.isMuted();
//   e.isPlaying();
//   e.updSpeed(s); e.updStreak(t); e.updStage(i);
//   e.startBoost(); e.stopBoost();
//   e.duckBass();
//   e.triggerDrop();
//
// Procedural-only per Decision A in the plan. No samples, no MP3 paths.
// All sound is synthesized on the fly via Web Audio.

import { SfxBus } from './SfxBus';
import {
  CFG_BASS_GAIN,
  BASS_LFO_DEPTH,
  BASS_DUCK_LEVEL,
  CFG_PAD_GAIN,
  PAD_FILTER_BASE,
  PAD_WARMTH_FREQ,
  CFG_PAD_LFO_DEPTH,
  ARP_GAIN,
  DELAY_FEEDBACK,
  DELAY_FILTER_FREQ,
  DELAY_WET_GAIN,
  BOOST_FREQ_BASE,
  BOOST_FILTER_FREQ,
  BOOST_GAIN,
  STOP_FADE_DUR,
  PAD_LFO_DEFAULT_RATE,
  BASS_LFO_DEFAULT_RATE,
} from './tuning';
import type { EpTrack } from './types';

const MUTE_STORAGE_KEY = 'epmr_music_mute';

const SECONDS_PER_MINUTE = 60;
const TEMPO_NORMALIZE = 120;
const BASS_LFO_TEMPO_SCALE = 0.5;
const PAD_LFO_TEMPO_SCALE = 0.3;
const BASS_FILTER_DEFAULT = 400;
const BASS_FILTER_Q = 1.5;
const PAD_FILTER_Q = 1.5;
const PAD_WARMTH_Q = 0.5;
const DELAY_BEAT_FRACTION = 0.75; // dotted 8th
const DELAY_FALLBACK_TIME = 0.375;
const DEFAULT_PAD_FREQS: readonly [number, number, number] = [220, 223, 330];
const PAD_DETUNE_RATIO = 1.014;
const PAD_THIRD_RATIO = 1.005;
const SPEED_LFO_GAIN = 0.008;
const SPEED_LFO_BASE = 0.3;
const SPEED_LFO_MAX = 0.9;
const SPEED_OSC_BASE = 50;
const SPEED_OSC_GAIN = 0.25;
const STREAK_FREQ_BASE = 700;
const STREAK_FREQ_PER_TIER = 200;
const STREAK_FREQ_CAP = 2800;
const STAGE_FREQ_FLOOR = 200;
const STAGE_FREQ_CEIL = 5000;
const STAGE_FREQ_BASE = 500;
const STAGE_FREQ_PER_STAGE = 50;
const STAGE_FILTER_PEAK = 2000;
const STAGE_PAD_DIP = 0.01;
const BOOST_PAD_FREQ = 2000;
const DROP_BUILD_DURATION_BEATS = 8;
const DROP_ELEVATED_DURATION_BEATS = 16;
const DROP_BASS_BUILD_FALL = 0.7;
const DROP_PAD_BUILD_FALL = 0.8;
const DROP_HAT_BUILD_RISE = 2;
const DROP_BASS_DROP_BOOST = 1.2;
const DROP_PAD_DROP_BOOST = 1.3;
const DROP_HAT_DROP_BOOST = 1.5;
const DROP_PAD_TAIL_BOOST = 0.05;
const DROP_HAT_TAIL_BOOST = 0.5;
const DUCK_RECOVERY_PARTIAL = 0.7;
const DUCK_PARTIAL_TIME = 0.06;
const DUCK_FULL_TIME = 0.15;

export type DropState = 'normal' | 'build' | 'silence' | 'drop' | 'elevated';

interface BassNodes {
  osc: OscillatorNode;
  gain: GainNode & { _baseGain?: number };
  lfo: OscillatorNode;
  lfoG: GainNode;
  filter: BiquadFilterNode;
}

interface PadNodes {
  o1: OscillatorNode;
  o2: OscillatorNode;
  o3: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  lfo: OscillatorNode;
  lfoG: GainNode;
  warmth: BiquadFilterNode;
}

interface DelayNodes {
  node: DelayNode;
  feedback: GainNode;
  filter: BiquadFilterNode;
  wet: GainNode;
}

interface BoostNodes {
  osc: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

export class MusicEngine {
  /** Optional bus. If not supplied, the engine creates and owns its own. */
  readonly sfx: SfxBus;
  /** True when an SfxBus we created internally — we'll dispose it on stop(). */
  private readonly _ownsSfx: boolean;
  /** True between play() and stop(). Mute does not flip this. */
  private _active = false;
  /** Mute state — persisted to localStorage. */
  private _muted: boolean;
  /** The currently-loaded track. play() reads from this. */
  private _track: EpTrack | null = null;
  private _bass: BassNodes | null = null;
  private _pad: PadNodes | null = null;
  private _delay: DelayNodes | null = null;
  private _boost: BoostNodes | null = null;
  /** Cached pad filter cutoff to restore after stopBoost(). */
  private _padFilterPre: number | null = null;
  private _arpI = 0;
  private _dropState: DropState = 'normal';
  private _dropBeat = 0;
  private _dropBassScale = 1;
  private _dropPadScale = 1;
  private _dropHatScale = 1;

  constructor(sfx?: SfxBus) {
    this.sfx = sfx ?? new SfxBus();
    this._ownsSfx = !sfx;
    this._muted = readMuteFromStorage();
  }

  /** Initialize the audio context. Must be called from a user-gesture handler. */
  async init(): Promise<void> {
    this.sfx.init();
    if (this.sfx.ctx && this.sfx.ctx.state === 'suspended') {
      await this.sfx.ctx.resume();
    }
  }

  /** Load (but don't yet play) a track. Replaces any previously loaded track. */
  load(track: EpTrack): void {
    this._track = track;
  }

  /** Convenience: get the current track or null. */
  getTrack(): EpTrack | null {
    return this._track;
  }

  /** Begin playback of the loaded track. No-op if no track is loaded or muted. */
  play(): void {
    if (!this._track) {
      return;
    }
    const ctx = this.sfx.ctx;
    if (!ctx) {
      return;
    }
    this._teardownVoices();
    this._active = true;
    this._dropState = 'normal';
    this._dropBassScale = 1;
    this._dropPadScale = 1;
    this._dropHatScale = 1;
    if (this._muted) {
      return;
    }
    this._buildBass(ctx, this._track);
    this._buildPad(ctx, this._track);
    this._buildDelay(ctx, this._track);
  }

  /** Stop playback with a 1.5s gain fade. Safe to call repeatedly. */
  stop(): void {
    this._active = false;
    this._stopBoost();
    const ctx = this.sfx.ctx;
    if (!ctx) {
      this._teardownVoices();
      return;
    }
    const oldBass = this._bass;
    const oldPad = this._pad;
    const oldDelay = this._delay;
    this._bass = null;
    this._pad = null;
    this._delay = null;
    if (!oldBass && !oldPad && !oldDelay) {
      return;
    }
    const now = ctx.currentTime;
    const ramp = (g: GainNode | null | undefined): void => {
      if (g && g.gain) {
        try {
          g.gain.cancelScheduledValues(now);
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + STOP_FADE_DUR);
        } catch {
          // ignore — invalid state, just disconnect below
        }
      }
    };
    if (oldBass) {
      ramp(oldBass.gain);
      ramp(oldBass.lfoG);
    }
    if (oldPad) {
      ramp(oldPad.gain);
    }
    if (oldDelay) {
      ramp(oldDelay.feedback);
      ramp(oldDelay.wet);
    }
    const fadeMs = STOP_FADE_DUR * 1000 + 100;
    setTimeout(() => {
      stopAndDisconnect(oldBass);
      stopAndDisconnect(oldPad);
      stopAndDisconnect(oldDelay);
    }, fadeMs);
  }

  /**
   * Set mute state. Persisted to localStorage. If active and unmuting,
   * restarts the loaded track; if active and muting, tears down voices
   * but keeps `_active = true` so the next setMute(false) resumes.
   */
  setMute(muted: boolean): void {
    if (this._muted === muted) {
      return;
    }
    this._muted = muted;
    writeMuteToStorage(muted);
    if (this._active) {
      if (muted) {
        const wasActive = this._active;
        this.stop();
        this._active = wasActive;
      } else if (this._track) {
        this.play();
      }
    }
  }

  /** Flip mute and return the new state. */
  toggleMute(): boolean {
    this.setMute(!this._muted);
    return this._muted;
  }

  isMuted(): boolean {
    return this._muted;
  }

  isPlaying(): boolean {
    return this._active && !this._muted;
  }

  /** React to player speed (BTV-specific; harmless for other games). */
  updSpeed(speed: number): void {
    if (!this._bass) {
      return;
    }
    const ctx = this.sfx.ctx;
    if (!ctx) {
      return;
    }
    const t = ctx.currentTime;
    const rate = SPEED_LFO_BASE + Math.min(speed * SPEED_LFO_GAIN, SPEED_LFO_MAX);
    this._bass.lfo.frequency.setTargetAtTime(rate, t, 0.3);
    this._bass.osc.frequency.setTargetAtTime(SPEED_OSC_BASE + speed * SPEED_OSC_GAIN, t, 0.5);
  }

  /** React to streak tier — opens the pad filter. */
  updStreak(tier: number): void {
    if (!this._pad) {
      return;
    }
    const ctx = this.sfx.ctx;
    if (!ctx) {
      return;
    }
    const target = STREAK_FREQ_BASE + tier * STREAK_FREQ_PER_TIER;
    this._pad.filter.frequency.setTargetAtTime(
      Math.min(STREAK_FREQ_CAP, target),
      ctx.currentTime,
      0.3,
    );
  }

  /** React to a stage change — pad filter sweep + brief volume dip. */
  updStage(stageIndex: number): void {
    if (!this._pad) {
      return;
    }
    const ctx = this.sfx.ctx;
    if (!ctx) {
      return;
    }
    const t = ctx.currentTime;
    const s = Number.isFinite(stageIndex) ? stageIndex : 0;
    const settle = Math.max(
      STAGE_FREQ_FLOOR,
      Math.min(STAGE_FREQ_CEIL, STAGE_FREQ_BASE + s * STAGE_FREQ_PER_STAGE),
    );
    this._pad.filter.frequency.cancelScheduledValues(t);
    this._pad.filter.frequency.setValueAtTime(this._pad.filter.frequency.value, t);
    this._pad.filter.frequency.setTargetAtTime(STAGE_FILTER_PEAK, t, 0.3);
    this._pad.filter.frequency.setTargetAtTime(settle, t + 1.5, 0.5);
    this._pad.gain.gain.cancelScheduledValues(t);
    this._pad.gain.gain.setValueAtTime(this._pad.gain.gain.value, t);
    this._pad.gain.gain.setTargetAtTime(STAGE_PAD_DIP, t, 0.1);
    this._pad.gain.gain.setTargetAtTime(CFG_PAD_GAIN, t + 0.5, 0.4);
  }

  startBoost(): void {
    if (this._muted || this._boost) {
      return;
    }
    const ctx = this.sfx.ctx;
    if (!ctx) {
      return;
    }
    const dest = this.sfx.musicDest;
    if (!dest) {
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = BOOST_FREQ_BASE;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = BOOST_FILTER_FREQ;
    filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.value = BOOST_GAIN;
    osc.connect(filter).connect(gain).connect(dest);
    osc.start();
    this._boost = { osc, filter, gain };
    if (this._pad) {
      this._padFilterPre = this._pad.filter.frequency.value;
      this._pad.filter.frequency.setTargetAtTime(BOOST_PAD_FREQ, ctx.currentTime, 0.1);
    }
  }

  stopBoost(): void {
    this._stopBoost();
    if (this._pad && this._padFilterPre !== null) {
      const ctx = this.sfx.ctx;
      if (ctx) {
        this._pad.filter.frequency.setTargetAtTime(this._padFilterPre, ctx.currentTime, 0.3);
      }
      this._padFilterPre = null;
    }
  }

  /** Sidechain-style duck on the bass. Call when an SFX hit lands. */
  duckBass(): void {
    if (!this._bass) {
      return;
    }
    const ctx = this.sfx.ctx;
    if (!ctx) {
      return;
    }
    const bg = this._bass.gain;
    const base = bg._baseGain ?? CFG_BASS_GAIN;
    const now = ctx.currentTime;
    bg.gain.cancelScheduledValues(now);
    bg.gain.setValueAtTime(BASS_DUCK_LEVEL, now);
    bg.gain.linearRampToValueAtTime(base * DUCK_RECOVERY_PARTIAL, now + DUCK_PARTIAL_TIME);
    bg.gain.linearRampToValueAtTime(base, now + DUCK_FULL_TIME);
  }

  /** Begin the BTV "musical drop" build/silence/drop/elevated cycle. */
  triggerDrop(): void {
    if (this._dropState !== 'normal') {
      return;
    }
    this._dropState = 'build';
    this._dropBeat = 0;
    this._dropBassScale = 1;
    this._dropPadScale = 1;
    this._dropHatScale = 1;
  }

  /**
   * Advance the drop state machine. The runtime exposes this so the host
   * (BTV's main loop, or the studio's preview) can drive it on its own
   * tick clock. `beatCount` is a monotonically-increasing tick number;
   * BTV passes its global beat counter.
   */
  advanceDrop(beatCount: number): DropState {
    const elapsed = beatCount - this._dropBeat;
    if (this._dropState === 'build') {
      const t = Math.min(1, elapsed / DROP_BUILD_DURATION_BEATS);
      this._dropBassScale = 1 - t * DROP_BASS_BUILD_FALL;
      this._dropPadScale = 1 - t * DROP_PAD_BUILD_FALL;
      this._dropHatScale = 1 + t * DROP_HAT_BUILD_RISE;
      if (elapsed >= DROP_BUILD_DURATION_BEATS) {
        this._dropState = 'silence';
        this._dropBeat = beatCount;
      }
    } else if (this._dropState === 'silence') {
      this._dropBassScale = 0;
      this._dropPadScale = 0;
      this._dropHatScale = 0;
      if (elapsed >= 1) {
        this._dropState = 'drop';
        this._dropBeat = beatCount;
        this._dropBassScale = DROP_BASS_DROP_BOOST;
        this._dropPadScale = DROP_PAD_DROP_BOOST;
        this._dropHatScale = DROP_HAT_DROP_BOOST;
      }
    } else if (this._dropState === 'drop') {
      if (elapsed >= 1) {
        this._dropState = 'elevated';
        this._dropBeat = beatCount;
      }
    } else if (this._dropState === 'elevated') {
      const t = Math.min(1, elapsed / DROP_ELEVATED_DURATION_BEATS);
      this._dropBassScale = 1;
      this._dropPadScale = 1 + DROP_PAD_TAIL_BOOST * (1 - t);
      this._dropHatScale = 1 + DROP_HAT_TAIL_BOOST * (1 - t);
      if (elapsed >= DROP_ELEVATED_DURATION_BEATS) {
        this._dropState = 'normal';
        this._dropBassScale = 1;
        this._dropPadScale = 1;
        this._dropHatScale = 1;
      }
    }
    return this._dropState;
  }

  /** Read-only drop-state scales (for the host to mix against). */
  getDropScales(): { bass: number; pad: number; hat: number; state: DropState } {
    return {
      bass: this._dropBassScale,
      pad: this._dropPadScale,
      hat: this._dropHatScale,
      state: this._dropState,
    };
  }

  /**
   * Trigger one arp note on the loaded track. The host/scheduler decides
   * when to fire this — we give them an imperative API rather than a
   * built-in clock so that BTV's existing beat loop can keep driving it.
   */
  arp(stageIndex: number, boost?: boolean): void {
    if (this._muted || !this._track) {
      return;
    }
    const ctx = this.sfx.ctx;
    if (!ctx) {
      return;
    }
    const dest = this.sfx.musicDest;
    if (!dest) {
      return;
    }
    const cfg = this._track;
    const _ = stageIndex; // currently advisory; reserved for future per-stage arp tweaks
    void _;
    const arpDecay = cfg.arpDecay * (boost ? 0.5 : 1);
    const ratio = cfg.scale[this._arpI % cfg.scale.length] ?? 1;
    const freq = cfg.root * 2 * ratio;
    this._arpI += 1;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = cfg.waveType;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(ARP_GAIN, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + arpDecay);
    o.connect(g).connect(dest);
    if (this._delay) {
      g.connect(this._delay.node);
    }
    o.start(t);
    o.stop(t + arpDecay);
    o.onended = (): void => {
      try {
        o.disconnect();
        g.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /** Detach all audio nodes and (if owned) tear down the SfxBus. */
  dispose(): void {
    this.stop();
    if (this._ownsSfx) {
      this.sfx.dispose();
    }
  }

  // ─── private builders ────────────────────────────────────────────────

  private _buildBass(ctx: AudioContext, track: EpTrack): void {
    const dest = this.sfx.musicDest;
    if (!dest) {
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = track.waveType;
    osc.frequency.value = track.root;
    const gain = ctx.createGain() as GainNode & { _baseGain?: number };
    gain.gain.value = CFG_BASS_GAIN;
    gain._baseGain = CFG_BASS_GAIN;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value =
      track.tempo > 0
        ? (track.tempo / TEMPO_NORMALIZE) * BASS_LFO_TEMPO_SCALE
        : BASS_LFO_DEFAULT_RATE;
    const lfoG = ctx.createGain();
    lfoG.gain.value = BASS_LFO_DEPTH;
    lfo.connect(lfoG).connect(gain.gain);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value =
      track.bassFilterCutoff > 0 && Number.isFinite(track.bassFilterCutoff)
        ? track.bassFilterCutoff
        : BASS_FILTER_DEFAULT;
    filter.Q.value = BASS_FILTER_Q;
    osc.connect(filter).connect(gain).connect(dest);
    osc.start();
    lfo.start();
    this._bass = { osc, gain, lfo, lfoG, filter };
  }

  private _buildPad(ctx: AudioContext, track: EpTrack): void {
    const dest = this.sfx.musicDest;
    if (!dest) {
      return;
    }
    const padFreqs = track.padFreqs ?? DEFAULT_PAD_FREQS;
    const f1 = padFreqs[0];
    const f2 = padFreqs[1] ?? f1 * PAD_DETUNE_RATIO;
    const f3 = padFreqs[2] ?? f1 * PAD_THIRD_RATIO;
    const o1 = ctx.createOscillator();
    o1.type = track.waveType;
    o1.frequency.value = f1;
    const o2 = ctx.createOscillator();
    o2.type = track.waveType;
    o2.frequency.value = f2;
    const o3 = ctx.createOscillator();
    o3.type = track.waveType;
    o3.frequency.value = f3;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = PAD_FILTER_BASE;
    filter.Q.value = PAD_FILTER_Q;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value =
      track.tempo > 0
        ? (track.tempo / TEMPO_NORMALIZE) * PAD_LFO_TEMPO_SCALE
        : PAD_LFO_DEFAULT_RATE;
    const lfoG = ctx.createGain();
    lfoG.gain.value = CFG_PAD_LFO_DEPTH;
    lfo.connect(lfoG).connect(filter.frequency);
    lfo.start();
    const gain = ctx.createGain();
    gain.gain.value = CFG_PAD_GAIN;
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = PAD_WARMTH_FREQ;
    warmth.Q.value = PAD_WARMTH_Q;
    o1.connect(filter);
    o2.connect(filter);
    o3.connect(filter);
    filter.connect(warmth).connect(gain).connect(dest);
    o1.start();
    o2.start();
    o3.start();
    this._pad = { o1, o2, o3, filter, gain, lfo, lfoG, warmth };
  }

  private _buildDelay(ctx: AudioContext, track: EpTrack): void {
    const dest = this.sfx.musicDest;
    if (!dest) {
      return;
    }
    const node = ctx.createDelay(1.0);
    const tempo = track.tempo > 0 ? track.tempo : TEMPO_NORMALIZE;
    const computed = (SECONDS_PER_MINUTE / tempo) * DELAY_BEAT_FRACTION;
    node.delayTime.value = Number.isFinite(computed) ? Math.max(0.01, computed) : DELAY_FALLBACK_TIME;
    const feedback = ctx.createGain();
    feedback.gain.value = DELAY_FEEDBACK;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = DELAY_FILTER_FREQ;
    node.connect(filter).connect(feedback).connect(node);
    const wet = ctx.createGain();
    wet.gain.value = DELAY_WET_GAIN;
    node.connect(wet).connect(dest);
    this._delay = { node, feedback, filter, wet };
  }

  private _stopBoost(): void {
    if (!this._boost) {
      return;
    }
    try {
      this._boost.osc.stop();
    } catch {
      // already stopped
    }
    try {
      this._boost.osc.disconnect();
      this._boost.filter.disconnect();
      this._boost.gain.disconnect();
    } catch {
      // already disconnected
    }
    this._boost = null;
  }

  private _teardownVoices(): void {
    stopAndDisconnect(this._bass);
    stopAndDisconnect(this._pad);
    stopAndDisconnect(this._delay);
    this._stopBoost();
    this._bass = null;
    this._pad = null;
    this._delay = null;
  }
}

// ─── helpers ────────────────────────────────────────────────────────────

function readMuteFromStorage(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    }
  } catch {
    // private mode / sandboxed iframe — fall through to default
  }
  return false;
}

function writeMuteToStorage(muted: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    }
  } catch {
    // ignore — storage may be blocked
  }
}

function tryStop(node: { stop?: () => void } | null | undefined): void {
  if (node && typeof node.stop === 'function') {
    try {
      node.stop();
    } catch {
      // already stopped
    }
  }
}

function tryDisconnect(node: AudioNode | null | undefined): void {
  if (node) {
    try {
      node.disconnect();
    } catch {
      // already disconnected
    }
  }
}

function stopAndDisconnect(group: BassNodes | PadNodes | DelayNodes | null): void {
  if (!group) {
    return;
  }
  if ('osc' in group && 'lfo' in group) {
    // BassNodes
    tryStop(group.osc);
    tryStop(group.lfo);
    tryDisconnect(group.osc);
    tryDisconnect(group.lfo);
    tryDisconnect(group.gain);
    tryDisconnect(group.lfoG);
    tryDisconnect(group.filter);
  } else if ('o1' in group) {
    // PadNodes
    tryStop(group.o1);
    tryStop(group.o2);
    tryStop(group.o3);
    tryStop(group.lfo);
    tryDisconnect(group.o1);
    tryDisconnect(group.o2);
    tryDisconnect(group.o3);
    tryDisconnect(group.lfo);
    tryDisconnect(group.lfoG);
    tryDisconnect(group.filter);
    tryDisconnect(group.warmth);
    tryDisconnect(group.gain);
  } else if ('node' in group) {
    // DelayNodes
    tryDisconnect(group.node);
    tryDisconnect(group.feedback);
    tryDisconnect(group.filter);
    tryDisconnect(group.wet);
  }
}
