import { degreeToHz } from './frequency';

const MAJOR_PENTATONIC = [1, 1.122, 1.26, 1.498, 1.682];

describe('degreeToHz', () => {
  it('returns root for degree 1', () => {
    expect(degreeToHz(55, MAJOR_PENTATONIC, 1)).toBeCloseTo(55, 6);
  });

  it('returns root * scale[2] for degree 3 (the canonical example)', () => {
    // 55 * 1.26 = 69.3
    expect(degreeToHz(55, MAJOR_PENTATONIC, 3)).toBeCloseTo(69.3, 6);
  });

  it('returns null for degree 0 (rest)', () => {
    expect(degreeToHz(55, MAJOR_PENTATONIC, 0)).toBeNull();
  });

  it('handles octave shifts (×2 per octave)', () => {
    expect(degreeToHz(55, MAJOR_PENTATONIC, 1, 1)).toBeCloseTo(110, 6);
    expect(degreeToHz(55, MAJOR_PENTATONIC, 1, -1)).toBeCloseTo(27.5, 6);
    expect(degreeToHz(55, MAJOR_PENTATONIC, 3, 2)).toBeCloseTo(69.3 * 4, 6);
  });

  it('wraps degree past scale length (degree 6 of a 5-note scale = degree 1)', () => {
    expect(degreeToHz(55, MAJOR_PENTATONIC, 6)).toBeCloseTo(55, 6);
  });

  it('throws on non-positive root', () => {
    expect(() => degreeToHz(0, MAJOR_PENTATONIC, 1)).toThrow(RangeError);
    expect(() => degreeToHz(-50, MAJOR_PENTATONIC, 1)).toThrow(RangeError);
    expect(() => degreeToHz(NaN, MAJOR_PENTATONIC, 1)).toThrow(RangeError);
  });

  it('throws on empty scale', () => {
    expect(() => degreeToHz(55, [], 1)).toThrow(RangeError);
  });

  it('throws on non-finite degree', () => {
    expect(() => degreeToHz(55, MAJOR_PENTATONIC, NaN)).toThrow(RangeError);
    expect(() => degreeToHz(55, MAJOR_PENTATONIC, Infinity)).toThrow(RangeError);
  });

  it('throws on non-integer or negative degree', () => {
    expect(() => degreeToHz(55, MAJOR_PENTATONIC, 1.5)).toThrow(RangeError);
    expect(() => degreeToHz(55, MAJOR_PENTATONIC, -1)).toThrow(RangeError);
  });
});
