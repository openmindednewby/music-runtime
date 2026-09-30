// Must produce exactly two type errors (checked by scripts/check-isolated-consumer.cjs):
// a noise voice with a freq, and a tone voice without one.
import type { SfxVoice } from '../dist/index';

const badNoise: SfxVoice = { wave: 'noise', freq: 1, dur: 0.1, gain: 0.5 };
const badTone: SfxVoice = { wave: 'sine', dur: 0.1, gain: 0.5 };

export { badNoise, badTone };
