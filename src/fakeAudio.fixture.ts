import { SfxBus } from './SfxBus';

export interface FakeParam {
  value: number;
  setValueAtTime: jest.Mock;
  linearRampToValueAtTime: jest.Mock;
  exponentialRampToValueAtTime: jest.Mock;
}

export interface FakeCtx {
  currentTime: number;
  sampleRate: number;
  createGain: jest.Mock;
  createOscillator: jest.Mock;
  createBufferSource: jest.Mock;
  createBuffer: jest.Mock;
  createBiquadFilter: jest.Mock;
}

const param = (value: number): FakeParam => ({
  value,
  setValueAtTime: jest.fn(),
  linearRampToValueAtTime: jest.fn(),
  exponentialRampToValueAtTime: jest.fn(),
});

const node = <T extends object>(extra: T): T & { connect: jest.Mock } => {
  const n = { ...extra, connect: jest.fn() };
  n.connect.mockImplementation((dst: unknown) => dst);
  return n;
};

export function fakeCtx(): FakeCtx {
  return {
    currentTime: 0,
    sampleRate: 8000,
    createGain: jest.fn(() => node({ gain: param(1) })),
    createOscillator: jest.fn(() => node({ type: 'sine', frequency: param(440), start: jest.fn(), stop: jest.fn() })),
    createBufferSource: jest.fn(() => node({ buffer: null, start: jest.fn(), stop: jest.fn() })),
    createBuffer: jest.fn((_c: number, len: number) => ({ getChannelData: (): Float32Array => new Float32Array(len) })),
    createBiquadFilter: jest.fn(() => node({ type: 'lowpass', frequency: param(1000) })),
  };
}

/** A bus whose graph is already built on a fake context, as if init() had run. */
export function initedBus(): { bus: SfxBus; ctx: FakeCtx } {
  const ctx = fakeCtx();
  const bus = new SfxBus();
  bus.ctx = ctx as unknown as AudioContext;
  bus.master = ctx.createGain() as unknown as GainNode;
  bus.musicGain = ctx.createGain() as unknown as GainNode;
  bus.sfxGain = ctx.createGain() as unknown as GainNode;
  ctx.createGain.mockClear();
  return { bus, ctx };
}

export interface MemoryKv {
  readonly data: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function memoryKv(): MemoryKv {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v): void => void data.set(k, v) };
}
