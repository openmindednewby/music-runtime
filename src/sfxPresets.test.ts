import { SFX_PRESETS } from './sfxPresets';
import type { SfxVoice } from './SfxPlayer';

const WAVES = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];

describe('sfxPresets acceptance', () => {
  it('AC-10', () => {
    expect(Object.keys(SFX_PRESETS).sort()).toEqual(['death', 'jump', 'nitro', 'pickup', 'shockwave', 'slam']);
    const voices: SfxVoice[] = Object.values(SFX_PRESETS).flatMap(
      (v) => (Array.isArray(v) ? v : [v]) as SfxVoice[],
    );
    expect(voices.length).toBeGreaterThanOrEqual(6);
    for (const v of voices) {
      expect(v.dur).toBeGreaterThan(0);
      expect(v.dur).toBeLessThanOrEqual(1.5);
      expect(v.gain).toBeGreaterThan(0);
      expect(v.gain).toBeLessThanOrEqual(1);
      expect(WAVES).toContain(v.wave);
    }
  });
});
