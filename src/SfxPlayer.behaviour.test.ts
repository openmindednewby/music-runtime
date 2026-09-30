import { SfxPlayer, MAX_SFX_DURATION } from './SfxPlayer';
import type { SfxBank } from './SfxPlayer';
import { AudioMixer } from './AudioMixer';
import type { VolumePrefs, VolumeStorage } from './volume';
import { initedBus } from './fakeAudio.fixture';
import type { FakeCtx, FakeSource } from './fakeAudio.fixture';

type Id = 'tone' | 'noise' | 'shortNoise' | 'long' | 'chord';

const BANK: SfxBank<Id> = {
  tone: { wave: 'sine', freq: 100, freqEnd: 200, dur: 0.1, gain: 0.5, filter: { type: 'lowpass', freq: 900 } },
  noise: { wave: 'noise', dur: 0.2, gain: 0.3 },
  shortNoise: { wave: 'noise', dur: 0.1, gain: 0.3 },
  long: { wave: 'square', freq: 300, dur: 5, gain: 0.2 },
  chord: [
    { wave: 'sine', freq: 200, dur: 0.1, gain: 0.2 },
    { wave: 'triangle', freq: 300, dur: 0.1, gain: 0.2 },
  ],
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

function setup(cooldownMs: Partial<Record<Id, number>> = {}): { player: SfxPlayer<Id>; ctx: FakeCtx; clock: { t: number } } {
  const { bus, ctx } = initedBus();
  const clock = { t: 0 };
  const player = new SfxPlayer<Id>(bus, new AudioMixer(bus, { storage: memory() }), {
    bank: BANK,
    cooldownMs,
    now: () => clock.t,
  });
  return { player, ctx, clock };
}

const lastResult = <T>(m: jest.Mock): T => m.mock.results[m.mock.results.length - 1]?.value as T;

describe('SfxPlayer behaviour', () => {
  it('returns false for an id missing from the bank', () => {
    expect(setup().player.play('nope' as Id)).toBe(false);
  });

  it('honours per-id cooldowns', () => {
    const { player, clock } = setup({ tone: 100 });
    expect(player.play('tone')).toBe(true);
    clock.t = 50;
    expect(player.play('tone')).toBe(false);
    clock.t = 100;
    expect(player.play('tone')).toBe(true);
  });

  it('applies pitch to freq and sweep, caps gain at 1, and routes through the filter', () => {
    const { player, ctx } = setup();
    player.play('tone', { pitch: 2, gain: 4 });
    const osc = lastResult<FakeSource>(ctx.createOscillator);
    expect(osc.frequency?.setValueAtTime).toHaveBeenCalledWith(200, 0);
    expect(osc.frequency?.exponentialRampToValueAtTime).toHaveBeenCalledWith(400, expect.any(Number));
    const env = lastResult<{ gain: { linearRampToValueAtTime: jest.Mock } }>(ctx.createGain);
    expect(env.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));
    expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(1);
  });

  it('plays every voice of a layered entry', () => {
    const { player, ctx } = setup();
    player.play('chord');
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('plays noise voices from a buffer, cached per duration', () => {
    const { player, ctx } = setup();
    player.play('noise');
    player.play('noise');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
    expect(ctx.createBuffer).toHaveBeenCalledTimes(1);
    player.play('shortNoise');
    expect(ctx.createBuffer).toHaveBeenCalledTimes(2);
  });

  it('never lets a voice ring past MAX_SFX_DURATION', () => {
    const { player, ctx } = setup();
    player.play('long');
    const osc = lastResult<FakeSource>(ctx.createOscillator);
    const stopAt = osc.stop.mock.calls[0]?.[0] as number;
    expect(MAX_SFX_DURATION).toBe(1.5);
    expect(stopAt).toBeLessThanOrEqual(MAX_SFX_DURATION + 0.05);
  });

  it('disconnects its nodes when the voice ends', () => {
    const { player, ctx } = setup();
    player.play('tone');
    const osc = lastResult<FakeSource>(ctx.createOscillator);
    const filter = lastResult<FakeSource>(ctx.createBiquadFilter);
    const env = lastResult<FakeSource>(ctx.createGain);
    osc.onended?.();
    expect(osc.disconnect).toHaveBeenCalled();
    expect(filter.disconnect).toHaveBeenCalled();
    expect(env.disconnect).toHaveBeenCalled();
  });

  it('uses performance.now when no clock is injected', () => {
    const { bus } = initedBus();
    const player = new SfxPlayer<Id>(bus, new AudioMixer(bus, { storage: memory() }), { bank: BANK });
    expect(player.play('tone')).toBe(true);
  });
});
