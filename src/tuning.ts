// Global synth tuning constants — hoisted from window.* in BTV's index.html.
// Values match BTV's config.js `AUDIO TUNING` section as of the snapshot
// captured for Phase 1 of the EisaiPollis Music Studio extraction.
//
// These are intentionally a flat set of named consts so consumers can
// `import { CFG_BASS_GAIN } from '@dloizides/music-runtime'` if they ever
// need to. They are not part of the EpTrack data — they are global synth
// behaviour (filter slopes, ramp curves, drop-state pacing).

// Bass voice
export const CFG_BASS_GAIN = 0.03;
export const BASS_LFO_DEPTH = 0.20;
export const BASS_DUCK_LEVEL = 0.008;

// Pad voice
export const CFG_PAD_GAIN = 0.04;
export const PAD_FILTER_BASE = 800;
export const PAD_WARMTH_FREQ = 2500;
export const CFG_PAD_LFO_DEPTH = 200;

// Arp voice
export const ARP_GAIN = 0.03;
export const ARP_OCTAVE_CHANCE = 0.15;
export const ARP_DEFAULT_DECAY = 0.1;

// BPM-synced delay/echo
export const DELAY_FEEDBACK = 0.3;
export const DELAY_FILTER_FREQ = 3000;
export const DELAY_WET_GAIN = 0.25;

// Boost layer (BTV speed-boost overlay)
export const BOOST_FREQ_BASE = 800;
export const BOOST_FILTER_FREQ = 1000;
export const BOOST_GAIN = 0.025;

// Reverb send (used by the optional SfxBus)
export const REVERB_DELAY = 0.45;
export const REVERB_FEEDBACK = 0.45;
export const REVERB_FILTER = 3500;

// Beat scheduler (BTV's adaptive BPM is post-Phase-1; we use track tempo here)
export const BEAT_BPM_BASE = 80;
export const BEAT_BPM_SPEED_MULT = 0.8;
export const BEAT_BREAK_INTERVAL = 128;

// Engine internals
/** Fade-out duration in seconds when stop() is called. */
export const STOP_FADE_DUR = 1.5;
/** Number of steps per pattern bar (BTV is fixed 16). */
export const STEPS_PER_BAR = 16;
/** Default pad LFO rate in Hz when no tempo is provided. */
export const PAD_LFO_DEFAULT_RATE = 0.04;
/** Default bass LFO rate in Hz when no tempo is provided. */
export const BASS_LFO_DEFAULT_RATE = 0.5;
