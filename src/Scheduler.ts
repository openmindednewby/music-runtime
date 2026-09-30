// 16-step beat clock. Pure logic — no Web Audio dependency, so it's
// trivially testable in jsdom.
//
// Math: at BPM `b`, one beat = 60 / b seconds. BTV maps each beat to
// 4 sixteenth-step ticks, so one tick = 60 / (b * 4) = 15 / b seconds.
// 16 ticks per bar, so bar duration = 60 * 16 / (b * 4) = 240 / b seconds.

import { STEPS_PER_BAR } from './tuning';

const SECONDS_PER_MINUTE = 60;
const TICKS_PER_BEAT = 4;

export interface SchedulerTickInfo {
  /** Total ticks since play() — monotonically increasing. */
  total: number;
  /** Step index within the current bar (0..STEPS_PER_BAR-1). */
  step: number;
  /** True when the tick is the first step of a new bar. */
  barBoundary: boolean;
}

export class Scheduler {
  private _tempo: number;
  private _ticks: number;

  constructor(tempo: number) {
    if (!Number.isFinite(tempo) || tempo <= 0) {
      throw new RangeError(`Scheduler: tempo must be > 0, got ${tempo}`);
    }
    this._tempo = tempo;
    this._ticks = 0;
  }

  /** Seconds per tick — useful for setTimeout/setInterval scheduling. */
  get secondsPerTick(): number {
    return SECONDS_PER_MINUTE / (this._tempo * TICKS_PER_BEAT);
  }

  /** Seconds per bar (16 ticks). */
  get secondsPerBar(): number {
    return this.secondsPerTick * STEPS_PER_BAR;
  }

  /** Current cumulative tick count. */
  get total(): number {
    return this._ticks;
  }

  /** Current step within the bar (0..STEPS_PER_BAR-1). */
  get step(): number {
    return this._ticks % STEPS_PER_BAR;
  }

  /** Update tempo without resetting the tick counter. */
  setTempo(tempo: number): void {
    if (!Number.isFinite(tempo) || tempo <= 0) {
      throw new RangeError(`Scheduler: tempo must be > 0, got ${tempo}`);
    }
    this._tempo = tempo;
  }

  /** Reset the tick counter to 0. */
  reset(): void {
    this._ticks = 0;
  }

  /**
   * Advance one tick. Returns the resulting tick info. The
   * `barBoundary` flag is true when this advance lands on step 0.
   */
  advance(): SchedulerTickInfo {
    this._ticks += 1;
    const step = this._ticks % STEPS_PER_BAR;
    return { total: this._ticks, step, barBoundary: step === 0 };
  }
}
