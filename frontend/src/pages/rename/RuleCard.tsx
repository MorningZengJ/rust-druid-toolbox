import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";
import type { ReplaceInfo } from "@/types";

interface RuleCardProps {
  rule: ReplaceInfo;
  index: number;
}

export default function RuleCard({ rule, index }: RuleCardProps) {
  const rulesCollapsed = useRenameStore((s) => s.rulesCollapsed);
  const toggleRuleCollapse = useRenameStore((s) => s.toggleRuleCollapse);
  const updateReplaceInfo = useRenameStore((s) => s.updateReplaceInfo);
  const removeReplaceInfo = useRenameStore((s) => s.removeReplaceInfo);

  const collapsed = rulesCollapsed[index] ?? false;

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => toggleRuleCollapse(index)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </Button>

        <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
          规则 {index + 1}
          {!collapsed && (
            <span className="ml-2 text-muted-foreground/60">
              {rule.content || "(空)"} → {rule.target || "(空)"}
            </span>
          )}
        </span>

        <div className="flex items-center gap-1">
          <Checkbox
            checked={rule.enable}
            onCheckedChange={(checked) =>
              updateReplaceInfo(index, { enable: !!checked })
            }
            className="h-4 w-4"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => removeReplaceInfo(index)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-2 border-t border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <label className="w-12 shrink-0 text-xs text-muted-foreground">查找</label>
            <Input
              className="h-7 flex-1 font-mono text-sm"
              placeholder="查找内容"
              value={rule.content}
              onChange={(e) => updateReplaceInfo(index, { content: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-12 shrink-0 text-xs text-muted-foreground">替换</label>
            <Input
              className="h-7 flex-1 font-mono text-sm"
              placeholder="替换为"
              value={rule.target}
              onChange={(e) => updateReplaceInfo(index, { target: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox
                checked={rule.isRegex}
                onCheckedChange={(checked) =>
                  updateReplaceInfo(index, { isRegex: !!checked })
                }
                className="h-4 w-4"
              />
              正则表达式
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
