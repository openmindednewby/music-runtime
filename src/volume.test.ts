import { clampStep, stepToGain, localVolumeStorage, VOLUME_STEPS, DEFAULT_VOLUME_STEP } from './volume';
import { AudioMixer } from './AudioMixer';
import { SfxBus } from './SfxBus';
import { memoryKv } from './fakeAudio.fixture';

describe('volume acceptance', () => {
  it('AC-01', () => {
    expect([-1, 0, 2.6, 5, 9, NaN].map(clampStep)).toEqual([0, 0, 3, 5, 5, 3]);
    expect(VOLUME_STEPS).toBe(5);
    expect(DEFAULT_VOLUME_STEP).toBe(3);
    expect(stepToGain(0)).toBe(0);
    expect(stepToGain(5)).toBe(1);
    for (let s = 1; s <= 5; s++) {
      expect(stepToGain(s)).toBeGreaterThan(stepToGain(s - 1));
    }
  });

  it('AC-05', () => {
    const kv = memoryKv();
    kv.setItem('epmr_music_mute', '1');
    const mixer = new AudioMixer(new SfxBus(), { storage: localVolumeStorage(undefined, kv) });
    expect(mixer.prefs()).toEqual({ music: 3, sfx: 3, muted: true });
  });
});
