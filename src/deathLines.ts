import { DeathCause } from './DeathCause';
import { VOWELS } from './formantVoice';
import type { Vowel } from './formantVoice';
import type { SfxFormantVoice, SfxLayer, SfxNoiseVoice } from './SfxPlayer';

type Shape = Partial<Omit<SfxFormantVoice, 'wave' | 'pitch' | 'vowels' | 'dur'>>;

const voice = (
  dur: number,
  vowels: readonly (readonly [number, Vowel])[],
  pitch: readonly (readonly [number, number])[],
  shape: Shape = {},
): SfxFormantVoice => ({
  wave: 'formant',
  dur,
  attack: 0.02,
  gain: 0.45,
  ...shape,
  vowels: vowels.map(([at, vowel]) => ({ at, vowel })),
  pitch: pitch.map(([at, hz]) => ({ at, hz })),
});

const noise = (delay: number, dur: number, gain: number, type: BiquadFilterType, freq: number): SfxNoiseVoice => ({
  wave: 'noise',
  delay,
  attack: 0.005,
  dur,
  gain,
  filter: { type, freq },
});

const thud = (delay: number): SfxNoiseVoice => noise(delay, 0.08, 0.35, 'lowpass', 800);
const MUFFLED = { filter: { type: 'lowpass', freq: 900 } } as const;

const { aa, ah, oh, oo, uh, ee, mm } = VOWELS;

const FAAHHH: SfxLayer = [
  { wave: 'noise', attack: 0.015, dur: 0.09, gain: 0.35, filter: { type: 'bandpass', freq: 4200 } },
  voice(0.9, [[0, aa]], [[0, 220], [0.3, 330], [1, 180]], {
    delay: 0.09,
    attack: 0.04,
    gain: 0.5,
    hardStop: 0.012,
    vibrato: { hz: 5.5, depthHz: 7 },
  }),
];

const CRASH: readonly SfxLayer[] = [
  FAAHHH,
  [thud(0), voice(0.7, [[0, ah], [0.6, oh]], [[0, 300], [0.2, 340], [1, 140]], { delay: 0.07, gain: 0.5 })],
  [thud(0), voice(0.3, [[0, oo], [1, uh]], [[0, 170], [1, 120]], { delay: 0.06, attack: 0.015, hardStop: 0.015 })],
  [
    noise(0, 0.06, 0.3, 'bandpass', 3000),
    voice(0.6, [[0, aa], [0.4, ee]], [[0, 320], [0.5, 520], [1, 470]], {
      delay: 0.06,
      hardStop: 0.01,
      vibrato: { hz: 7, depthHz: 12 },
    }),
  ],
];

const FALL: readonly SfxLayer[] = [
  voice(1, [[0, ah], [1, aa]], [[0, 420], [0.15, 440], [1, 110]], {
    attack: 0.03,
    gain: 0.5,
    vibrato: { hz: 6, depthHz: 10 },
    filter: { type: 'lowpass', freq: 3000 },
  }),
  voice(0.9, [[0, ee], [0.7, oo]], [[0, 520], [0.3, 600], [1, 180]], { vibrato: { hz: 5, depthHz: 8 } }),
  voice(0.95, [[0, oo], [0.33, oh], [0.66, oo], [1, oh]], [[0, 380], [0.33, 320], [0.66, 260], [1, 150]]),
  [
    voice(0.2, [[0, uh]], [[0, 300], [1, 310]], { hardStop: 0.01 }),
    voice(0.7, [[0, oh], [1, uh]], [[0, 240], [0.2, 250], [1, 90]], { delay: 0.25 }),
  ],
];

const ow = (delay: number, startHz: number): SfxFormantVoice =>
  voice(0.26, [[0, ah], [1, oo]], [[0, startHz], [0.4, startHz * 1.2], [1, startHz * 0.8]], { delay, hardStop: 0.02 });

const hot = (i: number): SfxLayer => [
  noise(i * 0.25, 0.05, 0.2, 'highpass', 2500),
  voice(0.16, [[0, aa]], [[0, 380 - 30 * i], [1, 360 - 30 * i]], { delay: i * 0.25 + 0.04, hardStop: 0.02 }),
];

const BURN: readonly SfxLayer[] = [
  [ow(0, 300), ow(0.28, 330), ow(0.56, 360)],
  [hot(0), hot(1), hot(2)].flat(),
  voice(0.8, [[0, ee], [0.4, ah], [1, oo]], [[0, 280], [0.4, 500], [1, 260]], { vibrato: { hz: 6, depthHz: 9 } }),
  [
    voice(0.15, [[0, ah]], [[0, 260], [1, 260]], { hardStop: 0.02 }),
    voice(0.15, [[0, ah]], [[0, 300], [1, 300]], { delay: 0.2, hardStop: 0.02 }),
    voice(0.55, [[0, ah], [1, aa]], [[0, 360], [0.3, 420], [1, 320]], { delay: 0.4, vibrato: { hz: 6, depthHz: 10 } }),
  ],
];

const BUZZ = { source: 'square', attack: 0.005, gain: 0.35, hardStop: 0.01 } as const;

const ZAP: readonly SfxLayer[] = [
  [
    voice(0.3, [[0, ee]], [[0, 110], [1, 100]], { ...BUZZ, vibrato: { hz: 30, depthHz: 12 } }),
    noise(0, 0.3, 0.15, 'highpass', 3000),
    voice(0.3, [[0, uh]], [[0, 200], [1, 150]], { delay: 0.4, hardStop: 0.015 }),
  ],
  [
    voice(0.25, [[0, uh]], [[0, 90], [1, 85]], { ...BUZZ, vibrato: { hz: 30, depthHz: 12 } }),
    voice(0.3, [[0, ee]], [[0, 600], [0.5, 720], [1, 650]], { delay: 0.32, hardStop: 0.01 }),
  ],
  [
    noise(0, 0.35, 0.2, 'highpass', 4000),
    voice(0.35, [[0, aa]], [[0, 140], [1, 90]], { ...BUZZ, vibrato: { hz: 40, depthHz: 15 } }),
    voice(0.4, [[0, oh], [1, oo]], [[0, 250], [1, 180]], { delay: 0.45 }),
  ],
  [
    voice(0.6, [[0, oh], [1, ah]], [[0, 80], [0.5, 95], [1, 70]], { ...BUZZ, vibrato: { hz: 25, depthHz: 10 } }),
    noise(0.62, 0.1, 0.3, 'bandpass', 1500),
  ],
];

const SLIP: readonly SfxLayer[] = [
  [
    voice(0.45, [[0, oo], [0.35, oh], [1, ah]], [[0, 260], [0.5, 380], [1, 300]], {
      attack: 0.03,
      vibrato: { hz: 6, depthHz: 6 },
    }),
    voice(0.2, [[0, oo], [1, oo]], [[0, 340], [1, 280]], { delay: 0.55, attack: 0.015, hardStop: 0.008 }),
    noise(0.78, 0.15, 0.2, 'highpass', 5000),
  ],
  [
    voice(0.45, [[0, oo], [1, ee]], [[0, 260], [1, 460]]),
    voice(0.25, [[0, uh]], [[0, 220], [1, 160]], { delay: 0.55, hardStop: 0.01 }),
    thud(0.55),
  ],
  [
    voice(0.35, [[0, ah], [1, oo]], [[0, 300], [1, 280]]),
    voice(0.55, [[0, ah], [1, oo]], [[0, 250], [1, 190]], { delay: 0.4, vibrato: { hz: 5, depthHz: 8 } }),
  ],
  [
    noise(0, 0.3, 0.15, 'highpass', 5000),
    voice(0.2, [[0, ee]], [[0, 500], [1, 650]], { delay: 0.3, hardStop: 0.01 }),
    thud(0.55),
  ],
];

const hum = (i: number): SfxFormantVoice =>
  voice(0.18, [[0, mm]], [[0, 170 + 20 * i], [1, 165 + 20 * i]], { ...MUFFLED, delay: i * 0.22, gain: 0.6, hardStop: 0.02 });

const BURIED: readonly SfxLayer[] = [
  [
    voice(0.5, [[0, mm]], [[0, 180], [0.4, 210], [1, 150]], { ...MUFFLED, attack: 0.03, gain: 0.6, hardStop: 0.01 }),
    noise(0.52, 0.12, 0.25, 'lowpass', 1500),
  ],
  [hum(0), hum(1), hum(2)],
  [
    voice(0.35, [[0, oh]], [[0, 200], [1, 210]], { ...MUFFLED, gain: 0.6 }),
    voice(0.45, [[0, mm], [0.2, oh], [1, oo]], [[0, 190], [1, 130]], { ...MUFFLED, delay: 0.4, gain: 0.6 }),
  ],
  [voice(0.55, [[0, mm], [0.6, uh]], [[0, 150], [0.4, 200], [1, 120]], { ...MUFFLED, gain: 0.6 }), thud(0.6)],
];

/** The distinct voice lines of every death cause; the first Crash line is the FAAHHH. */
export const DEATH_LINES: Readonly<Record<DeathCause, readonly SfxLayer[]>> = {
  [DeathCause.Crash]: CRASH,
  [DeathCause.Fall]: FALL,
  [DeathCause.Burn]: BURN,
  [DeathCause.Zap]: ZAP,
  [DeathCause.Slip]: SLIP,
  [DeathCause.Buried]: BURIED,
};
