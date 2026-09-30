// Synthesises one-shot SFX voices onto the SfxBus sfx submix. Silent (returns
// false) when the bus has no context, the mixer is muted, the sfx step is 0,
// the id is unknown, or the id is still cooling down. Voices are capped at
// MAX_SFX_DURATION and their nodes are disconnected when they end.

import type { SfxBus } from './SfxBus';
import type { AudioMixer } from './AudioMixer';
import { CooldownGate } from './CooldownGate';
import type { EpWaveType } from './types';

export const MAX_SFX_DURATION = 1.5;

interface SfxVoiceBase {
  readonly attack?: number;
  /** Seconds; clamped to MAX_SFX_DURATION when played. */
  readonly dur: number;
  /** 0..1, before the channel gain. */
  readonly gain: number;
  readonly filter?: { readonly type: BiquadFilterType; readonly freq: number };
}

export interface SfxToneVoice extends SfxVoiceBase {
  readonly wave: EpWaveType;
  readonly freq: number;
  readonly freqEnd?: number;
}

export interface SfxNoiseVoice extends SfxVoiceBase {
  readonly wave: 'noise';
}

export type SfxVoice = SfxToneVoice | SfxNoiseVoice;

export type SfxBank<Id extends string> = Readonly<Record<Id, SfxVoice | readonly SfxVoice[]>>;

export interface SfxPlayerOptions<Id extends string> {
  readonly bank: SfxBank<Id>;
  readonly cooldownMs?: Partial<Record<Id, number>>;
  readonly now?: () => number;
}

export interface SfxPlayOptions {
  readonly pitch?: number;
  readonly gain?: number;
}

const DEFAULT_ATTACK = 0.005;
const SILENCE = 0.0001;
const STOP_PAD = 0.02;
const MIN_FREQ = 1;

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function isVoiceList(entry: SfxVoice | readonly SfxVoice[]): entry is readonly SfxVoice[] {
  return Array.isArray(entry);
}

function makeNoiseBuffer(ctx: AudioContext, length: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function makeTone(ctx: AudioContext, v: SfxToneVoice, pitch: number, t: number, dur: number): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = v.wave;
  osc.frequency.setValueAtTime(v.freq * pitch, t);
  if (v.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(MIN_FREQ, v.freqEnd * pitch), t + dur);
  }
  return osc;
}

export class SfxPlayer<Id extends string> {
  private readonly _gate: CooldownGate<Id>;
  private readonly _now: () => number;
  private _noiseCtx: AudioContext | null = null;
  private readonly _noiseBuffers = new Map<number, AudioBuffer>();

  constructor(
    private readonly _bus: SfxBus,
    private readonly _mixer: AudioMixer,
    private readonly _options: SfxPlayerOptions<Id>,
  ) {
    this._gate = new CooldownGate<Id>(_options.cooldownMs ?? {});
    this._now = _options.now ?? defaultNow;
  }

  play(id: Id, opts: SfxPlayOptions = {}): boolean {
    const ctx = this._bus.ctx;
    const dest = this._bus.dest;
    const prefs = this._mixer.prefs();
    const entry = this._options.bank[id];
    if (!ctx || !dest || prefs.muted || prefs.sfx === 0 || entry === undefined) {
      return false;
    }
    if (!this._gate.tryPass(id, this._now())) {
      return false;
    }
    const voices: readonly SfxVoice[] = isVoiceList(entry) ? entry : [entry];
    for (const v of voices) {
      this._playVoice(ctx, dest, v, opts);
    }
    return true;
  }

  private _noise(ctx: AudioContext, dur: number): AudioBufferSourceNode {
    if (this._noiseCtx !== ctx) {
      this._noiseCtx = ctx;
      this._noiseBuffers.clear();
    }
    const length = Math.max(1, Math.ceil(ctx.sampleRate * dur));
    let buffer = this._noiseBuffers.get(length);
    if (!buffer) {
      buffer = makeNoiseBuffer(ctx, length);
      this._noiseBuffers.set(length, buffer);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  private _playVoice(ctx: AudioContext, dest: AudioNode, v: SfxVoice, opts: SfxPlayOptions): void {
    const t = ctx.currentTime;
    const dur = Math.min(v.dur, MAX_SFX_DURATION);
    const peak = Math.min(1, v.gain * (opts.gain ?? 1));
    const attack = Math.min(v.attack ?? DEFAULT_ATTACK, dur);
    const src = v.wave === 'noise' ? this._noise(ctx, dur) : makeTone(ctx, v, opts.pitch ?? 1, t, dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(SILENCE, t + dur);
    const nodes: AudioNode[] = [src, env];
    let head: AudioNode = src;
    if (v.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = v.filter.type;
      filter.frequency.setValueAtTime(v.filter.freq, t);
      head.connect(filter);
      head = filter;
      nodes.push(filter);
    }
    head.connect(env);
    env.connect(dest);
    src.onended = (): void => {
      for (const n of nodes) {
        n.disconnect();
      }
    };
    src.start(t);
    src.stop(t + dur + STOP_PAD);
  }
}
