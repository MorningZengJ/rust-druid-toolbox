import { Button, Badge, Group, Text, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { Play, AlertTriangle, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRenameStore } from "@/stores/renameStore";

export default function StatusBar() {
  const { t } = useTranslation("rename");
  const filterFileList = useRenameStore((s) => s.filterFileList);
  const replaceInfos = useRenameStore((s) => s.replaceInfos);
  const conflicts = useRenameStore((s) => s.conflicts);
  const status = useRenameStore((s) => s.status);
  const executeRenames = useRenameStore((s) => s.executeRenames);

  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";
  const modals = useModals();

  const activeRules = replaceInfos.filter((r) => r.enable);
  const hasChanges = activeRules.length > 0;
  const hasConflicts = conflicts.length > 0;

  const handleExecute = () => {
    modals.openConfirmModal({
      title: t("dialog.confirmTitle"),
      children: (
        <Text size="sm">
          {t("dialog.confirmMessage", { fileCount: filterFileList.length, ruleCount: activeRules.length })}
        </Text>
      ),
      labels: { confirm: t("dialog.confirmExecute"), cancel: t("dialog.cancel") },
      onConfirm: executeRenames,
    });
  };

  return (
    <Group
      justify="space-between"
      px="sm"
      py={6}
      style={{
        borderTop: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
    >
      <Group gap="sm">
        <Text size="xs" c="dimmed">
          {t("status.fileCount", { count: filterFileList.length })}
        </Text>

        {hasChanges && (
          <Badge variant="light" size="sm" radius="sm">
            {t("status.ruleCount", { count: activeRules.length })}
          </Badge>
        )}

        {hasConflicts && (
          <Badge color="red" variant="filled" size="sm" radius="sm" leftSection={<AlertTriangle size={12} />}>
            {t("status.conflictCount", { count: conflicts.length })}
          </Badge>
        )}

        {status && (
          <Badge variant="filled" size="sm" radius="sm" leftSection={<CheckCircle size={12} />}>
            {t("status.completed", { success: status.success, total: status.total })}
            {status.errors.length > 0 && `, ${t("status.errors", { count: status.errors.length })}`}
          </Badge>
        )}
      </Group>

      <Button
        size="compact-sm"
        leftSection={<Play size={14} />}
        disabled={!hasChanges || hasConflicts || filterFileList.length === 0}
        onClick={handleExecute}
        radius="md"
      >
        {t("status.executeRename")}
      </Button>
    </Group>
  );
}
