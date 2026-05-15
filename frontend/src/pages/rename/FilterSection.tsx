import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";
import QuickFilters from "./QuickFilters";
import type { FilterItem } from "@/types";

export default function FilterSection() {
  const filterCollapsed = useRenameStore((s) => s.filterCollapsed);
  const setFilterCollapsed = useRenameStore((s) => s.setFilterCollapsed);
  const filterItems = useRenameStore((s) => s.filterItems);
  const setFilterItems = useRenameStore((s) => s.setFilterItems);

  const addFilter = () => {
    setFilterItems([...filterItems, { keyword: "", isRegex: false }]);
  };

  const removeFilter = (index: number) => {
    const newItems = filterItems.filter((_, i) => i !== index);
    if (newItems.length === 0) newItems.push({ keyword: "", isRegex: false });
    setFilterItems(newItems);
  };

  const updateFilter = (index: number, updates: Partial<FilterItem>) => {
    const newItems = filterItems.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    setFilterItems(newItems);
  };

  return (
    <div className="border-b border-border">
      <button
        className="flex w-full items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
        onClick={() => setFilterCollapsed(!filterCollapsed)}
      >
        {filterCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        文件筛选
      </button>

      {!filterCollapsed && (
        <div className="space-y-2 px-3 pb-2">
          <QuickFilters />

          {filterItems.map((filter, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                className="h-7 flex-1 text-sm"
                placeholder="关键词筛选..."
                value={filter.keyword}
                onChange={(e) => updateFilter(index, { keyword: e.target.value })}
              />
              <div className="flex items-center gap-1">
                <Checkbox
                  checked={filter.isRegex}
                  onCheckedChange={(checked) =>
                    updateFilter(index, { isRegex: !!checked })
                  }
                  className="h-4 w-4"
                />
                <span className="text-xs text-muted-foreground">正则</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeFilter(index)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={addFilter}
          >
            <Plus size={12} className="mr-1" />
            添加筛选
          </Button>
        </div>
      )}
    </div>
  );
}
