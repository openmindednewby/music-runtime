// Volume steps (0..VOLUME_STEPS) -> gain, and the storage port the mixer
// persists through. Pure apart from localVolumeStorage, which touches the
// injected (or ambient) key/value store and never throws.

export const VOLUME_STEPS = 5;
export const DEFAULT_VOLUME_STEP = 3;
export const DEFAULT_VOLUME_KEY = 'epmr_volume_v1';
const LEGACY_MUTE_KEY = 'epmr_music_mute';
const LEGACY_MUTED_VALUE = '1';
const GAIN_CURVE_EXPONENT = 2;

export interface VolumePrefs {
  readonly music: number;
  readonly sfx: number;
  readonly muted: boolean;
}

export interface VolumeStorage {
  load(): VolumePrefs | null;
  save(prefs: VolumePrefs): boolean;
}

export type VolumeKeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export function clampStep(step: number): number {
  if (Number.isNaN(step)) {
    return DEFAULT_VOLUME_STEP;
  }
  return Math.min(VOLUME_STEPS, Math.max(0, Math.round(step)));
}

/** Perceptual (squared) curve: 0 -> 0, VOLUME_STEPS -> 1, strictly increasing. */
export function stepToGain(step: number): number {
  return Math.pow(clampStep(step) / VOLUME_STEPS, GAIN_CURVE_EXPONENT);
}

export function defaultVolumePrefs(): VolumePrefs {
  return { music: DEFAULT_VOLUME_STEP, sfx: DEFAULT_VOLUME_STEP, muted: false };
}

function ambientStore(): VolumeKeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function stepOrDefault(x: unknown): number {
  return typeof x === 'number' ? clampStep(x) : DEFAULT_VOLUME_STEP;
}

function parsePrefs(raw: string): VolumePrefs | null {
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) {
      return null;
    }
    const o = v as Record<string, unknown>;
    return { music: stepOrDefault(o.music), sfx: stepOrDefault(o.sfx), muted: o.muted === true };
  } catch {
    return null;
  }
}

/**
 * localStorage-backed VolumeStorage. With nothing stored under `key`, a legacy
 * 1.0 `epmr_music_mute=1` is read as `muted: true` with default steps.
 */
export function localVolumeStorage(key: string = DEFAULT_VOLUME_KEY, store?: VolumeKeyValueStore): VolumeStorage {
  const kv = (): VolumeKeyValueStore | null => store ?? ambientStore();
  return {
    load(): VolumePrefs | null {
      try {
        const s = kv();
        if (!s) {
          return null;
        }
        const raw = s.getItem(key);
        if (raw !== null) {
          return parsePrefs(raw);
        }
        return s.getItem(LEGACY_MUTE_KEY) === LEGACY_MUTED_VALUE ? { ...defaultVolumePrefs(), muted: true } : null;
      } catch {
        return null;
      }
    },
    save(prefs: VolumePrefs): boolean {
      try {
        const s = kv();
        if (!s) {
          return false;
        }
        s.setItem(key, JSON.stringify(prefs));
        return true;
      } catch {
        return false;
      }
    },
  };
}
