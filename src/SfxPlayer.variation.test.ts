import { SfxPlayer } from './SfxPlayer';
import type { SfxBank } from './SfxPlayer';
import { AudioMixer } from './AudioMixer';
import type { VolumePrefs, VolumeStorage } from './volume';
import { initedBus } from './fakeAudio.fixture';
import type { FakeCtx, FakeSource } from './fakeAudio.fixture';

type Id = 'hit' | 'step';

const BANK: SfxBank<Id> = {
  hit: { wave: 'sine', freq: 400, freqEnd: 200, dur: 0.2, gain: 0.5 },
  step: {
    variants: [
      { wave: 'sine', freq: 100, dur: 0.1, gain: 0.5 },
      [
        { wave: 'sine', freq: 200, dur: 0.1, gain: 0.5 },
        { wave: 'sine', freq: 300, dur: 0.1, gain: 0.5 },
      ],
      { wave: 'sine', freq: 400, dur: 0.1, gain: 0.5 },
    ],
  },
};

function memory(): VolumeStorage {
  let saved: VolumePrefs | null = null;
  return {
    load: () => saved,
    save: (p) => {
      saved = p;
      return true;
    },
  };
}

function setup(pitchJitter: number | undefined, randoms: number[]): { player: SfxPlayer<Id>; ctx: FakeCtx } {
  const { bus, ctx } = initedBus();
  const random = jest.fn(() => randoms.shift() ?? 0.5);
  const player = new SfxPlayer<Id>(bus, new AudioMixer(bus, { storage: memory() }), {
    bank: BANK,
    now: () => 0,
    pitchJitter,
    random,
  });
  return { player, ctx };
}

const startFreqs = (ctx: FakeCtx): number[] =>
  ctx.createOscillator.mock.results.map((r) => ((r.value as FakeSource).frequency?.setValueAtTime.mock.calls[0]?.[0] as number));

describe('SfxPlayer.play pitch jitter', () => {
  it('with pitchJitter unset, plays the exact frequency', () => {
    const { player, ctx } = setup(undefined, [0]);

    player.play('hit');

    expect(startFreqs(ctx)).toEqual([400]);
  });

  it('with pitchJitter 0.04 and random 0, lowers start and end frequency by 4%', () => {
    const { player, ctx } = setup(0.04, [0]);

    player.play('hit');

    const osc = ctx.createOscillator.mock.results[0]?.value as FakeSource;
    expect(osc.frequency?.setValueAtTime.mock.calls[0]?.[0]).toBeCloseTo(384, 6);
    expect(osc.frequency?.exponentialRampToValueAtTime.mock.calls[0]?.[0]).toBeCloseTo(192, 6);
  });

  it('with pitchJitter and an explicit pitch, multiplies the jitter onto that pitch', () => {
    const { player, ctx } = setup(0.04, [0]);

    player.play('hit', { pitch: 2 });

    expect(startFreqs(ctx)[0]).toBeCloseTo(768, 6);
  });
});

describe('SfxPlayer.play variants', () => {
  it('with a variant set, plays only the voices of the picked variant', () => {
    const { player, ctx } = setup(undefined, [0.5]);

    player.play('step');

    expect(startFreqs(ctx)).toEqual([200, 300]);
  });

  it('when the same variant is picked twice in a row, plays the next one instead', () => {
    const { player, ctx } = setup(undefined, [0, 0]);
    player.play('step');

    player.play('step');

    expect(startFreqs(ctx)).toEqual([100, 200, 300]);
  });
});
