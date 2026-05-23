import { Badge, Text, Group, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { useRenameStore } from "@/stores/renameStore";
import { renameLogic } from "@/lib/renameLogic";
import { Virtuoso } from "react-virtuoso";
import FileIcon from "@/components/FileIcon";
import type { FileInfo } from "@/types";

export default function FilePreview() {
  const filterFileList = useRenameStore((s) => s.filterFileList);
  const replaceInfos = useRenameStore((s) => s.replaceInfos);
  const conflicts = useRenameStore((s) => s.conflicts);
  const displayLimit = useRenameStore((s) => s.displayLimit);
  const loadMore = useRenameStore((s) => s.loadMore);
  const selectedFile = useRenameStore((s) => s.selectedFile);
  const setSelectedFile = useRenameStore((s) => s.setSelectedFile);
  const loadFiles = useRenameStore((s) => s.loadFiles);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", borderRadius: theme.radius.md, border: `1px solid ${theme.colors.dark[4]}`, overflow: "hidden" }}>
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

      <div style={{ flex: 1, overflow: "hidden" }}>
        {filterFileList.length === 0 ? (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <Text size="sm" c="dimmed">选择目录以加载文件列表</Text>
          </div>
        ) : (
        <Virtuoso
          style={{ height: "100%" }}
          totalCount={displayedFiles.length}
          endReached={hasMore ? loadMore : undefined}
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
              <div
                style={{
                  display: "flex",
                  cursor: "pointer",
                  alignItems: "center",
                  gap: 8,
                  borderBottom: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                  padding: "6px 12px",
                  fontSize: 14,
                  backgroundColor: rowBg,
                }}
                onClick={() => setSelectedFile(isSelected ? null : file)}
                onDoubleClick={() => handleDoubleClick(file)}
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
                <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>→</Text>
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
                {hasConflict && (
                  <Badge color="red" variant="filled" size="sm" style={{ flexShrink: 0 }}>
                    冲突
                  </Badge>
                )}
              </div>
            );
          }}
        />
        )}
      </div>
    </div>
  );
}
