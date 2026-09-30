// Build-time helper: read BTV's config.js, fold each composition's tempo /
// root / scale / padFreqs / bassFilterCutoff / arpDecay / waveType from the
// linked CAMPAIGN_WORLDS entry, and emit the 40 playable EpTracks as JSON.
//
// Run: node scripts/extract-presets.cjs <out-path>
//
// This is a one-shot helper. The resulting JSON is checked into src/presets.ts.

'use strict';

const path = require('path');
const fs = require('fs');

global.window = {};
const cfgPath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'BeyondTheVoid',
  'config.js',
);
require(cfgPath);
const CFG = global.window.CFG;
if (!CFG) {
  throw new Error('failed to load BTV config.js');
}

const worldByComposition = new Map();
for (const world of CFG.CAMPAIGN_WORLDS || []) {
  if (world && world.music && world.music.composition) {
    worldByComposition.set(world.music.composition, {
      worldId: world.id,
      tempo: world.music.tempo,
      root: world.music.root,
      scale: world.music.scale,
      padFreqs: world.music.padFreqs,
      bassFilterCutoff: world.music.bassFilterCutoff,
      arpDecay: world.music.arpDecay,
      waveType: world.music.waveType,
    });
  }
}

const DEFAULTS = {
  tempo: 120,
  root: 55,
  scale: [1, 1.122, 1.26, 1.498, 1.682],
  padFreqs: [110, 110.5, 165],
  bassFilterCutoff: 400,
  arpDecay: 0.1,
  waveType: 'sine',
};

const VALID_WAVES = new Set(['sine', 'square', 'sawtooth', 'triangle']);

const tracks = [];
for (const c of CFG.COMPOSITIONS || []) {
  if (!c.beat || !c.bass || !c.arp) {
    continue;
  }
  const linked = worldByComposition.get(c.name);
  const tempo = c.tempo != null ? c.tempo : (linked ? linked.tempo : DEFAULTS.tempo);
  const root = c.root != null ? c.root : (linked ? linked.root : DEFAULTS.root);
  const scale = c.scale != null ? c.scale : (linked ? linked.scale : DEFAULTS.scale);
  const padFreqs = c.padFreqs != null ? c.padFreqs : (linked ? linked.padFreqs : DEFAULTS.padFreqs);
  const bassFilterCutoff =
    c.bassFilterCutoff != null
      ? c.bassFilterCutoff
      : (linked && linked.bassFilterCutoff != null ? linked.bassFilterCutoff : DEFAULTS.bassFilterCutoff);
  const arpDecay = c.arpDecay != null ? c.arpDecay : (linked ? linked.arpDecay : DEFAULTS.arpDecay);
  let waveType = c.waveType != null ? c.waveType : (linked ? linked.waveType : DEFAULTS.waveType);
  if (!VALID_WAVES.has(waveType)) {
    waveType = DEFAULTS.waveType;
  }

  if (!Array.isArray(padFreqs) || padFreqs.length < 1) {
    throw new Error('composition ' + c.name + ' has no padFreqs');
  }
  const pf3 = [
    padFreqs[0],
    padFreqs[1] != null ? padFreqs[1] : padFreqs[0] * 1.014,
    padFreqs[2] != null ? padFreqs[2] : padFreqs[0] * 1.5,
  ];

  if (c.beat.length !== 16) {
    throw new Error('composition ' + c.name + ' beat length ' + c.beat.length + ' !== 16');
  }
  if (c.bass.length !== 16) {
    throw new Error('composition ' + c.name + ' bass length ' + c.bass.length + ' !== 16');
  }
  if (c.arp.length !== 16) {
    throw new Error('composition ' + c.name + ' arp length ' + c.arp.length + ' !== 16');
  }
  for (const v of c.bass) {
    if (!Number.isInteger(v) || v < 0 || v > 5) {
      throw new Error('composition ' + c.name + ' bass value ' + v + ' not in 0..5');
    }
  }
  for (const v of c.arp) {
    if (!Number.isInteger(v) || v < 0 || v > 5) {
      throw new Error('composition ' + c.name + ' arp value ' + v + ' not in 0..5');
    }
  }

  tracks.push({
    format: 'eptrack/1',
    name: c.name,
    desc: c.desc,
    tempo,
    root,
    scale,
    waveType,
    beat: c.beat,
    bass: c.bass,
    arp: c.arp,
    mix: c.mix,
    padFreqs: pf3,
    bassFilterCutoff,
    arpDecay,
  });
}

const names = new Set();
for (const t of tracks) {
  if (names.has(t.name)) {
    throw new Error('duplicate composition name: ' + t.name);
  }
  names.add(t.name);
}

const out = process.argv[2];
const json = JSON.stringify(tracks, null, 2);
if (out) {
  fs.writeFileSync(out, json);
  process.stderr.write('wrote ' + tracks.length + ' tracks -> ' + out + '\n');
} else {
  process.stdout.write(json);
}
