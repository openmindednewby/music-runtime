// Public types for @dloizides/music-runtime.

/** Wave type accepted by Web Audio OscillatorNode (subset used by EpTrack). */
export type EpWaveType = 'sine' | 'square' | 'sawtooth' | 'triangle';

/**
 * Scale as multiplicative ratios from the root frequency. Five degrees by
 * convention to match BTV's mode (e.g. major-pentatonic-ish [1, 1.122, 1.26, 1.498, 1.682]).
 * The runtime indexes by `degree - 1`.
 */
export type EpScale = readonly number[];

/**
 * One slot in a 16-step beat lane. Single-character flags concatenated:
 *   K = kick, H = hi-hat, C = clap, S = shaker, A = open hi-hat (alias for hi-hat),
 *   "." = rest. Examples: "KH" (kick + hat), "SH" (shaker + hat), "." (rest).
 *
 * BTV's data uses both "K." (literal "K" + filler ".") and "KH" (kick+hat).
 * The parser ignores ".".
 */
export type EpBeatFlag = string;

/** Per-instrument volume multipliers (100 = default gain, 0 = silent, 200 = double). */
export interface EpMix {
  bass: number;
  pad: number;
  arp: number;
  kick: number;
  hat: number;
  reverb: number;
}

/** Decoded beat-flag bitmap. */
export interface EpBeatStep {
  kick: boolean;
  hat: boolean;
  clap: boolean;
  shaker: boolean;
}

/**
 * Self-describing track. The .eptrack/1 format. Compositions in the runtime
 * presets are this shape exactly; users can `JSON.stringify` and round-trip
 * one through localStorage / a server / a file with no information loss.
 */
export interface EpTrack {
  /** Format identifier. Bump when the schema changes incompatibly. */
  format: 'eptrack/1';
  /** Display name. Must be unique across the preset list. */
  name: string;
  /** One-line description shown in editors / pickers. */
  desc: string;
  /** Beats per minute. Drives scheduler tick rate and pad/bass LFO rates. */
  tempo: number;
  /** Root frequency in Hz. Bass plays at root; pad/arp scale up from it. */
  root: number;
  /** Scale as ratios from root (length 5 by BTV convention). */
  scale: EpScale;
  /** Default oscillator wave for bass / pad / arp. */
  waveType: EpWaveType;
  /** 16-step beat-flag lane. Length must be 16. */
  beat: readonly EpBeatFlag[];
  /** 16-step bass lane. Each value is 0 (rest) or a scale degree 1..5. */
  bass: readonly number[];
  /** 16-step arp lane. Same encoding as bass. */
  arp: readonly number[];
  /** Per-instrument volume mix. */
  mix: EpMix;
  /** Three pad oscillator frequencies (Hz). Two are nearly-detuned, third is a 5th up. */
  padFreqs: readonly [number, number, number];
  /** Bass lowpass filter cutoff in Hz. */
  bassFilterCutoff: number;
  /** Per-note arp release time in seconds. */
  arpDecay: number;
}
