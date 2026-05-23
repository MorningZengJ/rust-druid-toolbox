import { Badge, Text, Group, Flex, Box, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";
import { renameLogic } from "@/lib/renameLogic";
import { Virtuoso } from "react-virtuoso";
import FileIcon from "@/components/FileIcon";
import type { FileInfo, SortField, SortColumn } from "@/types";

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

  const activeRules = replaceInfos.filter((r) => r.enable);
  const displayedFiles = filterFileList.slice(0, displayLimit);

  // Build conflict index set for quick lookup
  const conflictIndices = new Set<number>();
  for (const conflict of conflicts) {
    for (const idx of conflict.sourceIndices) {
      conflictIndices.add(idx);
    }
  }

  const getNewName = (name: string) => {
    if (activeRules.length === 0) return name;
    return renameLogic.applyReplaceRules(name, activeRules);
  };

  const hasMore = displayLimit < filterFileList.length;

  const handleDoubleClick = async (file: FileInfo) => {
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
  };

  const handleSortClick = (field: SortField) => {
    const existing = sortColumns.find((c) => c.field === field);
    let newColumns: SortColumn[];

    if (!existing) {
      newColumns = [...sortColumns, { field, direction: "asc" }];
    } else if (existing.direction === "asc") {
      newColumns = sortColumns.map((c) =>
        c.field === field ? { ...c, direction: "desc" } : c
      );
    } else {
      newColumns = sortColumns.filter((c) => c.field !== field);
    }

    setSortColumns(newColumns);
  };

  const getSortIndicator = (field: SortField) => {
    const col = sortColumns.find((c) => c.field === field);
    if (!col) return null;
    const idx = sortColumns.indexOf(col);
    const Icon = col.direction === "asc" ? ChevronUp : ChevronDown;
    return (
      <Group gap={1} align="center" ml={2} style={{ display: "inline-flex" }}>
        <Icon size={12} />
        {sortColumns.length > 1 && (
          <Text size="xs" c="dimmed">{idx + 1}</Text>
        )}
      </Group>
    );
  };

  return (
    <Flex direction="column" h="100%" style={{ borderRadius: theme.radius.md, border: `1px solid ${theme.colors.dark[4]}`, overflow: "hidden" }}>
      <Group
        justify="space-between"
        align="center"
        px="sm"
        py={6}
        style={{ borderBottom: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}` }}
      >
        <Text size="xs" fw={500} c="dimmed">
          文件预览 ({filterFileList.length})
        </Text>
        {hasMore && (
          <Text
            size="xs"
            c="primary"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={loadMore}
          >
            加载更多 (显示 {displayLimit}/{filterFileList.length})
          </Text>
        )}
      </Group>

      <Box style={{ flex: 1, overflow: "hidden" }}>
        {filterFileList.length === 0 ? (
          <Flex h="100%" align="center" justify="center">
            <Text size="sm" c="dimmed">选择目录以加载文件列表</Text>
          </Flex>
        ) : (
        <Virtuoso
          style={{ height: "100%" }}
          totalCount={displayedFiles.length}
          endReached={hasMore ? loadMore : undefined}
          components={{
            Header: () => (
              <Flex
                align="center"
                gap={8}
                px="sm"
                py={4}
                style={{
                  borderBottom: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: isDark ? theme.colors.dark[2] : theme.colors.gray[6],
                  backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
                }}
              >
                <Box w={16} style={{ flexShrink: 0 }} />
                <Text
                  size="xs"
                  fw={500}
                  style={{ flex: 1, minWidth: 0, cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSortClick("name")}
                >
                  名称 {getSortIndicator("name")}
                </Text>
                <Text size="xs" fw={500} style={{ flex: 1, minWidth: 0 }}>新名称</Text>
                <Text
                  size="xs"
                  fw={500}
                  w={60}
                  ta="center"
                  style={{ flexShrink: 0, cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSortClick("extension")}
                >
                  类型 {getSortIndicator("extension")}
                </Text>
                <Text
                  size="xs"
                  fw={500}
                  w={80}
                  ta="right"
                  style={{ flexShrink: 0, cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSortClick("size")}
                >
                  大小 {getSortIndicator("size")}
                </Text>
                <Box w={48} style={{ flexShrink: 0 }} />
              </Flex>
            ),
          }}
          itemContent={(index) => {
            const file = displayedFiles[index];
            const newName = getNewName(file.name);
            const changed = newName !== file.name;
            const hasConflict = conflictIndices.has(index);
            const isSelected = selectedFile?.path === file.path;

            const rowBg = hasConflict
              ? (isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.08)")
              : isSelected
                ? (isDark ? theme.colors.dark[5] : theme.colors.gray[1])
                : "transparent";

            const newTextColor = changed
              ? hasConflict
                ? theme.colors.red[isDark ? 4 : 7]
                : theme.colors.green[isDark ? 4 : 8]
              : (isDark ? theme.colors.dark[2] : theme.colors.gray[6]);

            return (
              <Flex
                align="center"
                gap={8}
                px="sm"
                py={6}
                onClick={() => setSelectedFile(isSelected ? null : file)}
                onDoubleClick={() => handleDoubleClick(file)}
                style={{
                  cursor: "pointer",
                  borderBottom: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                  fontSize: 14,
                  backgroundColor: rowBg,
                }}
              >
                <FileIcon isDir={file.isDir} extension={file.extension} />
                <Text
                  size="sm"
                  truncate
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: "monospace",
                  }}
                >
                  {file.name}
                </Text>
                <Text
                  size="sm"
                  truncate
                  fw={changed && hasConflict ? 600 : undefined}
                  c={newTextColor}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: "monospace",
                  }}
                >
                  {newName}
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  w={60}
                  ta="center"
                  style={{ flexShrink: 0 }}
                >
                  {file.isDir ? "" : file.extension}
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  w={80}
                  ta="right"
                  style={{ flexShrink: 0, fontFamily: "monospace" }}
                >
                  {file.size}
                </Text>
                {hasConflict && (
                  <Badge color="red" variant="filled" size="sm" style={{ flexShrink: 0 }}>
                    冲突
                  </Badge>
                )}
              </Flex>
            );
          }}
        />
        )}
      </Box>
    </Flex>
  );
}
