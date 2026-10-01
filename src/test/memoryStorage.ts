/**
 * A browser's storage for tests that run in Node (the accounts' sync), one
 * per simulated device; `failOn` makes writes to a key fail, as a full
 * storage would.
 */
export class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  failOn: string | null = null;

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    if (key === this.failOn) throw new Error("QuotaExceededError");
    this.items.set(key, String(value));
  }

  /** Every key, for a test to look at what was written. */
  keys(): string[] {
    return [...this.items.keys()];
  }
}
