# Changelog

## 1.1.0 — 2026-09-30

Additive; the 1.0 API is unchanged.

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
