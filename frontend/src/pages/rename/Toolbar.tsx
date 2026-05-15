import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FolderOpen, ArrowUp, Undo2 } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";

export default function Toolbar() {
  const dirPath = useRenameStore((s) => s.dirPath);
  const setDirPath = useRenameStore((s) => s.setDirPath);
  const chooseDirectory = useRenameStore((s) => s.chooseDirectory);
  const parentDirectory = useRenameStore((s) => s.parentDirectory);
  const loadFiles = useRenameStore((s) => s.loadFiles);
  const undoRuleChange = useRenameStore((s) => s.undoRuleChange);
  const ruleHistory = useRenameStore((s) => s.ruleHistory);

  const handlePathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = (e.target as HTMLInputElement).value.trim();
      if (val) loadFiles(val);
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-border bg-toolbar px-3 py-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={chooseDirectory}>
            <FolderOpen size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>选择目录</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={parentDirectory}>
            <ArrowUp size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>上级目录</TooltipContent>
      </Tooltip>

      <Input
        className="h-8 flex-1 bg-background font-mono text-sm"
        value={dirPath}
        onChange={(e) => setDirPath(e.target.value)}
        onKeyDown={handlePathKeyDown}
        placeholder="输入目录路径，按 Enter 加载"
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={undoRuleChange}
            disabled={ruleHistory.length === 0}
          >
            <Undo2 size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>撤销规则修改</TooltipContent>
      </Tooltip>
    </div>
  );
}
