import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRenameStore } from "@/stores/renameStore";

export default function ConfirmDialog() {
  const showConfirm = useRenameStore((s) => s.showConfirm);
  const setShowConfirm = useRenameStore((s) => s.setShowConfirm);
  const executeRenames = useRenameStore((s) => s.executeRenames);
  const filterFileList = useRenameStore((s) => s.filterFileList);
  const replaceInfos = useRenameStore((s) => s.replaceInfos);

  const activeRules = replaceInfos.filter((r) => r.enable);

  return (
    <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认重命名</DialogTitle>
          <DialogDescription>
            即将对 {filterFileList.length} 个文件执行 {activeRules.length} 条替换规则。
            此操作不可撤销，确定继续吗？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirm(false)}>
            取消
          </Button>
          <Button onClick={executeRenames}>
            确认执行
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
