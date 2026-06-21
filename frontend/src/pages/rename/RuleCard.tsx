import { TextInput, Checkbox, Group, Stack, ActionIcon, Text } from "@mantine/core";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRenameStore } from "@/stores/renameStore";
import type { ReplaceInfo } from "@/types";

interface RuleCardProps {
  rule: ReplaceInfo;
  index: number;
}

export default function RuleCard({ rule, index }: RuleCardProps) {
  const { t } = useTranslation("rename");
  const rulesCollapsed = useRenameStore((s) => s.rulesCollapsed);
  const toggleRuleCollapse = useRenameStore((s) => s.toggleRuleCollapse);
  const updateReplaceInfo = useRenameStore((s) => s.updateReplaceInfo);
  const removeReplaceInfo = useRenameStore((s) => s.removeReplaceInfo);

  const collapsed = rulesCollapsed[index] ?? false;

  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--surface-overlay)",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* 顶部高光线 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
          pointerEvents: "none",
        }}
      />

      <Group gap={4} px="xs" py={6} align="center">
        <ActionIcon
          variant="subtle"
          size="sm"
          color="gray"
          radius="sm"
          onClick={() => toggleRuleCollapse(index)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </ActionIcon>

        <Text size="xs" fw={500} c="dimmed" style={{ flex: 1 }} truncate>
          <Text span size="xs" fw={600} style={{ color: "var(--text-primary)" }}>
            {t("rules.ruleNumber", { index: index + 1 })}
          </Text>
          {!collapsed && (
            <Text span size="xs" c="dimmed" opacity={0.6} ml="xs">
              {rule.content || t("rules.empty")} → {rule.target || t("rules.empty")}
            </Text>
          )}
        </Text>

        <Group gap={4} align="center">
          <Checkbox
            checked={rule.enable}
            onChange={(e) => updateReplaceInfo(index, { enable: e.currentTarget.checked })}
            size="xs"
            color="amber"
          />
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            radius="sm"
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
          style={{
            borderTop: "1px solid var(--border-subtle)",
            backgroundColor: "var(--surface-panel)",
          }}
        >
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed" w={48} style={{ flexShrink: 0 }}>{t("rules.find")}</Text>
            <TextInput
              style={{ flex: 1 }}
              size="xs"
              placeholder={t("rules.findPlaceholder")}
              value={rule.content}
              onChange={(e) => updateReplaceInfo(index, { content: e.currentTarget.value })}
              radius="md"
              styles={{
                input: {
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--surface-overlay)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                },
              }}
            />
          </Group>
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed" w={48} style={{ flexShrink: 0 }}>{t("rules.replace")}</Text>
            <TextInput
              style={{ flex: 1 }}
              size="xs"
              placeholder={t("rules.replacePlaceholder")}
              value={rule.target}
              onChange={(e) => updateReplaceInfo(index, { target: e.currentTarget.value })}
              radius="md"
              styles={{
                input: {
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--surface-overlay)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                },
              }}
            />
          </Group>
          <Group gap="sm">
            <Group gap={6} align="center">
              <Checkbox
                checked={rule.isRegex}
                onChange={(e) => updateReplaceInfo(index, { isRegex: e.currentTarget.checked })}
                size="xs"
                color="amber"
              />
              <Text size="xs" c="dimmed">{t("rules.regex")}</Text>
            </Group>
          </Group>
        </Stack>
      )}
    </div>
  );
}
