import { SfxPlayer } from './SfxPlayer';
import { AudioMixer } from './AudioMixer';
import { AudioChannel } from './AudioChannel';
import { SfxBus } from './SfxBus';
import { SFX_PRESETS } from './sfxPresets';
import type { VolumePrefs, VolumeStorage } from './volume';
import { initedBus } from './fakeAudio.fixture';

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

describe('SfxPlayer acceptance', () => {
  it('AC-07', () => {
    const { bus, ctx } = initedBus();
    const mixer = new AudioMixer(bus, { storage: memory() });
    const player = new SfxPlayer(bus, mixer, { bank: SFX_PRESETS, now: () => 0 });

    mixer.setMuted(true);
    expect(player.play('jump')).toBe(false);
    mixer.setMuted(false);
    mixer.setStep(AudioChannel.Sfx, 0);
    expect(player.play('jump')).toBe(false);
    expect(ctx.createOscillator).not.toHaveBeenCalled();

    mixer.setStep(AudioChannel.Sfx, 3);
    expect(player.play('jump')).toBe(true);
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('AC-09', () => {
    const bus = new SfxBus();
    const mixer = new AudioMixer(bus, { storage: memory() });
    const player = new SfxPlayer(bus, mixer, { bank: SFX_PRESETS });
    expect(() => player.play('slam')).not.toThrow();
    expect(player.play('slam')).toBe(false);
  });
});
