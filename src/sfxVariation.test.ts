import { jitterPitch, pickVariant, MAX_PITCH_JITTER } from './sfxVariation';

describe('jitterPitch', () => {
  it('with zero jitter, returns the base pitch unchanged', () => {
    const random = jest.fn(() => 0.9);

    const pitch = jitterPitch(1.5, 0, random);

    expect(pitch).toBe(1.5);
    expect(random).not.toHaveBeenCalled();
  });

  it('with random at 0, returns the base pitch lowered by the jitter fraction', () => {
    const pitch = jitterPitch(2, 0.04, () => 0);

    expect(pitch).toBeCloseTo(1.92, 10);
  });

  it('with random just under 1, returns close to the base pitch raised by the jitter fraction', () => {
    const pitch = jitterPitch(1, 0.05, () => 0.999999);

    expect(pitch).toBeCloseTo(1.05, 4);
  });

  it('with jitter above the cap, clamps it to MAX_PITCH_JITTER', () => {
    const pitch = jitterPitch(1, 5, () => 0);

    expect(pitch).toBeCloseTo(1 - MAX_PITCH_JITTER, 10);
  });

  it('with a negative or non-finite jitter, returns the base pitch', () => {
    const random = (): number => 0;

    const pitches = [jitterPitch(1, -0.1, random), jitterPitch(1, Number.NaN, random)];

    expect(pitches).toEqual([1, 1]);
  });
});

describe('pickVariant', () => {
  it('with one variant, returns index 0', () => {
    const index = pickVariant(1, 0, () => 0.7);

    expect(index).toBe(0);
  });

  it('with no previous pick, returns the index random selects', () => {
    const index = pickVariant(4, -1, () => 0.6);

    expect(index).toBe(2);
  });

  it('when random selects the previous pick, returns the next index instead', () => {
    const index = pickVariant(3, 2, () => 0.9);

    expect(index).toBe(0);
  });

  it('with random returning 1, stays inside the range', () => {
    const index = pickVariant(3, -1, () => 1);

    expect(index).toBe(2);
  });
});
