import { TextInput, Group, Tooltip, ActionIcon, useMantineTheme, useMantineColorScheme } from "@mantine/core";
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
  const { colorScheme } = useMantineColorScheme();
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
        borderBottom: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
      }}
    >
      <Tooltip label="选择目录">
        <ActionIcon variant="outline" size="sm" onClick={chooseDirectory}>
          <FolderOpen size={16} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="上级目录">
        <ActionIcon variant="outline" size="sm" onClick={parentDirectory}>
          <ArrowUp size={16} />
        </ActionIcon>
      </Tooltip>

      <TextInput
        style={{ flex: 1 }}
        size="xs"
        value={dirPath}
        onChange={(e) => setDirPath(e.currentTarget.value)}
        onKeyDown={handlePathKeyDown}
        placeholder="输入目录路径，按 Enter 加载"
        styles={{ input: { fontFamily: "monospace" } }}
      />

      <Tooltip label="撤销规则修改">
        <ActionIcon
          variant="outline"
          size="sm"
          onClick={undoRuleChange}
          disabled={ruleHistory.length === 0}
        >
          <Undo2 size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
