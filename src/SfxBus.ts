// Minimal port of BTV's class SFX — only the music-routing surface:
// AudioContext, master gain, music gain, and a delay-based reverb chain.
// Gameplay SFX (crash, nearMiss, streakBreak, etc.) intentionally stay in
// BTV — they are not part of the music runtime contract.
//
// MusicEngine accepts an optional SfxBus in its constructor. If none is
// provided it creates its own — most consumers (Phaser games, plain HTML)
// will want this default.

import {
  REVERB_DELAY,
  REVERB_FEEDBACK,
  REVERB_FILTER,
} from './tuning';

const DEFAULT_REVERB_WET = 0.4;

export class SfxBus {
  /** Lazily-initialized — null until init() runs. */
  ctx: AudioContext | null = null;
  /** Master output gain (connected to ctx.destination). */
  master: GainNode | null = null;
  /** Music submix (connected to master). MusicEngine routes here. */
  musicGain: GainNode | null = null;
  /** SFX submix (kept for parity with BTV; reverb dry tail also routes here). */
  sfxGain: GainNode | null = null;
  /** Reverb send node — connect a source here to add reverb. */
  reverb: GainNode | null = null;
  /** Internal: the delay-line forming the reverb tail. */
  private _reverbDelay: DelayNode | null = null;
  private _reverbFb: GainNode | null = null;
  private _reverbFilter: BiquadFilterNode | null = null;
  private _reverbWet: GainNode | null = null;

  /** Where music sources connect by default. */
  get musicDest(): AudioNode | null {
    return this.musicGain ?? this.master ?? this.ctx?.destination ?? null;
  }

  /** Where gameplay SFX connect. */
  get dest(): AudioNode | null {
    return this.sfxGain ?? this.master ?? this.ctx?.destination ?? null;
  }

  /**
   * Create the AudioContext + graph if not already created. Must be called
   * inside a user-gesture handler (browser autoplay policy).
   */
  init(): void {
    if (!this.ctx) {
      const Ctor = (
        typeof window !== 'undefined'
          ? (window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
          : undefined
      );
      if (!Ctor) {
        return;
      }
      this.ctx = new Ctor();
    }
    if (!this.ctx) {
      return;
    }
    if (this.ctx.state === 'suspended') {
      // Fire and forget — resume() returns a promise but we don't need to
      // await it; the next audio call will block on it transparently.
      void this.ctx.resume();
    }
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (!this.sfxGain) {
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
    }
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
    }
    if (!this.reverb) {
      this._mkReverb();
    }
  }

  /** Disconnect the reverb chain. The AudioContext itself is left alone. */
  dispose(): void {
    const tryDisconnect = (n: AudioNode | null): void => {
      if (n) {
        try {
          n.disconnect();
        } catch {
          // ignore — already disconnected
        }
      }
    };
    tryDisconnect(this._reverbDelay);
    tryDisconnect(this._reverbFb);
    tryDisconnect(this._reverbFilter);
    tryDisconnect(this._reverbWet);
    tryDisconnect(this.reverb);
    tryDisconnect(this.musicGain);
    tryDisconnect(this.sfxGain);
    tryDisconnect(this.master);
    this._reverbDelay = null;
    this._reverbFb = null;
    this._reverbFilter = null;
    this._reverbWet = null;
    this.reverb = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.master = null;
  }

  private _mkReverb(): void {
    if (!this.ctx) {
      return;
    }
    const ctx = this.ctx;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = REVERB_DELAY;
    const fb = ctx.createGain();
    fb.gain.value = REVERB_FEEDBACK;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = REVERB_FILTER;
    delay.connect(filter).connect(fb).connect(delay);
    const dst = this.sfxGain ?? this.master ?? ctx.destination;
    const wet = ctx.createGain();
    wet.gain.value = DEFAULT_REVERB_WET;
    delay.connect(wet).connect(dst);
    const reverb = ctx.createGain();
    reverb.gain.value = 1;
    reverb.connect(delay);
    reverb.connect(dst);
    this._reverbDelay = delay;
    this._reverbFb = fb;
    this._reverbFilter = filter;
    this._reverbWet = wet;
    this.reverb = reverb;
  }
}
