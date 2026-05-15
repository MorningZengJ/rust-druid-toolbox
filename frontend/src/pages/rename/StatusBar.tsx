import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, AlertTriangle, CheckCircle } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";

export default function StatusBar() {
  const filterFileList = useRenameStore((s) => s.filterFileList);
  const replaceInfos = useRenameStore((s) => s.replaceInfos);
  const conflicts = useRenameStore((s) => s.conflicts);
  const status = useRenameStore((s) => s.status);
  const setShowConfirm = useRenameStore((s) => s.setShowConfirm);

  const activeRules = replaceInfos.filter((r) => r.enable);
  const hasChanges = activeRules.length > 0;
  const hasConflicts = conflicts.length > 0;

  return (
    <div className="flex items-center justify-between border-t border-border bg-bottom-bar px-3 py-1.5">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {filterFileList.length} 个文件
        </span>

        {hasChanges && (
          <Badge variant="secondary" className="text-xs">
            {activeRules.length} 条规则
          </Badge>
        )}

        {hasConflicts && (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
            <AlertTriangle size={12} />
            {conflicts.length} 个冲突
          </Badge>
        )}

        {status && (
          <Badge variant="default" className="flex items-center gap-1 text-xs">
            <CheckCircle size={12} />
            完成: {status.success}/{status.total}
            {status.errors.length > 0 && `, ${status.errors.length} 个错误`}
          </Badge>
        )}
      </div>

      <Button
        size="sm"
        className="h-7"
        disabled={!hasChanges || hasConflicts || filterFileList.length === 0}
        onClick={() => setShowConfirm(true)}
      >
        <Play size={14} className="mr-1" />
        执行重命名
      </Button>
    </div>
  );
}
