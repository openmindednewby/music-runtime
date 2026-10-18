export const MAX_PITCH_JITTER = 0.5;

/** Returns `base` scaled by a uniform random factor in [1 - jitter, 1 + jitter); jitter is clamped to 0..MAX_PITCH_JITTER. */
export function jitterPitch(base: number, jitter: number, random: () => number): number {
  if (!Number.isFinite(jitter) || jitter <= 0) {
    return base;
  }
  const spread = Math.min(jitter, MAX_PITCH_JITTER);
  return base * (1 + (random() * 2 - 1) * spread);
}

/** Picks an index in 0..count-1, never `previous` twice in a row when count > 1. */
export function pickVariant(count: number, previous: number, random: () => number): number {
  if (count <= 1) {
    return 0;
  }
  const index = Math.min(count - 1, Math.floor(random() * count));
  return index === previous ? (index + 1) % count : index;
}
