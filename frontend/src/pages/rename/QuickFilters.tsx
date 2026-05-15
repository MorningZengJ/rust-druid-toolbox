import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, File, Layers } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";
import type { QuickFilter } from "@/types";

export default function QuickFilters() {
  const quickFilters = useRenameStore((s) => s.quickFilters);
  const toggleQuickFilter = useRenameStore((s) => s.toggleQuickFilter);
  const fileList = useRenameStore((s) => s.fileList);

  // Collect unique extensions from file list
  const extensions = Array.from(
    new Set(fileList.filter((f) => !f.isDir && f.extension).map((f) => f.extension))
  ).sort();

  const isActive = (filter: QuickFilter) => {
    if (filter === "all") return quickFilters.includes("all");
    if (typeof filter === "object" && "extension" in filter) {
      return quickFilters.some(
        (f) => typeof f === "object" && "extension" in f && f.extension === filter.extension
      );
    }
    return quickFilters.includes(filter);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground mr-1">筛选:</span>
      <Button
        variant={isActive("all") ? "default" : "outline"}
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => toggleQuickFilter("all")}
      >
        <Layers size={12} className="mr-1" />
        全部
      </Button>
      <Button
        variant={isActive("folder") ? "default" : "outline"}
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => toggleQuickFilter("folder")}
      >
        <Folder size={12} className="mr-1" />
        文件夹
      </Button>
      <Button
        variant={isActive("file") ? "default" : "outline"}
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => toggleQuickFilter("file")}
      >
        <File size={12} className="mr-1" />
        文件
      </Button>
      {extensions.map((ext) => (
        <Badge
          key={ext}
          variant={isActive({ extension: ext }) ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/80"
          onClick={() => toggleQuickFilter({ extension: ext })}
        >
          .{ext}
        </Badge>
      ))}
    </div>
  );
}
