# Changelog

## 1.4.0 — 2026-10-21

GAME-SFX-1 "Shared meme death sounds". Additive; existing ids, including `death`, play exactly as in 1.3.0.

- New voice kind `SfxFormantVoice` (`wave: 'formant'`): a sawtooth or square source through three formant bands, driven by data: `pitch` points, a `vowels` sequence (F1/F2/F3 per frame, glided), optional `vibrato`, optional `hardStop` (holds the peak, then cuts to 0). `VOWELS` holds aa, ah, oh, oo, uh, ee, mm. Noise consonants are ordinary `noise` voices in the same layer.
- `DeathCause` (Crash, Fall, Burn, Zap, Slip, Buried) and `DEATH_CAUSE_SFX`, a bank keyed `death.<cause>` via `deathCauseSfxId(cause)`: Crash = FAAHHH, Fall = dropping "aaaa", Burn = "ow-ow-ow", Zap = "bzzt-uh", Slip = "whoa-oops", Buried = muffled "mmph". Each is at most 1 s with two pitch variants. Merge with `SFX_PRESETS` into one `SfxPlayer` bank.
- `withPitch(layer, factor)` scales every tone and formant pitch in a layer.

## 1.3.0 — 2026-10-18

GAME-FEEL-1 "Make games feel well made", phase 2 (GF-28 audio latency, GF-29 repeated SFX). Additive; with no new option set, a sound plays exactly as in 1.2.0.

- `SfxPlayerOptions.pitchJitter?` (fraction, e.g. `0.04` = +/-4%, clamped to 0..`MAX_PITCH_JITTER`): each play scales the voice pitch by a random factor, multiplied onto `play(id, { pitch })`. `random?` injects the source (default `Math.random`).
- Bank entries may be `{ variants: [...] }` (each a voice or a layered voice list): each play picks one, never the same one twice in a row. Helpers `jitterPitch` and `pickVariant` are exported.
- `SfxBus` creates its `AudioContext` with `latencyHint: 'interactive'`; `new SfxBus({ onLatency })` reports `{ baseMs, outputMs }` once per created context (null where the browser has no field); `bus.latency()` reads it any time. A throwing `onLatency` does not break `init()`.

## 1.2.0 — 2026-10-08

Additive; with neither option set, behaviour is identical to 1.1.1 (pinned by `SfxPlayer.delay.test.ts` and `volume.levels.test.ts`).

- `SfxVoice.delay?` (seconds, clamped to 0..`MAX_SFX_DURATION`, non-finite -> 0): a voice in a layered entry starts that long after `play()`, so arpeggios and bell partials can stagger.
- `AudioMixerOptions.levels?: VolumeLevels`: gain per step replacing the 0..5 squared curve; step count = list length (e.g. `[0, 0.25, 0.5, 0.9]` = steps 0..3). Stored and set steps clamp to the list; `mixer.maxStep()` returns the highest step.
- New helpers `maxStep(levels?)`, `clampStepTo(step, max)`, `levelToGain(step, levels)`. `clampStep` and `stepToGain` keep their 1.1.1 signatures (safe as `.map` callbacks).

## 1.1.1 — 2026-09-30

- `AudioChannel` is now a regular `enum`. 1.1.0 published a `declare const enum`, which consumers compiled with `isolatedModules` cannot use. `npm run test:consumer` (also run by `prepublishOnly`) type-checks a consumer against the built `dist` with `isolatedModules: true`.
- `SfxVoice` is a discriminated union: `SfxToneVoice` (needs `freq`, optional `freqEnd`) and `SfxNoiseVoice` (`wave: 'noise'`, no `freq`).
- `SfxPlayer` caps every voice at `MAX_SFX_DURATION` (1.5 s), disconnects its nodes when the voice ends, and reuses one noise buffer per duration.
- A throwing `AudioMixer` subscriber no longer skips the other listeners or the save.
- `repository.url` normalised by `npm pkg fix`.

## 1.1.0 — 2026-09-30

Published as `@dloizides/music-runtime` (1.0.0 was never published under `@eisaipollis`). Additive; the 1.0 API is unchanged.

- `AudioChannel` (`Music`, `Sfx`) and volume steps 0..5: `clampStep` (round, clamp, NaN -> 3), `stepToGain` (squared curve, 0 -> 0, 5 -> 1), `DEFAULT_VOLUME_STEP = 3`.
- `VolumeStorage` port plus `localVolumeStorage(key = 'epmr_volume_v1', store?)`. With no stored prefs it reads the 1.0 `epmr_music_mute=1` key as muted.
- `AudioMixer(bus, { storage?, defaults? })`: mute drives the master gain, steps drive `musicGain` / `sfxGain`; `setStep` / `setMuted` return `false` when the save failed but keep the change for the session; `attach(engine)` makes the mixer drive `MusicEngine.setMute`; `subscribe`; `apply()` after `bus.init()`.
- `CooldownGate<Id>(cooldownMs)`: per-id cooldown, clock injected.
- `SfxPlayer<Id>(bus, mixer, { bank, cooldownMs?, now? })`: oscillator / noise voices with an attack-decay envelope, optional pitch sweep and filter; `play` returns `false` with no context, when muted, at sfx step 0, or while cooling down.
- `SFX_PRESETS`: starting voices for `jump`, `slam`, `shockwave`, `nitro`, `pickup`, `death`.

## 1.0.0 — 2026-05-05

- Initial release.
- `MusicEngine` ported from Beyond the Void's `class Music`. Bass drone with LFO + lowpass, dual + detuned-pad chain with slow filter LFO, BPM-synced delay, runtime modulation hooks (`updSpeed`, `updStreak`, `updStage`), boost layer, drop/build state machine, fade-in/out stop, mute persistence via `localStorage`.
- `SfxBus` minimal port of BTV's `class SFX` — only the music-routing surface (`musicDest`, reverb chain). Created internally if not provided.
- `Scheduler` 16-step beat clock with bar-boundary detection.
- `PatternParser` decodes BTV's beat-flag strings (`KH`, `K.`, `SH`, `.`, etc.) into `{ kick, hat, clap, shaker }`.
- `degreeToHz` pure frequency-math helper for scale-degree-to-Hz conversion.
- `presets` 40 named compositions extracted from BTV's `CFG.COMPOSITIONS`. Per-world tempo / root / scale / padFreqs / bassFilterCutoff / arpDecay / waveType folded onto each linked track. Non-world tracks get reasonable defaults (tempo 120, root 55, major-pentatonic-ish scale, sine wave).
- All tuning constants (`CFG_BASS_GAIN`, `BASS_LFO_DEPTH`, `PAD_FILTER_BASE`, `DELAY_FEEDBACK`, etc.) hoisted from BTV's `window.*` globals into `tuning.ts` exports.
