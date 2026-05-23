import { Group, TextInput, ActionIcon } from "@mantine/core";
import { FolderOpen } from "lucide-react";

interface DirectoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DirectoryPicker({
  value,
  onChange,
  placeholder = "选择或输入路径",
}: DirectoryPickerProps) {
  const handleBrowse = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      onChange(selected as string);
    }
  };

  return (
    <Group gap={4} wrap="nowrap">
      <TextInput
        size="xs"
        style={{ flex: 1 }}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
      />
      <ActionIcon variant="outline" size="md" onClick={handleBrowse}>
        <FolderOpen size={14} />
      </ActionIcon>
    </Group>
  );
}
