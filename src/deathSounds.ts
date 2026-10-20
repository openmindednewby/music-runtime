import { DeathCause } from './DeathCause';
import { DEATH_LINES } from './deathLines';
import { pickVariant } from './sfxVariation';
import type { SfxBank, SfxLayer, SfxVoice } from './SfxPlayer';

export type DeathCauseSfxId = `death.${DeathCause}`;
export type DeathLineSfxId = `death.${DeathCause}.${number}`;
export type DeathSfxPicker = (cause: DeathCause) => DeathLineSfxId;

/** The bank id of the meme death sound for a cause. */
export function deathCauseSfxId(cause: DeathCause): DeathCauseSfxId {
  return `death.${cause}`;
}

/** The bank ids of every voice line of a cause, `death.<cause>.1` upwards. */
export function deathLineSfxIds(cause: DeathCause): readonly DeathLineSfxId[] {
  return DEATH_LINES[cause].map((_line, i) => `death.${cause}.${i + 1}` as const);
}

function pitchVoice(v: SfxVoice, factor: number): SfxVoice {
  if (v.wave === 'noise') {
    return v;
  }
  if (v.wave === 'formant') {
    return { ...v, pitch: v.pitch.map((p) => ({ at: p.at, hz: p.hz * factor })) };
  }
  return { ...v, freq: v.freq * factor, ...(v.freqEnd === undefined ? {} : { freqEnd: v.freqEnd * factor }) };
}

function isVoiceList(layer: SfxLayer): layer is readonly SfxVoice[] {
  return Array.isArray(layer);
}

/** Copies a layer with every tone and formant pitch scaled by factor; noise is left as is. */
export function withPitch(layer: SfxLayer, factor: number): SfxLayer {
  return isVoiceList(layer) ? layer.map((v) => pitchVoice(v, factor)) : pitchVoice(layer, factor);
}

const CAUSES = Object.values(DeathCause);

/** One entry per death cause whose variants are its distinct voice lines; merges with SFX_PRESETS without touching 'death'. */
export const DEATH_CAUSE_SFX: SfxBank<DeathCauseSfxId> = Object.fromEntries(
  CAUSES.map((cause) => [deathCauseSfxId(cause), { variants: DEATH_LINES[cause] }]),
) as SfxBank<DeathCauseSfxId>;

/** Every voice line under its own `death.<cause>.<n>` id, for playing the line a picker chose. */
export const DEATH_LINE_SFX: SfxBank<DeathLineSfxId> = Object.fromEntries(
  CAUSES.flatMap((cause) => deathLineSfxIds(cause).map((id, i) => [id, DEATH_LINES[cause][i] ?? []])),
) as SfxBank<DeathLineSfxId>;

function pickWith(last: Map<DeathCause, number>, cause: DeathCause, random: () => number): DeathLineSfxId {
  const ids = deathLineSfxIds(cause);
  const index = pickVariant(ids.length, last.get(cause) ?? -1, random);
  last.set(cause, index);
  return ids[index] ?? `death.${cause}.1`;
}

/** Returns a picker that chooses a random line id per cause, never the previous one for that cause. */
export function createDeathSfxPicker(random: () => number = Math.random): DeathSfxPicker {
  const last = new Map<DeathCause, number>();
  return (cause) => pickWith(last, cause, random);
}

const sharedLast = new Map<DeathCause, number>();

/** Picks a random line id for a cause from one shared history, never the line it picked last for that cause. */
export function pickDeathSfx(cause: DeathCause, random: () => number = Math.random): DeathLineSfxId {
  return pickWith(sharedLast, cause, random);
}
