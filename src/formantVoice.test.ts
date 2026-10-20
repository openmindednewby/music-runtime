import { SfxPlayer } from './SfxPlayer';
import type { SfxFormantVoice } from './SfxPlayer';
import { AudioMixer } from './AudioMixer';
import { shapeEnvelope, VOWELS } from './formantVoice';
import type { VolumePrefs, VolumeStorage } from './volume';
import { initedBus } from './fakeAudio.fixture';
import type { FakeParam } from './fakeAudio.fixture';

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

const fakeParam = (): FakeParam => ({
  value: 0,
  setValueAtTime: jest.fn(),
  linearRampToValueAtTime: jest.fn(),
  exponentialRampToValueAtTime: jest.fn(),
});

const VOICE: SfxFormantVoice = {
  wave: 'formant',
  dur: 0.5,
  gain: 0.5,
  hardStop: 0.01,
  pitch: [{ at: 0, hz: 200 }, { at: 0.5, hz: 300 }, { at: 1, hz: 150 }],
  vowels: [{ at: 0, vowel: VOWELS.oo }, { at: 1, vowel: VOWELS.ah }],
  vibrato: { hz: 5, depthHz: 8 },
};

const playerFor = (): { player: SfxPlayer<'faah'>; ctx: ReturnType<typeof initedBus>['ctx'] } => {
  const { bus, ctx } = initedBus();
  const player = new SfxPlayer(bus, new AudioMixer(bus, { storage: memory() }), { bank: { faah: VOICE }, now: () => 0 });
  return { player, ctx };
};

describe('shapeEnvelope', () => {
  it('with a hard stop, holds the peak then ramps linearly to 0 at the end', () => {
    const gain = fakeParam();

    shapeEnvelope(gain as unknown as AudioParam, 0.5, 0.02, 1, 0.5, 0.01);

    expect([gain.setValueAtTime.mock.calls[1], gain.linearRampToValueAtTime.mock.calls[1], gain.exponentialRampToValueAtTime.mock.calls.length]).toEqual([
      [0.5, 1.49],
      [0, 1.5],
      0,
    ]);
  });

  it('without a hard stop, decays exponentially to silence at the end', () => {
    const gain = fakeParam();

    shapeEnvelope(gain as unknown as AudioParam, 0.5, 0.02, 0, 0.5);

    expect(gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 0.5);
  });
});

describe('SfxPlayer.play with a formant voice', () => {
  it('with vibrato and pitch 2, makes a source plus an LFO, three formant bands and a doubled start pitch', () => {
    const { player, ctx } = playerFor();

    const played = player.play('faah', { pitch: 2 });

    const source = ctx.createOscillator.mock.results[0]?.value;
    const counts = [ctx.createOscillator.mock.calls.length, ctx.createBiquadFilter.mock.calls.length];
    expect([played, counts, source.frequency.setValueAtTime.mock.calls[0]]).toEqual([true, [2, 3], [400, 0]]);
  });

  it('with a vowel sequence, glides the first band from the first vowel to the last', () => {
    const { player, ctx } = playerFor();

    player.play('faah');

    const f1 = ctx.createBiquadFilter.mock.results[0]?.value;
    expect([f1.frequency.setValueAtTime.mock.calls[0], f1.frequency.linearRampToValueAtTime.mock.calls[0]]).toEqual([
      [320, 0],
      [700, 0.5],
    ]);
  });
});
