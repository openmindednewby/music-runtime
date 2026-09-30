// Decodes BTV's beat-flag strings into structured EpBeatStep records.
//
// Encoding (single character per drum, concatenated with optional ".")
//   K = kick     H = hi-hat   C = clap    S = shaker
//   A = open hi-hat (alias for H — BTV uses "HA" at end-of-bar fills)
//   . = filler / rest (ignored)
//
// Examples:
//   "KH"  -> kick + hat
//   "K."  -> kick (BTV pads single-char beats to 2 chars for column alignment)
//   "."   -> rest (all false)
//   "SH"  -> shaker + hat
//   "HA"  -> open hi-hat (counts as hat)
//
// Empty strings are treated as a parse error. Unknown letters are also a
// parse error — silently dropping them was a hidden-bug magnet in BTV.

import type { EpBeatFlag, EpBeatStep } from './types';

const VALID_FLAG_CHARS = new Set(['K', 'H', 'C', 'S', 'A', '.']);

const ERR_EMPTY = 'PatternParser: beat flag string is empty';
const ERR_NON_STRING = 'PatternParser: beat flag must be a string';
const errInvalidChar = (ch: string, full: string): string =>
  `PatternParser: invalid beat flag character "${ch}" in "${full}"`;

export function parseBeatFlag(flag: EpBeatFlag): EpBeatStep {
  if (typeof flag !== 'string') {
    throw new TypeError(ERR_NON_STRING);
  }
  if (flag.length === 0) {
    throw new Error(ERR_EMPTY);
  }
  const step: EpBeatStep = { kick: false, hat: false, clap: false, shaker: false };
  for (let i = 0; i < flag.length; i++) {
    const ch = flag.charAt(i);
    if (!VALID_FLAG_CHARS.has(ch)) {
      throw new Error(errInvalidChar(ch, flag));
    }
    if (ch === 'K') {
      step.kick = true;
    } else if (ch === 'H' || ch === 'A') {
      step.hat = true;
    } else if (ch === 'C') {
      step.clap = true;
    } else if (ch === 'S') {
      step.shaker = true;
    }
    // "." is filler — no-op.
  }
  return step;
}

/** Convenience: decode an entire 16-step beat lane in one call. */
export function parseBeatLane(lane: readonly EpBeatFlag[]): EpBeatStep[] {
  return lane.map(parseBeatFlag);
}
