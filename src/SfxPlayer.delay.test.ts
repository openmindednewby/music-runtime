import { SfxPlayer, MAX_SFX_DURATION } from './SfxPlayer';
import type { SfxBank } from './SfxPlayer';
import { AudioMixer } from './AudioMixer';
import type { VolumePrefs, VolumeStorage } from './volume';
import { initedBus } from './fakeAudio.fixture';
import type { FakeCtx, FakeSource } from './fakeAudio.fixture';

type Id = 'plain' | 'bell' | 'late' | 'negative' | 'noiseLate';

const BANK: SfxBank<Id> = {
  plain: { wave: 'sine', freq: 440, dur: 0.2, gain: 0.5, attack: 0.01 },
  bell: [
    { wave: 'sine', freq: 440, dur: 0.2, gain: 0.5 },
    { wave: 'sine', freq: 660, dur: 0.2, gain: 0.3, delay: 0.08 },
  ],
  late: { wave: 'sine', freq: 440, dur: 0.2, gain: 0.5, delay: 99 },
  negative: { wave: 'sine', freq: 440, dur: 0.2, gain: 0.5, delay: -1 },
  noiseLate: { wave: 'noise', dur: 0.1, gain: 0.3, delay: 0.05 },
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

function setup(): { player: SfxPlayer<Id>; ctx: FakeCtx } {
  const { bus, ctx } = initedBus();
  ctx.currentTime = 2;
  const player = new SfxPlayer<Id>(bus, new AudioMixer(bus, { storage: memory() }), { bank: BANK, now: () => 0 });
  return { player, ctx };
}

const resultAt = <T>(m: jest.Mock, i: number): T => m.mock.results[i]?.value as T;

describe('SfxPlayer.play', () => {
  it('with no delay, schedules the voice exactly as 1.1.1 did', () => {
    const { player, ctx } = setup();

    player.play('plain');

    const osc = resultAt<FakeSource>(ctx.createOscillator, 0);
    const env = resultAt<{ gain: { setValueAtTime: jest.Mock; linearRampToValueAtTime: jest.Mock; exponentialRampToValueAtTime: jest.Mock } }>(ctx.createGain, 0);
    expect(osc.frequency?.setValueAtTime).toHaveBeenCalledWith(440, 2);
    expect(env.gain.setValueAtTime).toHaveBeenCalledWith(0, 2);
    expect(env.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.5, 2.01);
    expect(env.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 2.2);
    expect(osc.start).toHaveBeenCalledWith(2);
    expect(osc.stop.mock.calls[0]?.[0]).toBeCloseTo(2.22, 10);
  });

  it('with a delayed partial, starts that partial delay seconds later', () => {
    const { player, ctx } = setup();

    player.play('bell');

    const first = resultAt<FakeSource>(ctx.createOscillator, 0);
    const second = resultAt<FakeSource>(ctx.createOscillator, 1);
    expect(first.start).toHaveBeenCalledWith(2);
    expect(second.start).toHaveBeenCalledWith(2.08);
    expect(second.frequency?.setValueAtTime).toHaveBeenCalledWith(660, 2.08);
    expect(second.stop.mock.calls[0]?.[0]).toBeCloseTo(2.3);
  });

  it('with a delay above the cap, clamps it to MAX_SFX_DURATION', () => {
    const { player, ctx } = setup();

    player.play('late');

    expect(resultAt<FakeSource>(ctx.createOscillator, 0).start).toHaveBeenCalledWith(2 + MAX_SFX_DURATION);
  });

  it('with a negative delay, starts immediately', () => {
    const { player, ctx } = setup();

    player.play('negative');

    expect(resultAt<FakeSource>(ctx.createOscillator, 0).start).toHaveBeenCalledWith(2);
  });

  it('with a delayed noise voice, starts the buffer source later', () => {
    const { player, ctx } = setup();

    player.play('noiseLate');

    expect(resultAt<FakeSource>(ctx.createBufferSource, 0).start).toHaveBeenCalledWith(2.05);
  });
});
