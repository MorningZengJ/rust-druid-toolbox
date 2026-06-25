import type { FileInfo, FilterItem, QuickFilter, SortColumn } from "@/types";

// ── Filtering ──

export function applyFilters(
  files: FileInfo[],
  filterItems: FilterItem[],
  quickFilters: QuickFilter[],
  sortColumns: SortColumn[],
): FileInfo[] {
  let result = [...files];

  // Apply quick filters
  if (!quickFilters.includes("all")) {
    result = result.filter((file) =>
      quickFilters.some((filter) => {
        if (filter === "folder") return file.isDir;
        if (filter === "file") return !file.isDir;
        if (typeof filter === "object" && "extension" in filter) {
          return file.extension === filter.extension;
        }
        return true;
      }),
    );
  }

  // Apply keyword filters
  for (const filter of filterItems) {
    if (!filter.keyword) continue;
    result = result.filter((file) => {
      if (filter.isRegex) {
        try {
          return new RegExp(filter.keyword).test(file.name);
        } catch {
          return true;
        }
      }
      return file.name.toLowerCase().includes(filter.keyword.toLowerCase());
    });
  }

  // Sort
  result.sort((a, b) => {
    if (sortColumns.length === 0) {
      if (b.isDir !== a.isDir) return b.isDir ? 1 : -1;
      return a.name.localeCompare(b.name);
    }

    for (const col of sortColumns) {
      const dir = col.direction === "asc" ? 1 : -1;
      let cmp = 0;

      switch (col.field) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "size":
          cmp = a.sizeBytes - b.sizeBytes;
          break;
        case "extension":
          cmp = a.extension.localeCompare(b.extension);
          break;
      }

      if (cmp !== 0) return cmp * dir;
    }

    return 0;
  });

  return result;
}

// ── Quick filter toggle ──

export function toggleQuickFilter(
  currentFilters: QuickFilter[],
  filter: QuickFilter,
): QuickFilter[] {
  if (filter === "all") return ["all"];

  const withoutAll = currentFilters.filter((f) => f !== "all");
  const exists = withoutAll.some((f) => JSON.stringify(f) === JSON.stringify(filter));

  if (exists) {
    const next = withoutAll.filter((f) => JSON.stringify(f) !== JSON.stringify(filter));
    return next.length === 0 ? ["all"] : next;
  }
  return [...withoutAll, filter];
}
