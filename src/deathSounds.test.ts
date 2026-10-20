import { DeathCause } from './DeathCause';
import { DEATH_CAUSE_SFX, deathCauseSfxId, withPitch } from './deathSounds';
import { VOWELS } from './formantVoice';
import { SFX_PRESETS } from './sfxPresets';
import type { SfxFormantVoice, SfxLayer, SfxToneVoice, SfxVariants, SfxVoice } from './SfxPlayer';

const CAUSES = [DeathCause.Crash, DeathCause.Fall, DeathCause.Burn, DeathCause.Zap, DeathCause.Slip, DeathCause.Buried];
const MAX_SECONDS = 1;
const MIN_LINES = 3;
const MAX_LINES = 4;

const voicesOf = (layer: SfxLayer): readonly SfxVoice[] => (Array.isArray(layer) ? layer : [layer as SfxVoice]);
const variantsOf = (cause: DeathCause): readonly SfxLayer[] => (DEATH_CAUSE_SFX[deathCauseSfxId(cause)] as SfxVariants).variants;
const allVoices = (): SfxVoice[] => CAUSES.flatMap((c) => variantsOf(c).flatMap(voicesOf));
const formants = (): SfxFormantVoice[] => allVoices().filter((v): v is SfxFormantVoice => v.wave === 'formant');
const vowelName = (v: unknown): string => Object.entries(VOWELS).find(([, value]) => value === v)?.[0] ?? '?';
const formantsOf = (layer: SfxLayer): SfxFormantVoice[] => voicesOf(layer).filter((v): v is SfxFormantVoice => v.wave === 'formant');
const vowelSequence = (layer: SfxLayer): string => formantsOf(layer).map((v) => v.vowels.map((f) => vowelName(f.vowel)).join('-')).join('|');
const contour = (layer: SfxLayer): string =>
  formantsOf(layer).map((v) => v.pitch.map((p) => `${p.at}:${(p.hz / (v.pitch[0]?.hz ?? 1)).toFixed(2)}`).join(',')).join('|');
const ascending = (xs: readonly number[]): boolean => xs.every((x, i) => i === 0 || x >= (xs[i - 1] ?? 0));

describe('deathCauseSfxId', () => {
  it('with each cause, returns a distinct death.<cause> id', () => {
    const ids = CAUSES.map(deathCauseSfxId);

    expect(ids).toEqual(['death.crash', 'death.fall', 'death.burn', 'death.zap', 'death.slip', 'death.buried']);
  });

  it('with every cause, maps to a sound in the bank and the bank has no other ids', () => {
    const ids = CAUSES.map(deathCauseSfxId);

    expect(Object.keys(DEATH_CAUSE_SFX).sort()).toEqual([...ids].sort());
  });

  it('with the meme bank merged into the presets, leaves the existing death sound unchanged', () => {
    const before = SFX_PRESETS.death;

    const merged = { ...SFX_PRESETS, ...DEATH_CAUSE_SFX };

    expect(merged.death).toBe(before);
  });
});

describe('DEATH_CAUSE_SFX', () => {
  it('with each cause, has three or four voice lines', () => {
    const wrong = CAUSES.filter((c) => variantsOf(c).length < MIN_LINES || variantsOf(c).length > MAX_LINES);

    expect(wrong).toEqual([]);
  });

  it('with any variant, ends within one second of play', () => {
    const ends = CAUSES.flatMap((c) => variantsOf(c).map((l) => Math.max(...voicesOf(l).map((v) => (v.delay ?? 0) + v.dur))));

    expect(Math.max(...ends)).toBeLessThanOrEqual(MAX_SECONDS);
  });

  it('with any voice, has a gain in 0..1 and an attack shorter than the voice', () => {
    const bad = allVoices().filter((v) => v.gain <= 0 || v.gain > 1 || (v.attack ?? 0) >= v.dur);

    expect(bad).toEqual([]);
  });

  it('with any formant voice, has ascending pitch and vowel points inside 0..1', () => {
    const outOfOrder = (v: SfxFormantVoice): boolean => !ascending(v.pitch.map((p) => p.at)) || !ascending(v.vowels.map((f) => f.at));
    const outOfRange = (v: SfxFormantVoice): boolean => [...v.pitch, ...v.vowels].some((p) => p.at < 0 || p.at > 1);

    const bad = formants().filter((v) => outOfOrder(v) || outOfRange(v));

    expect(bad).toEqual([]);
  });

  it('with a hard stop, keeps it shorter than the voice', () => {
    const bad = formants().filter((v) => v.hardStop !== undefined && v.hardStop >= v.dur);

    expect(bad).toEqual([]);
  });

  it('with Crash, is the FAAHHH: a 4.2 kHz hiss then an aa voice that rises, falls and stops hard', () => {
    const [hiss, voice] = voicesOf(variantsOf(DeathCause.Crash)[0] ?? []) as [SfxVoice, SfxFormantVoice];

    const shape = [hiss.wave, hiss.filter?.freq, voice.delay, voice.vowels[0]?.vowel, voice.pitch.map((p) => p.hz), voice.hardStop];

    expect(shape).toEqual(['noise', 4200, 0.09, VOWELS.aa, [220, 330, 180], 0.012]);
  });

  it('with the lines of a cause, gives each a different vowel sequence', () => {
    const repeated = CAUSES.filter((c) => new Set(variantsOf(c).map(vowelSequence)).size !== variantsOf(c).length);

    expect(repeated).toEqual([]);
  });

  it('with the lines of a cause, gives each a different pitch contour', () => {
    const repeated = CAUSES.filter((c) => new Set(variantsOf(c).map(contour)).size !== variantsOf(c).length);

    expect(repeated).toEqual([]);
  });
});

describe('withPitch', () => {
  it('with a tone, a formant and a noise voice, scales the two pitches and leaves the noise', () => {
    const tone: SfxToneVoice = { wave: 'sine', freq: 100, freqEnd: 50, dur: 0.1, gain: 0.5 };
    const formant: SfxFormantVoice = { wave: 'formant', dur: 0.1, gain: 0.5, pitch: [{ at: 0, hz: 200 }], vowels: [{ at: 0, vowel: VOWELS.aa }] };
    const noise: SfxVoice = { wave: 'noise', dur: 0.1, gain: 0.5 };

    const [t, f, n] = withPitch([tone, formant, noise], 2) as [SfxToneVoice, SfxFormantVoice, SfxVoice];

    expect([t.freq, t.freqEnd, f.pitch[0]?.hz, f.vowels, n]).toEqual([200, 100, 400, formant.vowels, noise]);
  });
});
