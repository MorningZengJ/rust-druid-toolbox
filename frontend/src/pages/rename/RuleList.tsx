import { Button, Group, Text, Stack, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { Plus, Trash, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRenameStore } from "@/stores/renameStore";
import RuleCard from "./RuleCard";

export default function RuleList() {
  const { t } = useTranslation("rename");
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
        style={{
          borderBottom: `1px solid ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}`,
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
        }}
      >
        <Group gap={6} align="center">
          <ListChecks size={14} style={{ color: isDark ? theme.colors.dark[2] : theme.colors.gray[6] }} />
          <Text size="xs" fw={600} c="dimmed">
            {t("rules.title")} ({replaceInfos.length})
          </Text>
        </Group>
        <Group gap={4}>
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<Trash size={12} />}
            onClick={clearAllRules}
            disabled={replaceInfos.length === 0}
            radius="md"
            color="gray"
          >
            {t("rules.clearAll")}
          </Button>
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<Plus size={12} />}
            onClick={addReplaceInfo}
            radius="md"
          >
            {t("rules.addRule")}
          </Button>
        </Group>
      </Group>

      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        <Stack gap="xs">
          {replaceInfos.length === 0 ? (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
              <Text size="sm" c="dimmed">{t("rules.addRule")}</Text>
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
