# @dloizides/music-runtime

Procedural music engine extracted from [Beyond the Void](https://btv.eisaipollis.com). Web Audio synth + 16-step scheduler + 40 named compositions, framework-agnostic, zero runtime dependencies. Phase 1 of the EisaiPollis Music Studio plan — every game in the portfolio (BTV, Morphe, Solid State, Keyboard Piano, future titles) loads the same `.eptrack/1` JSON files and they sound identical.

## Usage

```ts
import { MusicEngine, presets, getPreset } from '@dloizides/music-runtime';

const engine = new MusicEngine();

// Browser autoplay policy: init() must be called from a user-gesture handler.
button.addEventListener('click', async () => {
  await engine.init();
  engine.load(getPreset('DESERT PULSE')!);
  engine.play();
});

// Reactive hooks (BTV uses these; other games can ignore):
engine.updSpeed(playerSpeed);
engine.updStreak(comboTier);
engine.updStage(currentStageIndex);

// Speed-boost overlay:
engine.startBoost();
engine.stopBoost();

// Sidechain duck on each SFX hit:
engine.duckBass();

// Build / silence / drop / elevated state machine:
engine.triggerDrop();

// Mute (persisted to localStorage):
engine.setMute(true);
engine.toggleMute();      // returns new state
engine.isMuted();
engine.isPlaying();

// Tear down:
engine.stop();
engine.dispose();
```

## Volume, mute and SFX (1.1)

The package stays dependency-free: volume prefs persist through a `VolumeStorage` port you can back with your own settings store.

```ts
import { MusicEngine, SfxBus, AudioMixer, AudioChannel, SfxPlayer, SFX_PRESETS, localVolumeStorage } from '@dloizides/music-runtime';

const bus = new SfxBus();
const mixer = new AudioMixer(bus, { storage: localVolumeStorage() }); // defaults: music 3, sfx 3 of 5, unmuted
const engine = new MusicEngine(bus);
mixer.attach(engine);                       // mute now also stops music scheduling

// inside the first user gesture:
bus.init();
mixer.apply();                              // the graph is lazy; re-apply gains once it exists

const sfx = new SfxPlayer(bus, mixer, { bank: SFX_PRESETS, cooldownMs: { pickup: 60 } });
sfx.play('jump');                           // false when muted, sfx step 0, cooling down, or no AudioContext
mixer.setStep(AudioChannel.Music, 4);       // false = not persisted; the change still applies this session
mixer.toggleMute();
```

`localVolumeStorage` stores `{ music, sfx, muted }` as JSON under `epmr_volume_v1`; with nothing there it imports the 1.0 `epmr_music_mute` flag. To store prefs elsewhere, pass any `{ load(): VolumePrefs | null; save(p): boolean }`.

## The `.eptrack/1` format

Every `EpTrack` is fully self-describing — all the synth's per-track parameters live on the object, so a track is portable across games:

```json
{
  "format": "eptrack/1",
  "name": "DESERT PULSE",
  "desc": "Hypnotic 70 BPM — slow kick, deep bass drone, sparse arp",
  "tempo": 70,
  "root": 55,
  "scale": [1, 1.2, 1.333, 1.5, 1.8],
  "waveType": "sine",
  "beat":  ["KH", ".", "H", ".", "K.", ".", "SH", ".", "KH", ".", "H", ".", "K.", ".", "CH", "."],
  "bass":  [1, 0, 0, 3, 0, 0, 5, 0, 1, 0, 0, 4, 0, 0, 3, 0],
  "arp":   [0, 0, 5, 0, 0, 3, 0, 0, 0, 0, 4, 0, 0, 5, 0, 0],
  "mix":   { "bass": 140, "pad": 160, "arp": 80, "kick": 80, "hat": 40, "reverb": 180 },
  "padFreqs": [110, 110.5, 165],
  "bassFilterCutoff": 250,
  "arpDecay": 0.25
}
```

### Beat flags

Single-character flags concatenated:

| Flag | Drum |
|------|------|
| `K`  | kick |
| `H`  | hi-hat |
| `C`  | clap |
| `S`  | shaker |
| `A`  | open hi-hat (alias for `H`) |
| `.`  | filler / rest |

Examples: `KH` = kick + hat. `SH` = shaker + hat. `K.` = kick alone (the `.` is filler so 2-character columns line up). `.` = rest.

### Bass / arp lanes

Both lanes are 16 ints, where `0` is a rest and `1..5` is a scale degree (mapped via `track.scale`). Bass plays at the root octave; arp at the octave above.

## Presets

40 compositions ship in `presets`. The 10 BTV "campaign world" tracks have their per-world `tempo`/`root`/`scale`/`padFreqs`/etc. folded directly onto them, so loading `DESERT PULSE` plays the desert world's full sound without needing world metadata:

| World | Composition |
|-------|-------------|
| Desert Mirage | `DESERT PULSE` |
| Sakura Drift | `SAKURA RAIN` |
| Void Meditation | `VOID DRONE` |
| Cosmic Odyssey | `COSMIC DRIVE` |
| Transcendence | `TRANSCEND` |
| Abyssal Deep | `ABYSS` |
| Cyberpunk Neon | `NEON RUSH` |
| Volcanic Abyss | `VOLCANIC FURY` |
| Frozen Expanse | `FROZEN CRYSTAL` |
| Synthesis Grid | `DIGITAL SYNTHESIS` |

The remaining 30 are non-campaign extras: 6 reference-inspired (`DERVISH`, `CALM NIGHT`, `DEEP COSMOS`, `BEETHOVEN`, `ZEN GARDEN`, `GALACTIC`, `DEEP HOUSE`), 3 recipe fragments (`RECIPE: PULSE/MELODY/GROOVE`), the 5-section `GREAT LOVE` ballad, 5 deep-meditation tracks (`FORGOTTEN EDGES`, `VOID MEDITATION`, `DEEP STILLNESS`, `SUBMERGED`, `FORGOTTEN LIGHT`), 6 flute-family tracks (`SPIRIT FLUTE`, `WIND CALLER`, `MOUNTAIN SONG`, `FOREST WHISPER`, `TEMPLE BELLS`, `DUNE FLUTE`), and 5 misc (`RITUAL SLOW`, `BREAKBEAT`, `CRYSTAL CAVE`, `TECHNO GRID`).

## Why no React, no DOM dependency?

Phaser (Morphe), vanilla JS (BTV, Keyboard Piano), Capacitor WebViews, and Godot HTML5 exports must all be able to `npm install` this and consume it. Plain TS + Web Audio is the smallest common surface that supports them all. The Studio web app (Phase 3) will live in its own React+Vite package and depend on this one — the runtime stays UI-free.

## License

MIT
