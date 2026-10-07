// Owns the volume prefs and applies them to an SfxBus graph: master gain for
// mute, musicGain / sfxGain for the per-channel steps. Persists through an
// injected VolumeStorage; a failed save keeps the change for the session.

import type { SfxBus } from './SfxBus';
import { AudioChannel } from './AudioChannel';
import { clampStepTo, defaultVolumePrefs, levelToGain, localVolumeStorage, maxStep } from './volume';
import type { VolumeLevels, VolumePrefs, VolumeStorage } from './volume';

export interface AudioMixerOptions {
  readonly storage?: VolumeStorage;
  readonly defaults?: Partial<VolumePrefs>;
  /** Gain per step replacing the default 0..5 squared curve; step count = length. */
  readonly levels?: VolumeLevels;
}

/** The part of MusicEngine the mixer drives; MusicEngine satisfies it. */
export interface MuteableEngine {
  setMute(muted: boolean): void;
}

type Listener = (prefs: VolumePrefs) => void;

function safeLoad(storage: VolumeStorage): VolumePrefs | null {
  try {
    return storage.load();
  } catch {
    return null;
  }
}

export class AudioMixer {
  private readonly _storage: VolumeStorage;
  private _prefs: VolumePrefs;
  private _engine: MuteableEngine | null = null;
  private readonly _listeners = new Set<Listener>();
  private readonly _levels: VolumeLevels | undefined;
  private readonly _maxStep: number;

  constructor(
    private readonly _bus: SfxBus,
    options: AudioMixerOptions = {},
  ) {
    this._storage = options.storage ?? localVolumeStorage();
    this._levels = options.levels;
    this._maxStep = maxStep(options.levels);
    const merged = safeLoad(this._storage) ?? { ...defaultVolumePrefs(), ...options.defaults };
    this._prefs = {
      music: clampStepTo(merged.music, this._maxStep),
      sfx: clampStepTo(merged.sfx, this._maxStep),
      muted: merged.muted === true,
    };
    this.apply();
  }

  /** From here on the mixer is the source of truth for the engine's mute. */
  attach(engine: MuteableEngine): void {
    this._engine = engine;
    engine.setMute(this._prefs.muted);
  }

  prefs(): VolumePrefs {
    return this._prefs;
  }

  /** Highest valid step for this mixer's level scale. */
  maxStep(): number {
    return this._maxStep;
  }

  setStep(channel: AudioChannel, step: number): boolean {
    const clamped = clampStepTo(step, this._maxStep);
    this._prefs =
      channel === AudioChannel.Music ? { ...this._prefs, music: clamped } : { ...this._prefs, sfx: clamped };
    return this._commit();
  }

  setMuted(muted: boolean): boolean {
    this._prefs = { ...this._prefs, muted };
    this._engine?.setMute(muted);
    return this._commit();
  }

  toggleMute(): boolean {
    this.setMuted(!this._prefs.muted);
    return this._prefs.muted;
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return (): void => {
      this._listeners.delete(listener);
    };
  }

  /** Re-apply gains; call after bus.init(), since the graph is built lazily. */
  apply(): void {
    const { master, musicGain, sfxGain } = this._bus;
    if (master) {
      master.gain.value = this._prefs.muted ? 0 : 1;
    }
    if (musicGain) {
      musicGain.gain.value = levelToGain(this._prefs.music, this._levels);
    }
    if (sfxGain) {
      sfxGain.gain.value = levelToGain(this._prefs.sfx, this._levels);
    }
  }

  private _commit(): boolean {
    this.apply();
    for (const listener of this._listeners) {
      try {
        listener(this._prefs);
      } catch {
        // A faulty subscriber must not block the other listeners or the save.
      }
    }
    try {
      return this._storage.save(this._prefs);
    } catch {
      return false;
    }
  }
}
