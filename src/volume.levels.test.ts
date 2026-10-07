import { clampStep, clampStepTo, stepToGain, levelToGain, maxStep } from './volume';
import { AudioMixer } from './AudioMixer';
import { AudioChannel } from './AudioChannel';
import { initedBus, memoryKv } from './fakeAudio.fixture';
import { localVolumeStorage } from './volume';

const AURORA_LEVELS = [0, 0.25, 0.5, 0.9] as const;
const DEFAULT_GAINS = [0, 0.04, 0.16, 0.36, 0.64, 1];

function gainOf(node: GainNode | null): number {
  return node?.gain.value ?? Number.NaN;
}

describe('stepToGain', () => {
  it('with no levels, returns the 1.1.1 squared curve for every step', () => {
    const steps = [0, 1, 2, 3, 4, 5];

    const gains = steps.map(stepToGain);

    gains.forEach((g, i) => expect(g).toBeCloseTo(DEFAULT_GAINS[i] ?? Number.NaN, 10));
  });
});

describe('levelToGain', () => {
  it('with custom levels, returns the level at each step', () => {
    const steps = [0, 1, 2, 3];

    const gains = steps.map((s) => levelToGain(s, AURORA_LEVELS));

    expect(gains).toEqual([0, 0.25, 0.5, 0.9]);
  });

  it('with custom levels and an out-of-range step, clamps to the last level', () => {
    const step = 9;

    const gain = levelToGain(step, AURORA_LEVELS);

    expect(gain).toBe(0.9);
  });

  it('with an empty level list, falls back to the default curve', () => {
    const step = 5;

    const gain = levelToGain(step, []);

    expect(gain).toBe(1);
  });
});

describe('clampStep', () => {
  it('with no max, keeps the 1.1.1 range and NaN default', () => {
    const inputs = [-1, 0, 2.6, 5, 9, Number.NaN];

    const steps = inputs.map(clampStep);

    expect(steps).toEqual([0, 0, 3, 5, 5, 3]);
  });

});

describe('clampStepTo', () => {
  it('with a max below the default, clamps NaN to the max', () => {
    const step = Number.NaN;

    const clamped = clampStepTo(step, 2);

    expect(clamped).toBe(2);
  });
});

describe('maxStep', () => {
  it('with and without levels, returns length-1 or VOLUME_STEPS', () => {
    const inputs = [undefined, [], AURORA_LEVELS];

    const maxes = inputs.map((l) => maxStep(l));

    expect(maxes).toEqual([5, 5, 3]);
  });
});

describe('AudioMixer levels', () => {
  it('with no levels option, applies the default curve and step range', () => {
    const { bus } = initedBus();
    const mixer = new AudioMixer(bus, { storage: localVolumeStorage(undefined, memoryKv()) });

    mixer.setStep(AudioChannel.Sfx, 9);

    expect(mixer.prefs()).toEqual({ music: 3, sfx: 5, muted: false });
    expect(gainOf(bus.sfxGain)).toBe(1);
    expect(gainOf(bus.musicGain)).toBeCloseTo(0.36, 10);
    expect(mixer.maxStep()).toBe(5);
  });

  it('with custom levels, maps steps onto the given gains and clamps to the list', () => {
    const { bus } = initedBus();
    const mixer = new AudioMixer(bus, { storage: localVolumeStorage(undefined, memoryKv()), levels: AURORA_LEVELS });

    mixer.setStep(AudioChannel.Sfx, 9);

    expect(mixer.prefs().sfx).toBe(3);
    expect(gainOf(bus.sfxGain)).toBe(0.9);
    expect(gainOf(bus.musicGain)).toBe(0.9);
    expect(mixer.maxStep()).toBe(3);
  });

  it('with custom levels and stored steps beyond the list, clamps them on load', () => {
    const kv = memoryKv();
    kv.setItem('epmr_volume_v1', JSON.stringify({ music: 5, sfx: 1, muted: false }));
    const { bus } = initedBus();

    const mixer = new AudioMixer(bus, { storage: localVolumeStorage(undefined, kv), levels: [0, 0.5, 1] });

    expect(mixer.prefs()).toEqual({ music: 2, sfx: 1, muted: false });
  });
});
