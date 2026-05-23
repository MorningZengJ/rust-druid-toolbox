import { Button, Group, Text, Stack, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { Plus, Trash } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";
import RuleCard from "./RuleCard";

export default function RuleList() {
  const replaceInfos = useRenameStore((s) => s.replaceInfos);
  const addReplaceInfo = useRenameStore((s) => s.addReplaceInfo);
  const clearAllRules = useRenameStore((s) => s.clearAllRules);

  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Group
        justify="space-between"
        align="center"
        px="sm"
        py={6}
        style={{ borderBottom: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}` }}
      >
        <Text size="xs" fw={500} c="dimmed">
          替换规则 ({replaceInfos.length})
        </Text>
        <Group gap={4}>
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<Trash size={12} />}
            onClick={clearAllRules}
            disabled={replaceInfos.length === 0}
          >
            清空
          </Button>
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<Plus size={12} />}
            onClick={addReplaceInfo}
          >
            添加
          </Button>
        </Group>
      </Group>

      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        <Stack gap="xs">
          {replaceInfos.length === 0 ? (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
              <Text size="sm" c="dimmed">点击"添加"创建替换规则</Text>
            </div>
          ) : (
            replaceInfos.map((rule, index) => (
              <RuleCard key={rule.id} rule={rule} index={index} />
            ))
          )}
        </Stack>
      </div>
    </div>
  );
}
