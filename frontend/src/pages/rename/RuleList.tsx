import { Button } from "@/components/ui/button";
import { Plus, Trash } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";
import RuleCard from "./RuleCard";

export default function RuleList() {
  const replaceInfos = useRenameStore((s) => s.replaceInfos);
  const addReplaceInfo = useRenameStore((s) => s.addReplaceInfo);
  const clearAllRules = useRenameStore((s) => s.clearAllRules);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          替换规则 ({replaceInfos.length})
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearAllRules}
            disabled={replaceInfos.length === 0}
          >
            <Trash size={12} className="mr-1" />
            清空
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={addReplaceInfo}
          >
            <Plus size={12} className="mr-1" />
            添加
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {replaceInfos.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            点击"添加"创建替换规则
          </div>
        ) : (
          replaceInfos.map((rule, index) => (
            <RuleCard key={rule.id} rule={rule} index={index} />
          ))
        )}
      </div>
    </div>
  );
}
