// @dloizides/music-runtime — public surface.
//
// Phase 1 of the EisaiPollis Music Studio plan. Procedural music engine
// extracted from Beyond the Void. Framework-agnostic, zero-dependency,
// Web-Audio-only. See README.md for usage.

export { MusicEngine } from './MusicEngine';
export type { DropState } from './MusicEngine';
export { SfxBus } from './SfxBus';
export { Scheduler } from './Scheduler';
export type { SchedulerTickInfo } from './Scheduler';
export { parseBeatFlag, parseBeatLane } from './PatternParser';
export { degreeToHz } from './frequency';
export { presets, getPreset } from './presets';
export { AudioChannel } from './AudioChannel';
export {
  VOLUME_STEPS,
  DEFAULT_VOLUME_STEP,
  DEFAULT_VOLUME_KEY,
  clampStep,
  stepToGain,
  defaultVolumePrefs,
  localVolumeStorage,
} from './volume';
export type { VolumePrefs, VolumeStorage, VolumeKeyValueStore } from './volume';
export { AudioMixer } from './AudioMixer';
export type { AudioMixerOptions, MuteableEngine } from './AudioMixer';
export { CooldownGate } from './CooldownGate';
export { SfxPlayer } from './SfxPlayer';
export { MAX_SFX_DURATION } from './SfxPlayer';
export type { SfxVoice, SfxToneVoice, SfxNoiseVoice, SfxBank, SfxPlayerOptions, SfxPlayOptions } from './SfxPlayer';
export { SFX_PRESETS } from './sfxPresets';
export type { SfxPresetId } from './sfxPresets';
export type {
  EpTrack,
  EpScale,
  EpMix,
  EpBeatFlag,
  EpBeatStep,
  EpWaveType,
} from './types';
export {
  CFG_BASS_GAIN,
  BASS_LFO_DEPTH,
  BASS_DUCK_LEVEL,
  CFG_PAD_GAIN,
  PAD_FILTER_BASE,
  PAD_WARMTH_FREQ,
  CFG_PAD_LFO_DEPTH,
  ARP_GAIN,
  ARP_OCTAVE_CHANCE,
  ARP_DEFAULT_DECAY,
  DELAY_FEEDBACK,
  DELAY_FILTER_FREQ,
  DELAY_WET_GAIN,
  BOOST_FREQ_BASE,
  BOOST_FILTER_FREQ,
  BOOST_GAIN,
  REVERB_DELAY,
  REVERB_FEEDBACK,
  REVERB_FILTER,
  BEAT_BPM_BASE,
  BEAT_BPM_SPEED_MULT,
  BEAT_BREAK_INTERVAL,
  STEPS_PER_BAR,
  STOP_FADE_DUR,
} from './tuning';
