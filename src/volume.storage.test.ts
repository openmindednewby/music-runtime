import { localVolumeStorage, stepToGain, DEFAULT_VOLUME_KEY } from './volume';
import { memoryKv } from './fakeAudio.fixture';

describe('localVolumeStorage', () => {
  afterEach(() => localStorage.clear());

  it('round-trips saved prefs under the key', () => {
    const kv = memoryKv();
    const storage = localVolumeStorage('k', kv);
    expect(storage.save({ music: 1, sfx: 4, muted: true })).toBe(true);
    expect(storage.load()).toEqual({ music: 1, sfx: 4, muted: true });
  });

  it('sanitises stored values: clamps steps, defaults non-numbers, muted only when true', () => {
    const kv = memoryKv();
    kv.setItem('k', JSON.stringify({ music: 9, sfx: 'x', muted: 1 }));
    expect(localVolumeStorage('k', kv).load()).toEqual({ music: 5, sfx: 3, muted: false });
  });

  it.each(['{not json', '3', 'null'])('returns null for unusable stored value %s', (raw) => {
    const kv = memoryKv();
    kv.setItem('k', raw);
    expect(localVolumeStorage('k', kv).load()).toBeNull();
  });

  it('returns null with nothing stored and no muted legacy flag', () => {
    const kv = memoryKv();
    expect(localVolumeStorage('k', kv).load()).toBeNull();
    kv.setItem('epmr_music_mute', '0');
    expect(localVolumeStorage('k', kv).load()).toBeNull();
  });

  it('never throws when the store throws', () => {
    const broken = {
      getItem: (): string | null => {
        throw new Error('denied');
      },
      setItem: (): void => {
        throw new Error('quota');
      },
    };
    const storage = localVolumeStorage('k', broken);
    expect(storage.load()).toBeNull();
    expect(storage.save({ music: 1, sfx: 1, muted: false })).toBe(false);
  });

  it('defaults to window.localStorage and the epmr_volume_v1 key', () => {
    expect(localVolumeStorage().save({ music: 2, sfx: 2, muted: false })).toBe(true);
    expect(JSON.parse(localStorage.getItem(DEFAULT_VOLUME_KEY) ?? 'null')).toEqual({ music: 2, sfx: 2, muted: false });
  });

  it('maps fractional steps through the same clamp as the mixer', () => {
    expect(stepToGain(2.6)).toBe(stepToGain(3));
    expect(stepToGain(-4)).toBe(0);
  });
});
