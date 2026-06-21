import {
  Stack,
  Group,
  Text,
  Button,
  Switch,
  Box,
  Progress,
  useMantineTheme,
  useComputedColorScheme,
  Collapse,
  Badge,
  Tooltip,
} from "@mantine/core";
import {
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  Package,
  ArrowUpCircle,
  Sparkles,
} from "lucide-react";
import { useUpdateStore } from "@/stores/updateStore";
import type { UpdateStatus } from "@/types";

export default function UpdateSection() {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

  const {
    currentVersion,
    latestVersion,
    releaseNotes,
    progress,
    error,
    autoCheck,
    checkForUpdate,
    downloadAndInstall,
    setAutoCheck,
  } = useUpdateStore();

  // Read status directly to avoid TypeScript narrowing issues across function calls
  const status: UpdateStatus = useUpdateStore((s) => s.status);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderStatusBadge = () => {
    switch (status) {
      case "idle":
        return null;
      case "checking":
        return (
          <Badge
            variant="light"
            color="blue"
            leftSection={<Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
            styles={{ root: { textTransform: "none" } }}
          >
            检查中...
          </Badge>
        );
      case "available":
        return (
          <Badge
            variant="light"
            color="teal"
            leftSection={<Sparkles size={12} />}
            styles={{ root: { textTransform: "none" } }}
          >
            有新版本
          </Badge>
        );
      case "downloading":
        return (
          <Badge
            variant="light"
            color="blue"
            leftSection={<Download size={12} />}
            styles={{ root: { textTransform: "none" } }}
          >
            下载中 {progress.percentage > 0 ? `${progress.percentage}%` : ""}
          </Badge>
        );
      case "downloaded":
        return (
          <Badge
            variant="light"
            color="green"
            leftSection={<Check size={12} />}
            styles={{ root: { textTransform: "none" } }}
          >
            已下载
          </Badge>
        );
      case "no-update":
        return (
          <Badge
            variant="light"
            color="green"
            leftSection={<Check size={12} />}
            styles={{ root: { textTransform: "none" } }}
          >
            已是最新
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="light"
            color="red"
            leftSection={<AlertCircle size={12} />}
            styles={{ root: { textTransform: "none" } }}
          >
            检查失败
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (status) {
      case "idle":
        return (
          <Text size="sm" c="dimmed">
            点击下方按钮检查是否有新版本可用
          </Text>
        );

      case "checking":
        return (
          <Group gap="xs">
            <Loader2
              size={14}
              style={{
                animation: "spin 1s linear infinite",
                color: theme.colors[theme.primaryColor][isDark ? 4 : 6],
              }}
            />
            <Text size="sm" c="dimmed">正在检查更新...</Text>
          </Group>
        );

      case "available":
        return (
          <Stack gap="sm">
            <Group gap="xs" align="center">
              <ArrowUpCircle
                size={16}
                style={{ color: theme.colors.teal[isDark ? 4 : 6] }}
              />
              <Text size="sm" fw={500}>
                发现新版本{" "}
                <Text
                  span
                  fw={700}
                  style={{ color: theme.colors.teal[isDark ? 4 : 6] }}
                >
                  v{latestVersion}
                </Text>
              </Text>
            </Group>
            {releaseNotes && (
              <Box
                style={{
                  padding: "8px 12px",
                  borderRadius: theme.radius.sm,
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.03)"
                    : "rgba(0, 0, 0, 0.02)",
                  border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
                  maxHeight: 120,
                  overflow: "auto",
                }}
              >
                <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {releaseNotes}
                </Text>
              </Box>
            )}
          </Stack>
        );

      case "downloading":
        return (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">正在下载更新...</Text>
              {progress.totalBytes && (
                <Text size="xs" c="dimmed">
                  {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                </Text>
              )}
            </Group>
            <Progress
              value={progress.percentage}
              animated
              size="sm"
              radius="xl"
              styles={{
                root: {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(0, 0, 0, 0.06)",
                },
              }}
            />
          </Stack>
        );

      case "downloaded":
        return (
          <Group gap="xs">
            <Check size={14} style={{ color: theme.colors.green[isDark ? 4 : 6] }} />
            <Text size="sm">更新已下载完成，即将重启应用...</Text>
          </Group>
        );

      case "no-update":
        return (
          <Group gap="xs">
            <Check size={14} style={{ color: theme.colors.green[isDark ? 4 : 6] }} />
            <Text size="sm" c="dimmed">
              当前版本 v{currentVersion} 已是最新
            </Text>
          </Group>
        );

      case "error":
        return (
          <Stack gap="xs">
            <Group gap="xs">
              <AlertCircle size={14} style={{ color: theme.colors.red[isDark ? 4 : 6] }} />
              <Text size="sm" c="red">
                {error || "检查更新失败，请检查网络连接"}
              </Text>
            </Group>
          </Stack>
        );

      case "installing":
        return (
          <Group gap="xs">
            <Loader2
              size={14}
              style={{
                animation: "spin 1s linear infinite",
                color: theme.colors[theme.primaryColor][isDark ? 4 : 6],
              }}
            />
            <Text size="sm" c="dimmed">正在安装更新...</Text>
          </Group>
        );

      default:
        return null;
    }
  };

  const renderActions = () => {
    const isBusy = status === "checking" || status === "downloading" || status === "downloaded";

    if (status === "available") {
      return (
        <Group gap="xs">
          <Button
            size="compact-sm"
            leftSection={<Download size={14} />}
            onClick={downloadAndInstall}
            radius="md"
          >
            下载并安装
          </Button>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<RefreshCw size={14} />}
            onClick={checkForUpdate}
            radius="md"
          >
            重新检查
          </Button>
        </Group>
      );
    }

    if (status === "error" || status === "no-update") {
      return (
        <Button
          size="compact-sm"
          variant="default"
          leftSection={<RefreshCw size={14} />}
          onClick={checkForUpdate}
          radius="md"
        >
          重新检查
        </Button>
      );
    }

    if (isBusy) return null;

    return (
      <Button
        size="compact-sm"
        variant="light"
        leftSection={<RefreshCw size={14} />}
        onClick={checkForUpdate}
        radius="md"
      >
        检查更新
      </Button>
    );
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Version Display */}
      <Box
        style={{
          padding: "12px 16px",
          borderRadius: theme.radius.md,
          background: isDark
            ? `linear-gradient(135deg, ${theme.colors[theme.primaryColor][9]}15, ${theme.colors[theme.primaryColor][8]}08)`
            : `linear-gradient(135deg, ${theme.colors[theme.primaryColor][0]}60, ${theme.colors[theme.primaryColor][1]}30)`,
          border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}`,
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${theme.colors[theme.primaryColor][5]}, ${theme.colors[theme.primaryColor][7]})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={16} color="white" />
            </Box>
            <div>
              <Text size="sm" fw={600}>MToolbox</Text>
              <Text size="xs" c="dimmed">批量重命名 / 字符画 / 视频工具</Text>
            </div>
          </Group>
          <Tooltip label="当前安装版本" position="left" withArrow>
            <Badge
              variant="filled"
              styles={{
                root: {
                  fontFamily: "monospace",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                },
              }}
            >
              v{currentVersion || "..."}
            </Badge>
          </Tooltip>
        </Group>
      </Box>

      {/* Update Status & Actions */}
      <Stack gap="sm" mt="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500}>更新状态</Text>
            {renderStatusBadge()}
          </Group>
        </Group>

        <Collapse expanded={status !== "idle"}>
          <Box py="xs">{renderContent()}</Box>
        </Collapse>

        {renderActions()}
      </Stack>

      {/* Auto-check Toggle */}
      <Box
        mt="sm"
        style={{
          padding: "10px 12px",
          borderRadius: theme.radius.sm,
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.02)"
            : "rgba(0, 0, 0, 0.01)",
          border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}`,
        }}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" fw={500}>启动时自动检查</Text>
            <Text size="xs" c="dimmed">应用启动时自动检查是否有新版本</Text>
          </div>
          <Switch
            checked={autoCheck}
            onChange={(e) => setAutoCheck(e.currentTarget.checked)}
            size="sm"
          />
        </Group>
      </Box>
    </>
  );
}
