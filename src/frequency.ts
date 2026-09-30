// Pure-math helpers for converting EpTrack scale degrees into Hz.
// Kept separate from MusicEngine so the math can be unit-tested without
// touching Web Audio.

import type { EpScale } from './types';

/**
 * Convert a scale degree (1..N) at a given octave shift into a frequency
 * in Hz.
 *
 *   freq = root * scale[(degree-1) mod scale.length] * 2^octaveShift
 *
 * `degree = 0` is a rest — returns null. (Callers must handle the rest case.)
 */
export function degreeToHz(
  root: number,
  scale: EpScale,
  degree: number,
  octaveShift = 0,
): number | null {
  if (!Number.isFinite(root) || root <= 0) {
    throw new RangeError('degreeToHz: root must be > 0');
  }
  if (!Array.isArray(scale) || scale.length === 0) {
    throw new RangeError('degreeToHz: scale must be a non-empty array');
  }
  if (!Number.isFinite(degree)) {
    throw new RangeError('degreeToHz: degree must be finite');
  }
  if (degree === 0) {
    return null;
  }
  if (!Number.isInteger(degree) || degree < 1) {
    throw new RangeError('degreeToHz: degree must be 0 (rest) or a positive integer');
  }
  const idx = (degree - 1) % scale.length;
  const ratio = scale[idx];
  if (ratio === undefined) {
    // Should never happen given the bounds checks above, but TS strict mode
    // demands the guard.
    throw new RangeError('degreeToHz: scale index out of range');
  }
  return root * ratio * Math.pow(2, octaveShift);
}
