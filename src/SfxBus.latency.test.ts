import { SfxBus } from './SfxBus';
import { fakeCtx } from './fakeAudio.fixture';

interface LatencyCtx extends ReturnType<typeof fakeCtx> {
  state: string;
  destination: object;
  baseLatency?: number;
  outputLatency?: number;
  createDelay: jest.Mock;
}

function installCtor(latency: { baseLatency?: number; outputLatency?: number }): jest.Mock {
  const Ctor = jest.fn((): LatencyCtx => {
    const ctx = fakeCtx();
    return {
      ...ctx,
      ...latency,
      state: 'running',
      destination: {},
      createDelay: jest.fn(() => ({ delayTime: { value: 0 }, connect: jest.fn((d: unknown) => d), disconnect: jest.fn() })),
    };
  });
  (window as unknown as { AudioContext: unknown }).AudioContext = Ctor;
  return Ctor;
}

afterEach(() => {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
});

describe('SfxBus.init', () => {
  it('creates the AudioContext with the interactive latency hint', () => {
    const Ctor = installCtor({ baseLatency: 0.005, outputLatency: 0.02 });

    new SfxBus().init();

    expect(Ctor).toHaveBeenCalledWith({ latencyHint: 'interactive' });
  });

  it('with onLatency set, reports base and output latency once in milliseconds', () => {
    installCtor({ baseLatency: 0.005, outputLatency: 0.02 });
    const onLatency = jest.fn();
    const bus = new SfxBus({ onLatency });

    bus.init();
    bus.init();

    expect(onLatency).toHaveBeenCalledTimes(1);
    expect(onLatency).toHaveBeenCalledWith({ baseMs: 5, outputMs: 20 });
  });

  it('when the browser exposes no latency fields, reports null for each', () => {
    installCtor({});
    const onLatency = jest.fn();

    new SfxBus({ onLatency }).init();

    expect(onLatency).toHaveBeenCalledWith({ baseMs: null, outputMs: null });
  });

  it('with a throwing onLatency, still builds the graph', () => {
    installCtor({ baseLatency: 0.005 });
    const bus = new SfxBus({ onLatency: () => { throw new Error('boom'); } });

    bus.init();

    expect(bus.sfxGain).not.toBeNull();
  });
});

describe('SfxBus.latency', () => {
  it('before init, returns null', () => {
    const bus = new SfxBus();

    const latency = bus.latency();

    expect(latency).toBeNull();
  });
});
