import { parseBeatFlag, parseBeatLane } from './PatternParser';

describe('parseBeatFlag', () => {
  it('decodes "KH" as kick + hat', () => {
    expect(parseBeatFlag('KH')).toEqual({ kick: true, hat: true, clap: false, shaker: false });
  });

  it('decodes "." as all-false', () => {
    expect(parseBeatFlag('.')).toEqual({ kick: false, hat: false, clap: false, shaker: false });
  });

  it('decodes "SH" as shaker + hat', () => {
    expect(parseBeatFlag('SH')).toEqual({ kick: false, hat: true, clap: false, shaker: true });
  });

  it('decodes "K." as kick (filler ignored)', () => {
    expect(parseBeatFlag('K.')).toEqual({ kick: true, hat: false, clap: false, shaker: false });
  });

  it('decodes ".H" as hat (filler ignored)', () => {
    expect(parseBeatFlag('.H')).toEqual({ kick: false, hat: true, clap: false, shaker: false });
  });

  it('decodes "CH" as clap + hat', () => {
    expect(parseBeatFlag('CH')).toEqual({ kick: false, hat: true, clap: true, shaker: false });
  });

  it('decodes "HA" (open hi-hat alias) as just hat', () => {
    expect(parseBeatFlag('HA')).toEqual({ kick: false, hat: true, clap: false, shaker: false });
  });

  it('decodes a full kit "KHCS" as all true', () => {
    expect(parseBeatFlag('KHCS')).toEqual({ kick: true, hat: true, clap: true, shaker: true });
  });

  it('throws on empty string', () => {
    expect(() => parseBeatFlag('')).toThrow(/empty/);
  });

  it('throws on unknown character', () => {
    expect(() => parseBeatFlag('Q')).toThrow(/invalid/);
  });

  it('throws on partially-valid string with one unknown char', () => {
    expect(() => parseBeatFlag('KX')).toThrow(/invalid/);
  });

  it('throws on non-string input', () => {
    expect(() => parseBeatFlag(42 as unknown as string)).toThrow(TypeError);
    expect(() => parseBeatFlag(null as unknown as string)).toThrow(TypeError);
    expect(() => parseBeatFlag(undefined as unknown as string)).toThrow(TypeError);
  });
});

describe('parseBeatLane', () => {
  it('decodes a 16-step lane', () => {
    const lane = ['KH', '.', 'H', '.', 'K.', '.', 'SH', '.', 'KH', '.', 'H', '.', 'K.', '.', 'CH', '.'];
    const decoded = parseBeatLane(lane);
    expect(decoded).toHaveLength(16);
    expect(decoded[0]).toEqual({ kick: true, hat: true, clap: false, shaker: false });
    expect(decoded[1]).toEqual({ kick: false, hat: false, clap: false, shaker: false });
    expect(decoded[14]).toEqual({ kick: false, hat: true, clap: true, shaker: false });
  });
});
