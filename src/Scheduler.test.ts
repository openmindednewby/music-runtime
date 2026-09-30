import { Scheduler } from './Scheduler';

describe('Scheduler', () => {
  it('throws on non-positive tempo', () => {
    expect(() => new Scheduler(0)).toThrow(RangeError);
    expect(() => new Scheduler(-50)).toThrow(RangeError);
    expect(() => new Scheduler(NaN)).toThrow(RangeError);
    expect(() => new Scheduler(Infinity)).toThrow(RangeError);
  });

  it('computes secondsPerTick at 70 BPM (DESERT PULSE)', () => {
    // 70 BPM, 4 ticks per beat -> 60 / 280 = 0.2142857... s/tick
    const s = new Scheduler(70);
    expect(s.secondsPerTick).toBeCloseTo(60 / 280, 6);
  });

  it('computes secondsPerTick at 130 BPM (NEON RUSH)', () => {
    // 130 BPM, 4 ticks per beat -> 60 / 520 ≈ 0.1153846 s/tick
    const s = new Scheduler(130);
    expect(s.secondsPerTick).toBeCloseTo(60 / 520, 6);
  });

  it('computes secondsPerBar = 16 * secondsPerTick', () => {
    const s = new Scheduler(120);
    expect(s.secondsPerBar).toBeCloseTo(s.secondsPerTick * 16, 6);
    expect(s.secondsPerBar).toBeCloseTo(2, 6); // 120 BPM, 16 ticks → 2s
  });

  it('starts at tick 0 / step 0', () => {
    const s = new Scheduler(120);
    expect(s.total).toBe(0);
    expect(s.step).toBe(0);
  });

  it('advance() increments total and reports step within bar', () => {
    const s = new Scheduler(120);
    const t1 = s.advance();
    expect(t1).toEqual({ total: 1, step: 1, barBoundary: false });
    for (let i = 0; i < 14; i++) {
      s.advance();
    }
    expect(s.total).toBe(15);
    expect(s.step).toBe(15);
    const t16 = s.advance(); // tick 16 -> step 0 (bar boundary)
    expect(t16).toEqual({ total: 16, step: 0, barBoundary: true });
  });

  it('wraps at the bar boundary every 16 ticks', () => {
    const s = new Scheduler(80);
    const boundaries: number[] = [];
    for (let i = 0; i < 64; i++) {
      const info = s.advance();
      if (info.barBoundary) {
        boundaries.push(info.total);
      }
    }
    expect(boundaries).toEqual([16, 32, 48, 64]);
  });

  it('reset() returns total to 0 without changing tempo', () => {
    const s = new Scheduler(100);
    s.advance();
    s.advance();
    s.advance();
    expect(s.total).toBe(3);
    s.reset();
    expect(s.total).toBe(0);
    expect(s.step).toBe(0);
    expect(s.secondsPerTick).toBeCloseTo(60 / 400, 6);
  });

  it('setTempo updates timing without resetting tick counter', () => {
    const s = new Scheduler(100);
    s.advance();
    s.advance();
    s.setTempo(200);
    expect(s.total).toBe(2);
    expect(s.secondsPerTick).toBeCloseTo(60 / 800, 6);
  });

  it('setTempo throws on invalid tempo', () => {
    const s = new Scheduler(100);
    expect(() => s.setTempo(0)).toThrow(RangeError);
    expect(() => s.setTempo(-10)).toThrow(RangeError);
  });
});
