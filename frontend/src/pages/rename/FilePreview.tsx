import { useMemo, useCallback, useState } from "react";
import {
  Badge,
  Text,
  Group,
  Flex,
  Box,
  useMantineTheme,
  useComputedColorScheme,
} from "@mantine/core";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
  type SortingFn,
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

// Custom multi-sort function that respects priority order
const multiSortFn: SortingFn<FileRow> = (rowA, rowB, columnId) => {
  // This is handled by getSortedRowModel with multi-sort
  return 0;
};

export default function FilePreview() {
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

  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

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
          console.error("打开文件失败:", e);
        }
      }
    },
    [loadFiles]
  );

  const getRowBg = useCallback(
    (row: FileRow) => {
      if (row.hasConflict) {
        return isDark ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)";
      }
      if (selectedFile?.path === row.path) {
        return isDark
          ? "rgba(255, 255, 255, 0.04)"
          : "rgba(0, 0, 0, 0.03)";
      }
      return "transparent";
    },
    [isDark, selectedFile]
  );

  const getNewTextColor = useCallback(
    (row: FileRow) => {
      const changed = row.newName !== row.name;
      if (!changed) return isDark ? theme.colors.dark[2] : theme.colors.gray[6];
      if (row.hasConflict) return theme.colors.red[isDark ? 4 : 7];
      return theme.colors.green[isDark ? 4 : 8];
    },
    [isDark, theme]
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
        header: "名称",
        enableSorting: true,
        cell: ({ row }) => (
          <Text truncate size="sm" style={{ fontFamily: "monospace" }}>
            {row.original.name}
          </Text>
        ),
      },
      {
        id: "newName",
        header: "新名称",
        enableSorting: false,
        cell: ({ row }) => (
          <Text
            truncate
            size="sm"
            fw={row.original.hasConflict ? 600 : undefined}
            c={getNewTextColor(row.original)}
            style={{ fontFamily: "monospace" }}
          >
            {row.original.newName}
          </Text>
        ),
      },
      {
        accessorKey: "extension",
        header: "类型",
        enableSorting: true,
        cell: ({ row }) => (
          <Text size="xs" c="dimmed" ta="center">
            {row.original.isDir ? "" : row.original.extension}
          </Text>
        ),
      },
      {
        accessorKey: "size",
        header: "大小",
        enableSorting: true,
        cell: ({ row }) => (
          <Text size="xs" c="dimmed" ta="right" style={{ fontFamily: "monospace" }}>
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
              冲突
            </Badge>
          ) : null,
      },
    ],
    [getNewTextColor]
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
        // Ascending → Descending
        header.column.toggleSorting(true, true);
      } else if (currentSort === "desc") {
        // Descending → Remove
        const newSorting = sorting.filter((s) => s.id !== header.column.id);
        setSortColumns(
          newSorting.map((s) => ({
            field: s.id as SortField,
            direction: s.desc ? "desc" : "asc",
          }))
        );
      } else {
        // Not sorted → Add ascending
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
        borderRadius: theme.radius.lg,
        border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
        overflow: "hidden",
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
    >
      <Group
        justify="space-between"
        align="center"
        px="sm"
        py={6}
        style={{
          borderBottom: `1px solid ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}`,
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.02)"
            : "rgba(0, 0, 0, 0.01)",
        }}
      >
        <Text size="xs" fw={600} c="dimmed">
          文件预览 ({filterFileList.length})
        </Text>
        <Group gap="xs">
          {sortColumns.length > 1 && (
            <Text size="xs" c="dimmed">
              多列排序
            </Text>
          )}
          {hasMore && (
            <Text
              size="xs"
              c={theme.primaryColor}
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={loadMore}
            >
              加载更多 ({displayLimit}/{filterFileList.length})
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
          borderBottom: `1px solid ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}`,
          fontSize: 12,
          fontWeight: 500,
          color: isDark ? theme.colors.dark[2] : theme.colors.gray[6],
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.02)"
            : "rgba(0, 0, 0, 0.01)",
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
              选择目录以加载文件列表
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
                    borderBottom: `1px solid ${isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)"}`,
                    fontSize: 14,
                    backgroundColor: getRowBg(file),
                    transition: "background-color 100ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !file.hasConflict) {
                      e.currentTarget.style.backgroundColor = isDark
                        ? "rgba(255, 255, 255, 0.03)"
                        : "rgba(0, 0, 0, 0.02)";
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
      <Icon size={12} />
      {showIndex && sortIndex >= 0 && (
        <Text size="xs" c="dimmed">
          {sortIndex + 1}
        </Text>
      )}
    </Group>
  );
}
