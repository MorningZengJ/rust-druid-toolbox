import { Button, Badge, Group, Text } from "@mantine/core";
import { Folder, File, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRenameStore } from "@/stores/renameStore";
import type { QuickFilter } from "@/types";

export default function QuickFilters() {
  const { t } = useTranslation("rename");
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
      <Text size="xs" fw={600} c="dimmed" mr={4}>{t("filter.quickFilters.all")}:</Text>
      <Button
        variant={isActive("all") ? "light" : "default"}
        size="compact-xs"
        leftSection={<Layers size={12} />}
        onClick={() => toggleQuickFilter("all")}
        radius="md"
        color={isActive("all") ? "amber" : "gray"}
      >
        {t("filter.quickFilters.all")}
      </Button>
      <Button
        variant={isActive("folder") ? "light" : "default"}
        size="compact-xs"
        leftSection={<Folder size={12} />}
        onClick={() => toggleQuickFilter("folder")}
        radius="md"
        color={isActive("folder") ? "amber" : "gray"}
      >
        {t("filter.quickFilters.folders")}
      </Button>
      <Button
        variant={isActive("file") ? "light" : "default"}
        size="compact-xs"
        leftSection={<File size={12} />}
        onClick={() => toggleQuickFilter("file")}
        radius="md"
        color={isActive("file") ? "amber" : "gray"}
      >
        {t("filter.quickFilters.files")}
      </Button>
      {extensions.map((ext) => (
        <Badge
          key={ext}
          variant={isActive({ extension: ext }) ? "filled" : "outline"}
          color={isActive({ extension: ext }) ? "amber" : "gray"}
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
