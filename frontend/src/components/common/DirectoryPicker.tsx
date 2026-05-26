import { Group, TextInput, ActionIcon, useMantineTheme, useComputedColorScheme } from "@mantine/core";
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
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

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
        styles={{
          input: {
            fontFamily: "monospace",
            backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
            borderColor: isDark ? theme.colors.dark[4] : theme.colors.gray[3],
            "&:focus": {
              borderColor: theme.colors[theme.primaryColor][isDark ? 5 : 4],
            },
          },
        }}
      />
      <ActionIcon
        variant="light"
        color={theme.primaryColor}
        size="md"
        radius="md"
        onClick={handleBrowse}
      >
        <FolderOpen size={14} />
      </ActionIcon>
    </Group>
  );
}
