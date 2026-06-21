import { useMemo, useCallback, useState } from "react";
import {
  Badge,
  Text,
  Group,
  Flex,
  Box,
} from "@mantine/core";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
} from "@tanstack/react-table";
import { Virtuoso } from "react-virtuoso";
import { useRenameStore } from "@/stores/renameStore";
import { renameLogic } from "@/lib/renameLogic";
import FileIcon from "@/components/FileIcon";
import type { FileInfo, SortField } from "@/types";

interface FileRow extends FileInfo {
  newName: string;
  hasConflict: boolean;
  originalIndex: number;
}

export default function FilePreview() {
  const { t } = useTranslation("rename");
  const filterFileList = useRenameStore((s) => s.filterFileList);
  const replaceInfos = useRenameStore((s) => s.replaceInfos);
  const conflicts = useRenameStore((s) => s.conflicts);
  const displayLimit = useRenameStore((s) => s.displayLimit);
  const loadMore = useRenameStore((s) => s.loadMore);
  const selectedFile = useRenameStore((s) => s.selectedFile);
  const setSelectedFile = useRenameStore((s) => s.setSelectedFile);
  const loadFiles = useRenameStore((s) => s.loadFiles);
  const sortColumns = useRenameStore((s) => s.sortColumns);
  const setSortColumns = useRenameStore((s) => s.setSortColumns);

  // Column sizing state
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({
    icon: 32,
    name: 200,
    newName: 200,
    extension: 60,
    size: 80,
    conflict: 48,
  });

  const activeRules = useMemo(
    () => replaceInfos.filter((r) => r.enable),
    [replaceInfos]
  );

  // Build conflict index set for quick lookup
  const conflictIndices = useMemo(() => {
    const indices = new Set<number>();
    for (const conflict of conflicts) {
      for (const idx of conflict.sourceIndices) {
        indices.add(idx);
      }
    }
    return indices;
  }, [conflicts]);

  // Prepare display data with computed fields
  const displayedFiles = useMemo(() => {
    const files = filterFileList.slice(0, displayLimit);
    return files.map((file, index) => {
      const newName =
        activeRules.length === 0
          ? file.name
          : renameLogic.applyReplaceRules(file.name, activeRules);
      return {
        ...file,
        newName,
        hasConflict: conflictIndices.has(index),
        originalIndex: index,
      };
    });
  }, [filterFileList, displayLimit, activeRules, conflictIndices]);

  // TanStack Table sorting state
  const sorting: SortingState = useMemo(
    () =>
      sortColumns.map((c) => ({
        id: c.field,
        desc: c.direction === "desc",
      })),
    [sortColumns]
  );

  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      setSortColumns(
        newSorting.map((s) => ({
          field: s.id as SortField,
          direction: s.desc ? "desc" : "asc",
        }))
      );
    },
    [sorting, setSortColumns]
  );

  const hasMore = displayLimit < filterFileList.length;

  const handleDoubleClick = useCallback(
    async (file: FileInfo) => {
      if (file.isDir) {
        await loadFiles(file.path);
      } else {
        try {
          const { openPath } = await import("@tauri-apps/plugin-opener");
          await openPath(file.path);
        } catch (e) {
          console.error("Failed to open file:", e);
        }
      }
    },
    [loadFiles]
  );

  const getRowBg = useCallback(
    (row: FileRow) => {
      if (row.hasConflict) {
        return "var(--status-error-bg)";
      }
      if (selectedFile?.path === row.path) {
        return "var(--accent-glow)";
      }
      return "transparent";
    },
    [selectedFile]
  );

  const getNewTextColor = useCallback(
    (row: FileRow) => {
      const changed = row.newName !== row.name;
      if (!changed) return "var(--text-muted)";
      if (row.hasConflict) return "var(--status-error)";
      return "var(--status-success-alt)";
    },
    []
  );

  // Column definitions
  const columns = useMemo<ColumnDef<FileRow>[]>(
    () => [
      {
        id: "icon",
        header: "",
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileIcon isDir={row.original.isDir} extension={row.original.extension} />
          </Box>
        ),
      },
      {
        accessorKey: "name",
        header: t("preview.columns.name"),
        enableSorting: true,
        cell: ({ row }) => (
          <Text truncate size="sm" style={{ fontFamily: "var(--font-mono)" }}>
            {row.original.name}
          </Text>
        ),
      },
      {
        id: "newName",
        header: t("preview.columns.newName"),
        enableSorting: false,
        cell: ({ row }) => (
          <Text
            truncate
            size="sm"
            fw={row.original.hasConflict ? 600 : undefined}
            c={getNewTextColor(row.original)}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {row.original.newName}
          </Text>
        ),
      },
      {
        accessorKey: "extension",
        header: t("preview.columns.type"),
        enableSorting: true,
        cell: ({ row }) => (
          <Text size="xs" c="dimmed" ta="center">
            {row.original.isDir ? "" : row.original.extension}
          </Text>
        ),
      },
      {
        accessorKey: "size",
        header: t("preview.columns.size"),
        enableSorting: true,
        cell: ({ row }) => (
          <Text size="xs" c="dimmed" ta="right" style={{ fontFamily: "var(--font-mono)" }}>
            {row.original.size}
          </Text>
        ),
      },
      {
        id: "conflict",
        header: "",
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) =>
          row.original.hasConflict ? (
            <Badge color="red" variant="filled" size="sm" radius="sm">
              {t("preview.conflict")}
            </Badge>
          ) : null,
      },
    ],
    [getNewTextColor, t]
  );

  const table = useReactTable({
    data: displayedFiles,
    columns,
    state: { sorting, columnSizing },
    onSortingChange: handleSortingChange,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableMultiSort: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const headerGroup = table.getHeaderGroups()[0];

  // Handle sorting - always multi-sort (click to add/toggle/remove)
  const handleHeaderClick = useCallback(
    (header: (typeof headerGroup.headers)[0]) => {
      if (!header.column.getCanSort()) return;

      const currentSort = header.column.getIsSorted();
      if (currentSort === "asc") {
        header.column.toggleSorting(true, true);
      } else if (currentSort === "desc") {
        const newSorting = sorting.filter((s) => s.id !== header.column.id);
        setSortColumns(
          newSorting.map((s) => ({
            field: s.id as SortField,
            direction: s.desc ? "desc" : "asc",
          }))
        );
      } else {
        header.column.toggleSorting(false, true);
      }
    },
    [sorting, setSortColumns]
  );

  return (
    <Flex
      direction="column"
      h="100%"
      style={{
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        overflow: "hidden",
        backgroundColor: "var(--surface-overlay)",
        position: "relative",
      }}
    >
      {/* 顶部高光线 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <Group
        justify="space-between"
        align="center"
        px="sm"
        py={6}
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          backgroundColor: "var(--surface-panel)",
        }}
      >
        <Text size="xs" fw={600} c="dimmed">
          {t("preview.fileCount", { count: filterFileList.length })}
        </Text>
        <Group gap="xs">
          {sortColumns.length > 1 && (
            <Text size="xs" c="dimmed">
              {t("preview.multiSort")}
            </Text>
          )}
          {hasMore && (
            <Text
              size="xs"
              style={{ cursor: "pointer", textDecoration: "underline", color: "var(--accent-primary)" }}
              onClick={loadMore}
            >
              {t("preview.loadMore", { current: displayLimit, total: filterFileList.length })}
            </Text>
          )}
        </Group>
      </Group>

      {/* Table Header - outside Virtuoso */}
      <Flex
        align="center"
        px="sm"
        py={4}
        style={{
          borderBottom: "1px solid var(--border-default)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          backgroundColor: "var(--surface-panel)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {headerGroup.headers.map((header) => (
          <Box
            key={header.id}
            style={{
              width: header.getSize(),
              flexShrink: 0,
              position: "relative",
            }}
          >
            <Flex
              align="center"
              gap={4}
              style={{
                cursor: header.column.getCanSort() ? "pointer" : "default",
                userSelect: "none",
              }}
              onClick={() => handleHeaderClick(header)}
            >
              <Text size="xs" fw={600} truncate>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </Text>
              {header.column.getCanSort() && (
                <SortIndicator
                  sorted={header.column.getIsSorted()}
                  sortIndex={header.column.getSortIndex()}
                  showIndex={sortColumns.length > 1}
                />
              )}
            </Flex>
            {/* Resize handle */}
            {header.column.getCanResize() && (
              <Box
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  cursor: "col-resize",
                  userSelect: "none",
                  touchAction: "none",
                }}
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
              />
            )}
          </Box>
        ))}
      </Flex>

      <Box style={{ flex: 1, overflow: "hidden" }}>
        {filterFileList.length === 0 ? (
          <Flex h="100%" align="center" justify="center">
            <Text size="sm" c="dimmed">
              {t("preview.selectDirectoryHint")}
            </Text>
          </Flex>
        ) : (
          <Virtuoso
            style={{ height: "100%" }}
            totalCount={rows.length}
            endReached={hasMore ? loadMore : undefined}
            itemContent={(index) => {
              const row = rows[index];
              if (!row) return null;
              const file = row.original;
              const isSelected = selectedFile?.path === file.path;

              return (
                <Flex
                  align="center"
                  px="sm"
                  py={6}
                  onClick={() => setSelectedFile(isSelected ? null : file)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  style={{
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 14,
                    backgroundColor: getRowBg(file),
                    transition: "background-color 100ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !file.hasConflict) {
                      e.currentTarget.style.backgroundColor = "var(--accent-glow)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !file.hasConflict) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Box
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        flexShrink: 0,
                        overflow: "hidden",
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Box>
                  ))}
                </Flex>
              );
            }}
          />
        )}
      </Box>
    </Flex>
  );
}

function SortIndicator({
  sorted,
  sortIndex,
  showIndex,
}: {
  sorted: false | "asc" | "desc";
  sortIndex: number;
  showIndex: boolean;
}) {
  if (!sorted) return null;
  const Icon = sorted === "asc" ? ChevronUp : ChevronDown;
  return (
    <Group gap={1} align="center" style={{ display: "inline-flex" }}>
      <Icon size={12} style={{ color: "var(--accent-primary)" }} />
      {showIndex && sortIndex >= 0 && (
        <Text size="xs" c="dimmed">
          {sortIndex + 1}
        </Text>
      )}
    </Group>
  );
}
