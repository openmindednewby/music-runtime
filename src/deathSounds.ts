import { DeathCause } from './DeathCause';
import { VOWELS } from './formantVoice';
import type { SfxBank, SfxFormantVoice, SfxLayer, SfxVariants, SfxVoice } from './SfxPlayer';

export type DeathCauseSfxId = `death.${DeathCause}`;

/** The bank id of the meme death sound for a cause. */
export function deathCauseSfxId(cause: DeathCause): DeathCauseSfxId {
  return `death.${cause}`;
}

const VARIANT_PITCHES = [1, 1.12] as const;

function pitchVoice(v: SfxVoice, factor: number): SfxVoice {
  if (v.wave === 'noise') {
    return v;
  }
  if (v.wave === 'formant') {
    return { ...v, pitch: v.pitch.map((p) => ({ at: p.at, hz: p.hz * factor })) };
  }
  return { ...v, freq: v.freq * factor, ...(v.freqEnd === undefined ? {} : { freqEnd: v.freqEnd * factor }) };
}

function isVoiceList(layer: SfxLayer): layer is readonly SfxVoice[] {
  return Array.isArray(layer);
}

/** Copies a layer with every tone and formant pitch scaled by factor; noise is left as is. */
export function withPitch(layer: SfxLayer, factor: number): SfxLayer {
  return isVoiceList(layer) ? layer.map((v) => pitchVoice(v, factor)) : pitchVoice(layer, factor);
}

const twoPitches = (layer: SfxLayer): SfxVariants => ({ variants: VARIANT_PITCHES.map((f) => withPitch(layer, f)) });

const ow = (delay: number, startHz: number): SfxFormantVoice => ({
  wave: 'formant',
  delay,
  dur: 0.26,
  attack: 0.02,
  gain: 0.45,
  hardStop: 0.02,
  pitch: [{ at: 0, hz: startHz }, { at: 0.4, hz: startHz * 1.2 }, { at: 1, hz: startHz * 0.8 }],
  vowels: [{ at: 0, vowel: VOWELS.ah }, { at: 1, vowel: VOWELS.oo }],
});

const CRASH: SfxLayer = [
  { wave: 'noise', attack: 0.015, dur: 0.09, gain: 0.35, filter: { type: 'bandpass', freq: 4200 } },
  {
    wave: 'formant',
    delay: 0.09,
    dur: 0.9,
    attack: 0.04,
    gain: 0.5,
    hardStop: 0.012,
    pitch: [{ at: 0, hz: 220 }, { at: 0.3, hz: 330 }, { at: 1, hz: 180 }],
    vowels: [{ at: 0, vowel: VOWELS.aa }],
    vibrato: { hz: 5.5, depthHz: 7 },
  },
];

const FALL: SfxLayer = {
  wave: 'formant',
  dur: 1,
  attack: 0.03,
  gain: 0.5,
  pitch: [{ at: 0, hz: 420 }, { at: 0.15, hz: 440 }, { at: 1, hz: 110 }],
  vowels: [{ at: 0, vowel: VOWELS.ah }, { at: 1, vowel: VOWELS.aa }],
  vibrato: { hz: 6, depthHz: 10 },
  filter: { type: 'lowpass', freq: 3000 },
};

const BURN: SfxLayer = [ow(0, 300), ow(0.28, 330), ow(0.56, 360)];

const ZAP: SfxLayer = [
  {
    wave: 'formant',
    source: 'square',
    dur: 0.3,
    attack: 0.005,
    gain: 0.35,
    hardStop: 0.01,
    pitch: [{ at: 0, hz: 110 }, { at: 1, hz: 100 }],
    vowels: [{ at: 0, vowel: VOWELS.ee }],
    vibrato: { hz: 30, depthHz: 12 },
  },
  { wave: 'noise', attack: 0.005, dur: 0.3, gain: 0.15, filter: { type: 'highpass', freq: 3000 } },
  {
    wave: 'formant',
    delay: 0.4,
    dur: 0.3,
    attack: 0.02,
    gain: 0.45,
    hardStop: 0.015,
    pitch: [{ at: 0, hz: 200 }, { at: 1, hz: 150 }],
    vowels: [{ at: 0, vowel: VOWELS.uh }],
  },
];

const SLIP: SfxLayer = [
  {
    wave: 'formant',
    dur: 0.45,
    attack: 0.03,
    gain: 0.45,
    pitch: [{ at: 0, hz: 260 }, { at: 0.5, hz: 380 }, { at: 1, hz: 300 }],
    vowels: [{ at: 0, vowel: VOWELS.oo }, { at: 0.35, vowel: VOWELS.oh }, { at: 1, vowel: VOWELS.ah }],
    vibrato: { hz: 6, depthHz: 6 },
  },
  {
    wave: 'formant',
    delay: 0.55,
    dur: 0.2,
    attack: 0.015,
    gain: 0.45,
    hardStop: 0.008,
    pitch: [{ at: 0, hz: 340 }, { at: 1, hz: 280 }],
    vowels: [{ at: 0, vowel: VOWELS.oo }, { at: 1, vowel: VOWELS.oo }],
  },
  { wave: 'noise', delay: 0.78, attack: 0.01, dur: 0.15, gain: 0.2, filter: { type: 'highpass', freq: 5000 } },
];

const BURIED: SfxLayer = [
  {
    wave: 'formant',
    dur: 0.5,
    attack: 0.03,
    gain: 0.6,
    hardStop: 0.01,
    pitch: [{ at: 0, hz: 180 }, { at: 0.4, hz: 210 }, { at: 1, hz: 150 }],
    vowels: [{ at: 0, vowel: VOWELS.mm }],
    filter: { type: 'lowpass', freq: 900 },
  },
  { wave: 'noise', delay: 0.52, attack: 0.005, dur: 0.12, gain: 0.25, filter: { type: 'lowpass', freq: 1500 } },
];

/** One meme voice per death cause, two pitch variants each; merges with SFX_PRESETS without touching 'death'. */
export const DEATH_CAUSE_SFX: SfxBank<DeathCauseSfxId> = {
  'death.crash': twoPitches(CRASH),
  'death.fall': twoPitches(FALL),
  'death.burn': twoPitches(BURN),
  'death.zap': twoPitches(ZAP),
  'death.slip': twoPitches(SLIP),
  'death.buried': twoPitches(BURIED),
};
