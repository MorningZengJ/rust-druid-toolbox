import { TextInput, Checkbox, Group, Stack, ActionIcon, Text, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";
import type { ReplaceInfo } from "@/types";

interface RuleCardProps {
  rule: ReplaceInfo;
  index: number;
}

export default function RuleCard({ rule, index }: RuleCardProps) {
  const rulesCollapsed = useRenameStore((s) => s.rulesCollapsed);
  const toggleRuleCollapse = useRenameStore((s) => s.toggleRuleCollapse);
  const updateReplaceInfo = useRenameStore((s) => s.updateReplaceInfo);
  const removeReplaceInfo = useRenameStore((s) => s.removeReplaceInfo);

  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

  const collapsed = rulesCollapsed[index] ?? false;

  return (
    <div
      style={{
        borderRadius: theme.radius.md,
        border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
    >
      <Group gap={4} px="xs" py={6} align="center">
        <ActionIcon
          variant="subtle"
          size="sm"
          color="gray"
          onClick={() => toggleRuleCollapse(index)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </ActionIcon>

        <Text size="xs" fw={500} c="dimmed" style={{ flex: 1 }} truncate>
          规则 {index + 1}
          {!collapsed && (
            <Text span size="xs" c="dimmed" opacity={0.6} ml="xs">
              {rule.content || "(空)"} → {rule.target || "(空)"}
            </Text>
          )}
        </Text>

        <Group gap={4} align="center">
          <Checkbox
            checked={rule.enable}
            onChange={(e) => updateReplaceInfo(index, { enable: e.currentTarget.checked })}
            size="xs"
          />
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            onClick={() => removeReplaceInfo(index)}
          >
            <Trash2 size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {!collapsed && (
        <Stack
          gap="xs"
          px="sm"
          py="xs"
          style={{ borderTop: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}` }}
        >
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed" w={48} style={{ flexShrink: 0 }}>查找</Text>
            <TextInput
              style={{ flex: 1 }}
              size="xs"
              placeholder="查找内容"
              value={rule.content}
              onChange={(e) => updateReplaceInfo(index, { content: e.currentTarget.value })}
              styles={{ input: { fontFamily: "monospace" } }}
            />
          </Group>
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed" w={48} style={{ flexShrink: 0 }}>替换</Text>
            <TextInput
              style={{ flex: 1 }}
              size="xs"
              placeholder="替换为"
              value={rule.target}
              onChange={(e) => updateReplaceInfo(index, { target: e.currentTarget.value })}
              styles={{ input: { fontFamily: "monospace" } }}
            />
          </Group>
          <Group gap="sm">
            <Group gap={6} align="center">
              <Checkbox
                checked={rule.isRegex}
                onChange={(e) => updateReplaceInfo(index, { isRegex: e.currentTarget.checked })}
                size="xs"
              />
              <Text size="xs" c="dimmed">正则表达式</Text>
            </Group>
          </Group>
        </Stack>
      )}
    </div>
  );
}
