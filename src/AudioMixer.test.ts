import { AudioMixer } from './AudioMixer';
import { AudioChannel } from './AudioChannel';
import { MusicEngine } from './MusicEngine';
import { SfxBus } from './SfxBus';
import { stepToGain } from './volume';
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

describe('AudioMixer acceptance', () => {
  it('AC-02', () => {
    const mixer = new AudioMixer(new SfxBus(), { storage: memory() });
    expect(mixer.prefs()).toEqual({ music: 3, sfx: 3, muted: false });
  });

  it('AC-03', () => {
    const storage = memory();
    const first = new AudioMixer(new SfxBus(), { storage });
    expect(first.setStep(AudioChannel.Music, 4)).toBe(true);
    const second = new AudioMixer(new SfxBus(), { storage });
    expect(second.prefs().music).toBe(4);
  });

  it('AC-04', () => {
    const { bus } = initedBus();
    const storage: VolumeStorage = {
      load: () => null,
      save: () => {
        throw new Error('quota');
      },
    };
    const mixer = new AudioMixer(bus, { storage });
    expect(mixer.setStep(AudioChannel.Sfx, 1)).toBe(false);
    expect(mixer.prefs().sfx).toBe(1);
    expect(bus.sfxGain?.gain.value).toBe(stepToGain(1));
  });

  it('AC-06', () => {
    const { bus } = initedBus();
    const mixer = new AudioMixer(bus, { storage: memory() });
    const engine = new MusicEngine(bus);
    mixer.attach(engine);
    mixer.setStep(AudioChannel.Music, 2);
    mixer.setMuted(true);
    expect(bus.master?.gain.value).toBe(0);
    expect(engine.isMuted()).toBe(true);
    mixer.setMuted(false);
    expect(bus.master?.gain.value).toBe(1);
    expect(engine.isMuted()).toBe(false);
    expect(mixer.prefs().music).toBe(2);
    expect(bus.musicGain?.gain.value).toBe(stepToGain(2));
  });
});
