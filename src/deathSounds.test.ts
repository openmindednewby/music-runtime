import { DeathCause } from './DeathCause';
import { DEATH_CAUSE_SFX, deathCauseSfxId, withPitch } from './deathSounds';
import { VOWELS } from './formantVoice';
import { SFX_PRESETS } from './sfxPresets';
import type { SfxFormantVoice, SfxLayer, SfxToneVoice, SfxVariants, SfxVoice } from './SfxPlayer';

const CAUSES = [DeathCause.Crash, DeathCause.Fall, DeathCause.Burn, DeathCause.Zap, DeathCause.Slip, DeathCause.Buried];
const MAX_SECONDS = 1;

const voicesOf = (layer: SfxLayer): readonly SfxVoice[] => (Array.isArray(layer) ? layer : [layer as SfxVoice]);
const variantsOf = (cause: DeathCause): readonly SfxLayer[] => (DEATH_CAUSE_SFX[deathCauseSfxId(cause)] as SfxVariants).variants;
const allVoices = (): SfxVoice[] => CAUSES.flatMap((c) => variantsOf(c).flatMap(voicesOf));
const formants = (): SfxFormantVoice[] => allVoices().filter((v): v is SfxFormantVoice => v.wave === 'formant');
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
  it('with each cause, has exactly two pitch variants', () => {
    const counts = CAUSES.map((c) => variantsOf(c).length);

    expect(counts).toEqual(CAUSES.map(() => 2));
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

  it('with the two variants of a cause, keeps the vowels and raises the pitch', () => {
    const [low, high] = variantsOf(DeathCause.Slip).map((l) => voicesOf(l).filter((v): v is SfxFormantVoice => v.wave === 'formant'));

    const raised = (high?.[0]?.pitch[0]?.hz ?? 0) > (low?.[0]?.pitch[0]?.hz ?? 0);

    expect([low?.map((v) => v.vowels), raised]).toEqual([high?.map((v) => v.vowels), true]);
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
