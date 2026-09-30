// Synthesises one-shot SFX voices onto the SfxBus sfx submix. Silent (returns
// false) when the bus has no context, the mixer is muted, the sfx step is 0,
// the id is unknown, or the id is still cooling down.

import type { SfxBus } from './SfxBus';
import type { AudioMixer } from './AudioMixer';
import { CooldownGate } from './CooldownGate';
import type { EpWaveType } from './types';

export interface SfxVoice {
  readonly wave: EpWaveType | 'noise';
  readonly freq: number;
  readonly freqEnd?: number;
  readonly attack?: number;
  readonly dur: number;
  readonly gain: number;
  readonly filter?: { readonly type: BiquadFilterType; readonly freq: number };
}

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

function makeNoise(ctx: AudioContext, dur: number): AudioScheduledSourceNode {
  const len = Math.max(1, Math.ceil(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

function makeSource(ctx: AudioContext, v: SfxVoice, pitch: number, t: number): AudioScheduledSourceNode {
  if (v.wave === 'noise') {
    return makeNoise(ctx, v.dur);
  }
  const osc = ctx.createOscillator();
  osc.type = v.wave;
  osc.frequency.setValueAtTime(v.freq * pitch, t);
  if (v.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(MIN_FREQ, v.freqEnd * pitch), t + v.dur);
  }
  return osc;
}

function playVoice(ctx: AudioContext, dest: AudioNode, v: SfxVoice, opts: SfxPlayOptions): void {
  const t = ctx.currentTime;
  const peak = Math.min(1, v.gain * (opts.gain ?? 1));
  const attack = Math.min(v.attack ?? DEFAULT_ATTACK, v.dur);
  const src = makeSource(ctx, v, opts.pitch ?? 1, t);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + attack);
  env.gain.exponentialRampToValueAtTime(SILENCE, t + v.dur);
  let head: AudioNode = src;
  if (v.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = v.filter.type;
    filter.frequency.setValueAtTime(v.filter.freq, t);
    head.connect(filter);
    head = filter;
  }
  head.connect(env);
  env.connect(dest);
  src.start(t);
  src.stop(t + v.dur + STOP_PAD);
}

export class SfxPlayer<Id extends string> {
  private readonly _gate: CooldownGate<Id>;
  private readonly _now: () => number;

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
      playVoice(ctx, dest, v, opts);
    }
    return true;
  }
}
