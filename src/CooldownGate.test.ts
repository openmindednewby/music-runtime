import { CooldownGate } from './CooldownGate';

describe('CooldownGate acceptance', () => {
  it('AC-08', () => {
    const gate = new CooldownGate<'pickup' | 'jump'>({ pickup: 60 });
    expect(gate.tryPass('pickup', 0)).toBe(true);
    expect(gate.tryPass('pickup', 30)).toBe(false);
    expect(gate.tryPass('jump', 30)).toBe(true);
    expect(gate.tryPass('pickup', 61)).toBe(true);
  });
});
