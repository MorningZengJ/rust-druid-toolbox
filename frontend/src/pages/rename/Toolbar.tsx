import { TextInput, Group, Tooltip, ActionIcon, useMantineTheme, useComputedColorScheme } from "@mantine/core";
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

  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

  const handlePathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = e.currentTarget.value.trim();
      if (val) loadFiles(val);
    }
  };

  return (
    <Group
      gap="xs"
      px="sm"
      py={6}
      style={{
        borderBottom: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
    >
      <Group gap={4}>
        <Tooltip label="选择目录" withArrow>
          <ActionIcon
            variant="light"
            color={theme.primaryColor}
            size="sm"
            radius="md"
            onClick={chooseDirectory}
          >
            <FolderOpen size={16} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="上级目录" withArrow>
          <ActionIcon
            variant="default"
            size="sm"
            radius="md"
            onClick={parentDirectory}
          >
            <ArrowUp size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <TextInput
        style={{ flex: 1 }}
        size="xs"
        value={dirPath}
        onChange={(e) => setDirPath(e.currentTarget.value)}
        onKeyDown={handlePathKeyDown}
        placeholder="输入目录路径，按 Enter 加载"
        radius="md"
        styles={{
          input: {
            fontFamily: "monospace",
            backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
            borderColor: isDark ? theme.colors.dark[4] : theme.colors.gray[3],
            "&:focus": {
              borderColor: theme.colors[theme.primaryColor][isDark ? 5 : 4],
            },
          },
        }}
      />

      <Tooltip label="撤销规则修改" withArrow>
        <ActionIcon
          variant="default"
          size="sm"
          radius="md"
          onClick={undoRuleChange}
          disabled={ruleHistory.length === 0}
        >
          <Undo2 size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
