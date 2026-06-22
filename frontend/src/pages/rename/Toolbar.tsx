import { TextInput, Group, Tooltip, ActionIcon } from "@mantine/core";
import { FolderOpen, ArrowUp, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRenameStore } from "@/stores/renameStore";

export default function Toolbar() {
  const { t } = useTranslation("rename");
  const dirPath = useRenameStore((s) => s.dirPath);
  const setDirPath = useRenameStore((s) => s.setDirPath);
  const chooseDirectory = useRenameStore((s) => s.chooseDirectory);
  const parentDirectory = useRenameStore((s) => s.parentDirectory);
  const loadFiles = useRenameStore((s) => s.loadFiles);
  const undoRuleChange = useRenameStore((s) => s.undoRuleChange);
  const ruleHistory = useRenameStore((s) => s.ruleHistory);

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
        borderBottom: "1px solid var(--border-default)",
        backgroundColor: "var(--surface-raised)",
      }}
    >
      <Group gap={4}>
        <Tooltip label={t("toolbar.selectDirectory")} withArrow>
          <ActionIcon
            variant="light"
            size="sm"
            radius="md"
            onClick={chooseDirectory}
          >
            <FolderOpen size={16} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label={t("toolbar.parentDirectory")} withArrow>
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
        placeholder={t("toolbar.pathPlaceholder")}
        radius="md"
        styles={{
          input: {
            fontFamily: "var(--font-mono)",
            backgroundColor: "var(--surface-panel)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
            "&:focus": {
              borderColor: "var(--accent-primary)",
              boxShadow: "0 0 0 3px var(--accent-glow)",
            },
          },
        }}
      />

      <Tooltip label={t("toolbar.undoRuleChange")} withArrow>
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
