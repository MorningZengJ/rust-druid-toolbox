/**
 * Ring-buffer for video tool logs.
 * - Caps at maxEntries, dropping oldest entries first.
 * - Supports batched appends to reduce array spread overhead.
 */
export class LogBuffer<T> {
  private entries: T[] = [];
  private pending: T[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxEntries: number;
  private readonly flushMs: number;

  constructor(maxEntries = 500, flushMs = 100) {
    this.maxEntries = maxEntries;
    this.flushMs = flushMs;
  }

  /** Add a single entry (auto-flushes after flushMs silence). */
  push(entry: T, onFlush: (entries: T[]) => void): void {
    this.pending.push(entry);
    this.scheduleFlush(onFlush);
  }

  /** Get current entries (stable reference). */
  getAll(): T[] {
    return this.entries;
  }

  /** Clear all entries. */
  clear(): void {
    this.entries = [];
    this.pending = [];
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Force flush pending entries immediately. */
  flush(onFlush: (entries: T[]) => void): T[] {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    return this.applyPending(onFlush);
  }

  private scheduleFlush(onFlush: (entries: T[]) => void): void {
    if (this.flushTimer !== null) return; // already scheduled
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.applyPending(onFlush);
    }, this.flushMs);
  }

  private applyPending(onFlush: (entries: T[]) => void): T[] {
    if (this.pending.length === 0) return this.entries;

    this.entries = [...this.entries, ...this.pending];
    this.pending = [];

    // Trim to maxEntries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
    }

    onFlush(this.entries);
    return this.entries;
  }
}
