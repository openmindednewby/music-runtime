// Starting voices for six common arcade events. Games may ship their own
// SfxBank; these are a shared baseline, not a contract on timbre.

import type { SfxBank } from './SfxPlayer';

export type SfxPresetId = 'jump' | 'slam' | 'shockwave' | 'nitro' | 'pickup' | 'death';

export const SFX_PRESETS: SfxBank<SfxPresetId> = {
  jump: {
    wave: 'square',
    freq: 320,
    freqEnd: 720,
    attack: 0.005,
    dur: 0.14,
    gain: 0.35,
    filter: { type: 'lowpass', freq: 3200 },
  },
  slam: [
    { wave: 'sine', freq: 140, freqEnd: 45, attack: 0.002, dur: 0.25, gain: 0.8 },
    { wave: 'noise', attack: 0.002, dur: 0.12, gain: 0.35, filter: { type: 'lowpass', freq: 900 } },
  ],
  shockwave: [
    { wave: 'sawtooth', freq: 220, freqEnd: 40, attack: 0.01, dur: 0.6, gain: 0.45, filter: { type: 'lowpass', freq: 1400 } },
    { wave: 'noise', attack: 0.01, dur: 0.5, gain: 0.25, filter: { type: 'bandpass', freq: 600 } },
  ],
  nitro: [
    { wave: 'sawtooth', freq: 110, freqEnd: 440, attack: 0.03, dur: 0.5, gain: 0.35, filter: { type: 'lowpass', freq: 2400 } },
    { wave: 'noise', attack: 0.05, dur: 0.45, gain: 0.2, filter: { type: 'highpass', freq: 2000 } },
  ],
  pickup: [
    { wave: 'triangle', freq: 880, freqEnd: 1320, attack: 0.003, dur: 0.1, gain: 0.4 },
    { wave: 'sine', freq: 1760, attack: 0.003, dur: 0.16, gain: 0.2 },
  ],
  death: [
    { wave: 'sawtooth', freq: 400, freqEnd: 50, attack: 0.005, dur: 0.9, gain: 0.5, filter: { type: 'lowpass', freq: 1800 } },
    { wave: 'noise', attack: 0.005, dur: 0.6, gain: 0.35, filter: { type: 'lowpass', freq: 1200 } },
  ],
};
