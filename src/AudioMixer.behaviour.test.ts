import { AudioMixer } from './AudioMixer';
import { AudioChannel } from './AudioChannel';
import { SfxBus } from './SfxBus';
import { stepToGain } from './volume';
import type { VolumePrefs, VolumeStorage } from './volume';
import { initedBus } from './fakeAudio.fixture';

function spyStorage(initial: VolumePrefs | null = null): VolumeStorage & { save: jest.Mock } {
  let saved = initial;
  return {
    load: () => saved,
    save: jest.fn((p: VolumePrefs) => {
      saved = p;
      return true;
    }),
  };
}

describe('AudioMixer behaviour', () => {
  afterEach(() => localStorage.clear());

  it('uses options.defaults only when storage is empty', () => {
    expect(new AudioMixer(new SfxBus(), { storage: spyStorage(), defaults: { music: 1 } }).prefs().music).toBe(1);
    const stored = spyStorage({ music: 4, sfx: 2, muted: false });
    expect(new AudioMixer(new SfxBus(), { storage: stored, defaults: { music: 1 } }).prefs().music).toBe(4);
  });

  it('falls back to defaults when storage.load throws', () => {
    const storage: VolumeStorage = {
      load: () => {
        throw new Error('corrupt');
      },
      save: () => true,
    };
    expect(new AudioMixer(new SfxBus(), { storage }).prefs()).toEqual({ music: 3, sfx: 3, muted: false });
  });

  it('toggleMute returns the new state and persists it', () => {
    const storage = spyStorage();
    const mixer = new AudioMixer(new SfxBus(), { storage });
    expect(mixer.toggleMute()).toBe(true);
    expect(mixer.toggleMute()).toBe(false);
    expect(storage.save).toHaveBeenLastCalledWith({ music: 3, sfx: 3, muted: false });
  });

  it('notifies subscribers until they unsubscribe', () => {
    const mixer = new AudioMixer(new SfxBus(), { storage: spyStorage() });
    const listener = jest.fn();
    const off = mixer.subscribe(listener);
    mixer.setStep(AudioChannel.Sfx, 5);
    expect(listener).toHaveBeenCalledWith({ music: 3, sfx: 5, muted: false });
    off();
    mixer.setStep(AudioChannel.Sfx, 1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('a throwing subscriber neither skips the save nor the other listeners', () => {
    const storage = spyStorage();
    const mixer = new AudioMixer(new SfxBus(), { storage });
    const after = jest.fn();
    mixer.subscribe(() => {
      throw new Error('ui bug');
    });
    mixer.subscribe(after);
    expect(mixer.setStep(AudioChannel.Music, 1)).toBe(true);
    expect(storage.save).toHaveBeenCalledWith({ music: 1, sfx: 3, muted: false });
    expect(after).toHaveBeenCalled();
  });

  it('apply() sets gains once the lazy graph exists', () => {
    const { bus } = initedBus();
    const graph = { master: bus.master, musicGain: bus.musicGain, sfxGain: bus.sfxGain };
    const lazy = new SfxBus();
    const mixer = new AudioMixer(lazy, { storage: spyStorage({ music: 1, sfx: 4, muted: true }) });
    Object.assign(lazy, graph);
    mixer.apply();
    expect(lazy.master?.gain.value).toBe(0);
    expect(lazy.musicGain?.gain.value).toBe(stepToGain(1));
    expect(lazy.sfxGain?.gain.value).toBe(stepToGain(4));
  });

  it('attach pushes the stored mute state to the engine', () => {
    const mixer = new AudioMixer(new SfxBus(), { storage: spyStorage({ music: 3, sfx: 3, muted: true }) });
    const engine = { setMute: jest.fn() };
    mixer.attach(engine);
    expect(engine.setMute).toHaveBeenCalledWith(true);
  });

  it('defaults to localStorage when no storage is given', () => {
    new AudioMixer(new SfxBus()).setStep(AudioChannel.Music, 2);
    expect(new AudioMixer(new SfxBus()).prefs().music).toBe(2);
  });
});
