import { Button, Badge, Group, Text } from "@mantine/core";
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
    <Group gap={6} align="center">
      <Text size="xs" fw={600} c="dimmed" mr={4}>筛选:</Text>
      <Button
        variant={isActive("all") ? "light" : "default"}
        size="compact-xs"
        leftSection={<Layers size={12} />}
        onClick={() => toggleQuickFilter("all")}
        radius="md"
      >
        全部
      </Button>
      <Button
        variant={isActive("folder") ? "light" : "default"}
        size="compact-xs"
        leftSection={<Folder size={12} />}
        onClick={() => toggleQuickFilter("folder")}
        radius="md"
      >
        文件夹
      </Button>
      <Button
        variant={isActive("file") ? "light" : "default"}
        size="compact-xs"
        leftSection={<File size={12} />}
        onClick={() => toggleQuickFilter("file")}
        radius="md"
      >
        文件
      </Button>
      {extensions.map((ext) => (
        <Badge
          key={ext}
          variant={isActive({ extension: ext }) ? "filled" : "outline"}
          style={{ cursor: "pointer" }}
          onClick={() => toggleQuickFilter({ extension: ext })}
          radius="sm"
        >
          {ext}
        </Badge>
      ))}
    </Group>
  );
}
