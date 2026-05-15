import { useRenameStore } from "@/stores/renameStore";
import { renameLogic } from "@/lib/renameLogic";
import { Badge } from "@/components/ui/badge";
import { Virtuoso } from "react-virtuoso";

export default function FilePreview() {
  const filterFileList = useRenameStore((s) => s.filterFileList);
  const replaceInfos = useRenameStore((s) => s.replaceInfos);
  const conflicts = useRenameStore((s) => s.conflicts);
  const displayLimit = useRenameStore((s) => s.displayLimit);
  const loadMore = useRenameStore((s) => s.loadMore);
  const selectedFile = useRenameStore((s) => s.selectedFile);
  const setSelectedFile = useRenameStore((s) => s.setSelectedFile);

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

  if (filterFileList.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        选择目录以加载文件列表
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          文件预览 ({filterFileList.length})
        </span>
        {hasMore && (
          <button
            className="text-xs text-primary hover:underline"
            onClick={loadMore}
          >
            加载更多 (显示 {displayLimit}/{filterFileList.length})
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
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

            return (
              <div
                className={`flex cursor-pointer items-center gap-3 border-b border-border px-3 py-1.5 text-sm hover:bg-muted/50 ${
                  isSelected ? "bg-muted" : ""
                } ${hasConflict ? "bg-conflict/10" : ""}`}
                onClick={() => setSelectedFile(isSelected ? null : file)}
              >
                <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-sm">
                  {file.name}
                </span>
                <span className="shrink-0 text-muted-foreground">→</span>
                <span
                  className={`min-w-0 flex-1 truncate font-mono text-sm ${
                    changed
                      ? hasConflict
                        ? "text-destructive font-medium"
                        : "text-diff-added"
                      : "text-muted-foreground"
                  }`}
                >
                  {newName}
                </span>
                {hasConflict && (
                  <Badge variant="destructive" className="shrink-0 text-xs">
                    冲突
                  </Badge>
                )}
                {file.isDir && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    目录
                  </Badge>
                )}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
