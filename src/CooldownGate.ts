// Per-id cooldown with an injected clock. Ids are independent; an id with no
// configured cooldown always passes.

export class CooldownGate<Id extends string> {
  private readonly _last = new Map<Id, number>();

  constructor(private readonly _cooldownMs: Partial<Record<Id, number>>) {}

  tryPass(id: Id, nowMs: number): boolean {
    const cooldown = this._cooldownMs[id] ?? 0;
    const last = this._last.get(id);
    if (last !== undefined && nowMs - last < cooldown) {
      return false;
    }
    this._last.set(id, nowMs);
    return true;
  }
}
