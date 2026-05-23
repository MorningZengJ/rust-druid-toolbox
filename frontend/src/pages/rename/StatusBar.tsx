import { Button, Badge, Group, Text, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { Play, AlertTriangle, CheckCircle } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";

export default function StatusBar() {
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
      title: "确认重命名",
      children: (
        <Text size="sm">
          即将对 {filterFileList.length} 个文件执行 {activeRules.length} 条替换规则。
          此操作不可撤销，确定继续吗？
        </Text>
      ),
      labels: { confirm: "确认执行", cancel: "取消" },
      onConfirm: executeRenames,
    });
  };

  return (
    <Group
      justify="space-between"
      px="sm"
      py={6}
      style={{
        borderTop: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
      }}
    >
      <Group gap="sm">
        <Text size="xs" c="dimmed">
          {filterFileList.length} 个文件
        </Text>

        {hasChanges && (
          <Badge variant="light" size="sm">
            {activeRules.length} 条规则
          </Badge>
        )}

        {hasConflicts && (
          <Badge color="red" variant="filled" size="sm" leftSection={<AlertTriangle size={12} />}>
            {conflicts.length} 个冲突
          </Badge>
        )}

        {status && (
          <Badge variant="filled" size="sm" leftSection={<CheckCircle size={12} />}>
            完成: {status.success}/{status.total}
            {status.errors.length > 0 && `, ${status.errors.length} 个错误`}
          </Badge>
        )}
      </Group>

      <Button
        size="compact-sm"
        leftSection={<Play size={14} />}
        disabled={!hasChanges || hasConflicts || filterFileList.length === 0}
        onClick={handleExecute}
      >
        执行重命名
      </Button>
    </Group>
  );
}
