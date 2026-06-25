// ── Request versioning scheduler for ASCII Art conversions ──
//
// Replaces the module-global debounceTimer in asciiArtStore.
// - Debounces param changes by 500ms.
// - If a conversion is in-flight when new params arrive, the latest is queued
//   as "pending" and runs immediately after the current one finishes.
// - Uses a monotonically increasing requestVersion so stale results (from
//   cancelled or superseded requests) are discarded.

// ── State ──

let requestVersion = 0;
let activeVersion = 0;
let pendingFn: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

// ── Public API ──

export interface SchedulerCallbacks {
  /** Called before each actual conversion attempt (debounced or immediate). */
  onStart: () => void;
  /** The actual conversion logic — returns current version so callback can check staleness. */
  execute: (version: number) => Promise<void>;
  /** Called when a conversion completes successfully. */
  onComplete: (version: number) => void;
  /** Called when a conversion fails. */
  onError: (version: number, message: string) => void;
}

/** Reset all state — call when image changes (new load, drop, paste). */
export function resetScheduler(): void {
  requestVersion = 0;
  activeVersion = 0;
  pendingFn = null;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  isRunning = false;
}

/**
 * Schedule a conversion with 500ms debounce.
 * If already running, the latest request will run after the current one finishes.
 */
export function schedule(callbacks: SchedulerCallbacks): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    start(callbacks);
  }, 500);
}

/** Cancel debounce (but not in-flight conversion). */
export function cancelDebounce(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

// ── Internal ──

function start(callbacks: SchedulerCallbacks): void {
  if (isRunning) {
    // Queue the latest request as pending
    pendingFn = () => start(callbacks);
    return;
  }

  isRunning = true;
  const version = ++requestVersion;
  activeVersion = version;
  pendingFn = null;

  callbacks.onStart();

  callbacks
    .execute(version)
    .then(() => {
      if (version !== activeVersion) return;
      callbacks.onComplete(version);
    })
    .catch((err) => {
      if (version !== activeVersion) return;
      const message = err instanceof Error ? err.message : String(err);
      callbacks.onError(version, message);
    })
    .finally(() => {
      isRunning = false;
      // Run pending request if any
      if (pendingFn !== null) {
        const next = pendingFn;
        pendingFn = null;
        next();
      }
    });
}

/** Returns true if the given version is still the active one. */
export function isVersionValid(version: number): boolean {
  return version === activeVersion;
}
