import { presets, getPreset } from './presets';
import type { EpTrack } from './types';

describe('presets', () => {
  it('ships exactly 40 tracks (BTV CFG.COMPOSITIONS minus null-pattern entries)', () => {
    expect(presets).toHaveLength(40);
  });

  it('every entry declares format eptrack/1', () => {
    for (const t of presets) {
      expect(t.format).toBe('eptrack/1');
    }
  });

  it('every entry has all required fields populated', () => {
    const requiredKeys: Array<keyof EpTrack> = [
      'format',
      'name',
      'desc',
      'tempo',
      'root',
      'scale',
      'waveType',
      'beat',
      'bass',
      'arp',
      'mix',
      'padFreqs',
      'bassFilterCutoff',
      'arpDecay',
    ];
    for (const t of presets) {
      for (const k of requiredKeys) {
        expect(t[k]).toBeDefined();
      }
    }
  });

  it('no two entries share a name', () => {
    const names = presets.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every beat lane has exactly 16 steps', () => {
    for (const t of presets) {
      expect(t.beat.length).toBe(16);
    }
  });

  it('every bass lane has exactly 16 steps with values 0..5', () => {
    for (const t of presets) {
      expect(t.bass.length).toBe(16);
      for (const v of t.bass) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it('every arp lane has exactly 16 steps with values 0..5', () => {
    for (const t of presets) {
      expect(t.arp.length).toBe(16);
      for (const v of t.arp) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it('every track has positive tempo, root, and bassFilterCutoff', () => {
    for (const t of presets) {
      expect(t.tempo).toBeGreaterThan(0);
      expect(t.root).toBeGreaterThan(0);
      expect(t.bassFilterCutoff).toBeGreaterThan(0);
      expect(t.arpDecay).toBeGreaterThan(0);
    }
  });

  it('every padFreqs is a 3-tuple of positive numbers', () => {
    for (const t of presets) {
      expect(t.padFreqs.length).toBe(3);
      for (const f of t.padFreqs) {
        expect(f).toBeGreaterThan(0);
      }
    }
  });

  it('every mix has all 6 channels with non-negative values', () => {
    for (const t of presets) {
      expect(t.mix.bass).toBeGreaterThanOrEqual(0);
      expect(t.mix.pad).toBeGreaterThanOrEqual(0);
      expect(t.mix.arp).toBeGreaterThanOrEqual(0);
      expect(t.mix.kick).toBeGreaterThanOrEqual(0);
      expect(t.mix.hat).toBeGreaterThanOrEqual(0);
      expect(t.mix.reverb).toBeGreaterThanOrEqual(0);
    }
  });

  it('every waveType is one of the 4 Web Audio types', () => {
    const allowed = new Set(['sine', 'square', 'sawtooth', 'triangle']);
    for (const t of presets) {
      expect(allowed.has(t.waveType)).toBe(true);
    }
  });

  it('"DESERT PULSE" carries the world-1 (Desert Mirage) folded data', () => {
    const t = getPreset('DESERT PULSE');
    expect(t).toBeDefined();
    if (!t) {
      return;
    }
    expect(t.tempo).toBe(70);
    expect(t.root).toBe(55);
    expect(t.scale).toEqual([1, 1.2, 1.333, 1.5, 1.8]);
    expect(t.waveType).toBe('sine');
    expect(t.bassFilterCutoff).toBe(250);
    expect(t.arpDecay).toBe(0.25);
  });

  it('"NEON RUSH" carries the world-7 (Cyberpunk Neon) folded data', () => {
    const t = getPreset('NEON RUSH');
    expect(t).toBeDefined();
    if (!t) {
      return;
    }
    expect(t.tempo).toBe(130);
    expect(t.waveType).toBe('sawtooth');
    expect(t.padFreqs).toEqual([130.81, 196, 261.63]);
  });

  it('getPreset returns undefined for unknown names', () => {
    expect(getPreset('NOT A REAL TRACK')).toBeUndefined();
  });
});

describe('EpTrack JSON round-trip', () => {
  it('JSON.parse(JSON.stringify(track)) deep-equals the original (no NaN, functions, or circular refs)', () => {
    for (const t of presets) {
      const cloned = JSON.parse(JSON.stringify(t));
      expect(cloned).toEqual(t);
    }
  });

  it('JSON output for DESERT PULSE matches the documented .eptrack/1 shape', () => {
    const t = getPreset('DESERT PULSE');
    expect(t).toBeDefined();
    if (!t) {
      return;
    }
    const json = JSON.stringify(t);
    const back = JSON.parse(json);
    expect(back.format).toBe('eptrack/1');
    expect(back.name).toBe('DESERT PULSE');
    expect(Array.isArray(back.beat)).toBe(true);
    expect(Array.isArray(back.bass)).toBe(true);
    expect(Array.isArray(back.arp)).toBe(true);
  });
});
