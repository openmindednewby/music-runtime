export interface FormantBand {
  readonly hz: number;
  readonly q: number;
  readonly gain: number;
}

export type Vowel = readonly [FormantBand, FormantBand, FormantBand];

export interface VowelFrame {
  readonly at: number;
  readonly vowel: Vowel;
}

export interface PitchPoint {
  readonly at: number;
  readonly hz: number;
}

export interface Vibrato {
  readonly hz: number;
  readonly depthHz: number;
}

export interface FormantShape {
  readonly source?: 'sawtooth' | 'square';
  readonly pitch: readonly PitchPoint[];
  readonly vowels: readonly VowelFrame[];
  readonly vibrato?: Vibrato;
  readonly hardStop?: number;
}

const band = (hz: number, q: number, gain: number): FormantBand => ({ hz, q, gain });

/** F1/F2/F3 bands for the vowels the meme voices use. */
export const VOWELS = {
  aa: [band(800, 8, 1), band(1200, 9, 0.55), band(2500, 10, 0.25)],
  ah: [band(700, 8, 1), band(1100, 9, 0.5), band(2450, 10, 0.2)],
  oh: [band(500, 8, 1), band(850, 9, 0.5), band(2400, 10, 0.15)],
  oo: [band(320, 8, 1), band(800, 9, 0.35), band(2300, 10, 0.1)],
  uh: [band(600, 8, 1), band(1150, 9, 0.45), band(2400, 10, 0.15)],
  ee: [band(280, 8, 1), band(2250, 10, 0.5), band(2900, 10, 0.3)],
  mm: [band(250, 6, 1), band(1000, 8, 0.12), band(2200, 8, 0.05)],
} as const satisfies Readonly<Record<string, Vowel>>;

const SILENT = 0.0001;
const FORMANT_COUNT = 3;

export interface FormantRender {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
  readonly t: number;
  readonly dur: number;
  readonly pitch: number;
}

export interface FormantGraph {
  readonly oscs: readonly OscillatorNode[];
  readonly nodes: readonly AudioNode[];
}

function automate(param: AudioParam, points: readonly { at: number; v: number }[], t: number, dur: number): void {
  const [first, ...rest] = points;
  if (!first) {
    return;
  }
  param.setValueAtTime(first.v, t + first.at * dur);
  for (const p of rest) {
    param.linearRampToValueAtTime(p.v, t + p.at * dur);
  }
}

function sourceOsc(shape: FormantShape, r: FormantRender): OscillatorNode {
  const osc = r.ctx.createOscillator();
  osc.type = shape.source ?? 'sawtooth';
  automate(osc.frequency, shape.pitch.map((p) => ({ at: p.at, v: p.hz * r.pitch })), r.t, r.dur);
  return osc;
}

function vibratoLfo(shape: FormantShape, r: FormantRender, target: AudioParam): FormantGraph {
  if (!shape.vibrato) {
    return { oscs: [], nodes: [] };
  }
  const lfo = r.ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(shape.vibrato.hz, r.t);
  const depth = r.ctx.createGain();
  depth.gain.setValueAtTime(shape.vibrato.depthHz * r.pitch, r.t);
  lfo.connect(depth).connect(target);
  return { oscs: [lfo], nodes: [lfo, depth] };
}

function formantBank(shape: FormantShape, r: FormantRender, osc: OscillatorNode): AudioNode[] {
  const nodes: AudioNode[] = [];
  for (let i = 0; i < FORMANT_COUNT; i++) {
    const filter = r.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const level = r.ctx.createGain();
    const bands = shape.vowels.map((f) => ({ at: f.at, b: f.vowel[i] }));
    automate(filter.frequency, bands.map((f) => ({ at: f.at, v: f.b?.hz ?? 0 })), r.t, r.dur);
    automate(filter.Q, bands.map((f) => ({ at: f.at, v: f.b?.q ?? 1 })), r.t, r.dur);
    automate(level.gain, bands.map((f) => ({ at: f.at, v: f.b?.gain ?? 0 })), r.t, r.dur);
    osc.connect(filter).connect(level).connect(r.out);
    nodes.push(filter, level);
  }
  return nodes;
}

/** Wires a formant voice (source, vibrato, three vowel bands) into r.out. */
export function renderFormant(shape: FormantShape, r: FormantRender): FormantGraph {
  const osc = sourceOsc(shape, r);
  const vibrato = vibratoLfo(shape, r, osc.frequency);
  const bands = formantBank(shape, r, osc);
  return { oscs: [osc, ...vibrato.oscs], nodes: [osc, ...vibrato.nodes, ...bands] };
}

/** Gain envelope that holds the peak and cuts to 0 over hardStop seconds, else decays. */
export function shapeEnvelope(gain: AudioParam, peak: number, attack: number, t: number, dur: number, hardStop?: number): void {
  gain.setValueAtTime(SILENT, t);
  gain.linearRampToValueAtTime(peak, t + attack);
  if (hardStop !== undefined && hardStop > 0 && hardStop < dur - attack) {
    gain.setValueAtTime(peak, t + dur - hardStop);
    gain.linearRampToValueAtTime(0, t + dur);
    return;
  }
  gain.exponentialRampToValueAtTime(SILENT, t + dur);
}
