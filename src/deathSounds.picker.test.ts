import { DeathCause } from './DeathCause';
import { DEATH_LINES } from './deathLines';
import { DEATH_LINE_SFX, createDeathSfxPicker, deathLineSfxIds, pickDeathSfx } from './deathSounds';

const CAUSES = Object.values(DeathCause);
const PICKS = 400;
const SEED = 12345;
const LCG_A = 1664525;
const LCG_C = 1013904223;
const LCG_M = 2 ** 32;

const seeded = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (LCG_A * state + LCG_C) % LCG_M;
    return state / LCG_M;
  };
};

const picksOf = (cause: DeathCause, random: () => number): string[] => {
  const pick = createDeathSfxPicker(random);
  return Array.from({ length: PICKS }, () => pick(cause));
};

describe('deathLineSfxIds', () => {
  it('with each cause, numbers one id per line from death.<cause>.1', () => {
    const ids = deathLineSfxIds(DeathCause.Crash);

    expect(ids).toEqual(DEATH_LINES[DeathCause.Crash].map((_l, i) => `death.crash.${i + 1}`));
  });
});

describe('DEATH_LINE_SFX', () => {
  it('with every line of every cause, holds that line under its id and nothing else', () => {
    const expected = Object.fromEntries(CAUSES.flatMap((c) => deathLineSfxIds(c).map((id, i) => [id, DEATH_LINES[c][i]])));

    const bank = { ...DEATH_LINE_SFX };

    expect(bank).toEqual(expected);
  });
});

describe('createDeathSfxPicker', () => {
  it('with a seeded random source, never picks the same line twice in a row for any cause', () => {
    const random = seeded(SEED);

    const repeats = CAUSES.flatMap((c) => picksOf(c, random).filter((id, i, all) => i > 0 && id === all[i - 1]));

    expect(repeats).toEqual([]);
  });

  it('with a seeded random source, plays every line of every cause', () => {
    const random = seeded(SEED);

    const missing = CAUSES.flatMap((c) => {
      const seen = new Set(picksOf(c, random));
      return deathLineSfxIds(c).filter((id) => !seen.has(id));
    });

    expect(missing).toEqual([]);
  });

  it('with another cause picked in between, still avoids the last line of the first cause', () => {
    const pick = createDeathSfxPicker(() => 0);
    const first = pick(DeathCause.Crash);
    pick(DeathCause.Fall);

    const second = pick(DeathCause.Crash);

    expect([first, second]).toEqual(['death.crash.1', 'death.crash.2']);
  });

  it('with two pickers, keeps a separate history in each', () => {
    const a = createDeathSfxPicker(() => 0);
    const b = createDeathSfxPicker(() => 0);
    a(DeathCause.Zap);

    const fromB = b(DeathCause.Zap);

    expect(fromB).toBe('death.zap.1');
  });
});

describe('pickDeathSfx', () => {
  it('with the same random value twice, returns two different lines of the cause', () => {
    const random = (): number => 0.5;
    const first = pickDeathSfx(DeathCause.Burn, random);

    const second = pickDeathSfx(DeathCause.Burn, random);

    expect([deathLineSfxIds(DeathCause.Burn).includes(second), second === first]).toEqual([true, false]);
  });
});
