// Reads preset JSON and emits a TypeScript array literal for embedding.
'use strict';
const fs = require('fs');
const path = require('path');

const inFile = process.argv[2];
const outFile = process.argv[3];
if (!inFile) {
  process.stderr.write('usage: format-presets.cjs <in.json> [out.ts]\n');
  process.exit(2);
}
const tracks = JSON.parse(fs.readFileSync(inFile, 'utf8'));

function escSingle(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function fmt(t) {
  const beat = JSON.stringify(t.beat);
  const bass = JSON.stringify(t.bass);
  const arp = JSON.stringify(t.arp);
  const scale = JSON.stringify(t.scale);
  const padFreqs = JSON.stringify(t.padFreqs);
  const mix = `{ bass: ${t.mix.bass}, pad: ${t.mix.pad}, arp: ${t.mix.arp}, kick: ${t.mix.kick}, hat: ${t.mix.hat}, reverb: ${t.mix.reverb} }`;
  return `  {
    format: 'eptrack/1',
    name: '${escSingle(t.name)}',
    desc: '${escSingle(t.desc)}',
    tempo: ${t.tempo},
    root: ${t.root},
    scale: ${scale},
    waveType: '${t.waveType}',
    beat: ${beat},
    bass: ${bass},
    arp: ${arp},
    mix: ${mix},
    padFreqs: ${padFreqs} as readonly [number, number, number],
    bassFilterCutoff: ${t.bassFilterCutoff},
    arpDecay: ${t.arpDecay},
  }`;
}

const body = tracks.map(fmt).join(',\n');
const _out = outFile;
const result =
  '// AUTO-GENERATED tail of presets.ts. Do not edit by hand — regenerate via\n' +
  '// node scripts/extract-presets.cjs <out.json> && node scripts/format-presets.cjs <out.json>.\n' +
  body + ',\n';

if (_out) {
  fs.writeFileSync(_out, result);
  process.stderr.write('wrote ' + path.basename(_out) + '\n');
} else {
  process.stdout.write(result);
}
