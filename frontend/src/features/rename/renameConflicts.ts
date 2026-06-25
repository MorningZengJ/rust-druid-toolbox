import type { FileInfo, ReplaceInfo, ConflictInfo } from "@/types";
import * as renameApi from "@/lib/renameApi";

// ── Request versioning to avoid stale responses ──

let nextRequestId = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface ConflictResult {
  conflicts: ConflictInfo[];
  error?: string;
}

/**
 * Debounced conflict detection with request versioning.
 * - Textual rule edits are debounced by `delayMs`.
 * - Structural changes (add/remove/clear) should use `delayMs: 0` to fire immediately.
 * - Only the latest request's result is applied (stale responses are discarded).
 */
export function scheduleConflictDetection(
  files: FileInfo[],
  rules: ReplaceInfo[],
  delayMs: number,
  onResult: (result: ConflictResult) => void,
): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const requestId = ++nextRequestId;

    if (rules.length === 0) {
      onResult({ conflicts: [] });
      return;
    }

    renameApi
      .detectConflicts(files, rules)
      .then((rawConflicts) => {
        // Discard stale responses
        if (requestId !== nextRequestId) return;

        const conflicts: ConflictInfo[] = rawConflicts.map(([targetName, sourceIndices]) => ({
          targetName,
          sourceIndices,
        }));

        onResult({ conflicts });
      })
      .catch((error) => {
        if (requestId !== nextRequestId) return;

        const message =
          error instanceof Error ? error.message : String(error);
        onResult({
          conflicts: [],
          error: message,
        });
      });
  }, delayMs);
}

/** Cancel any pending debounced detection. */
export function cancelPendingDetection(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

// ── Conflict index lookup ──

/**
 * Build a Set of file paths that have conflicts, for O(1) lookup in the preview table.
 * Uses stable path keys instead of fragile array indices.
 */
export function buildConflictPathSet(conflicts: ConflictInfo[], files: FileInfo[]): Set<string> {
  const indices = new Set<number>();
  for (const conflict of conflicts) {
    for (const idx of conflict.sourceIndices) {
      indices.add(idx);
    }
  }

  const paths = new Set<string>();
  for (const idx of indices) {
    if (idx < files.length) {
      paths.add(files[idx].path);
    }
  }
  return paths;
}
