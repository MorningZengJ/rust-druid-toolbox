import {
  Stack,
  Group,
  Text,
  Button,
  Switch,
  Box,
  Progress,
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
import { useTranslation } from "react-i18next";
import { useUpdateStore } from "@/stores/updateStore";
import type { UpdateStatus } from "@/types";

export default function UpdateSection() {
  const { t } = useTranslation("settings");

  const {
    currentVersion,
    latestVersion,
    releaseNotes,
    progress,
    error,
    errorCode,
    autoCheck,
    checkForUpdate,
    downloadAndInstall,
    setAutoCheck,
  } = useUpdateStore();

  const status: UpdateStatus = useUpdateStore((s) => s.status);

  const getErrorMessage = (): string => {
    if (!error && !errorCode) return t("update.status.errorDefault");
    switch (errorCode) {
      case "offline":
        return t("update.error.offline");
      case "network":
        return t("update.error.network");
      case "timeout":
        return t("update.error.timeout");
      case "signature":
        return t("update.error.signature");
      case "parse":
        return t("update.error.parse");
      default:
        return t("update.error.unknown", { detail: error ?? "" });
    }
  };

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
            {t("update.buttons.checking")}
          </Badge>
        );
      case "available":
        return (
          <Badge
            variant="light"
            leftSection={<Sparkles size={12} />}
            styles={{ root: { textTransform: "none" } }}
          >
            {t("update.buttons.available")}
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
            {t("update.buttons.downloading", { progress: progress.percentage > 0 ? `${progress.percentage}%` : "" })}
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
            {t("update.buttons.downloaded")}
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
            {t("update.buttons.notAvailable")}
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
            {t("update.buttons.error")}
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
            {t("update.status.idle")}
          </Text>
        );

      case "checking":
        return (
          <Group gap="xs">
            <Loader2
              size={14}
              style={{
                animation: "spin 1s linear infinite",
                color: "var(--accent-primary)",
              }}
            />
            <Text size="sm" c="dimmed">{t("update.status.checking")}</Text>
          </Group>
        );

      case "available":
        return (
          <Stack gap="sm">
            <Group gap="xs" align="center">
              <ArrowUpCircle size={16} style={{ color: "var(--status-success)" }} />
              <Text size="sm" fw={500}>
                {t("update.status.available")}{" "}
                <Text span fw={700} style={{ color: "var(--status-success)" }}>
                  v{latestVersion}
                </Text>
              </Text>
            </Group>
            {releaseNotes && (
              <Box
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  backgroundColor: "var(--surface-panel)",
                  border: "1px solid var(--border-subtle)",
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
              <Text size="sm" c="dimmed">{t("update.status.downloading")}</Text>
              {progress.totalBytes && (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>
                  {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                </Text>
              )}
            </Group>
            <Progress
              value={progress.percentage}
              animated
              size="sm"
              radius="xl"
            />
          </Stack>
        );

      case "downloaded":
        return (
          <Group gap="xs">
            <Check size={14} style={{ color: "var(--status-success)" }} />
            <Text size="sm">{t("update.status.downloaded")}</Text>
          </Group>
        );

      case "no-update":
        return (
          <Group gap="xs">
            <Check size={14} style={{ color: "var(--status-success)" }} />
            <Text size="sm" c="dimmed">
              {t("update.status.notAvailable", { version: currentVersion })}
            </Text>
          </Group>
        );

      case "error":
        return (
          <Stack gap="xs">
            <Group gap="xs">
              <AlertCircle size={14} style={{ color: "var(--status-error)" }} />
              <Text size="sm" style={{ color: "var(--status-error)" }}>
                {getErrorMessage()}
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
                color: "var(--accent-primary)",
              }}
            />
            <Text size="sm" c="dimmed">{t("update.status.installing")}</Text>
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
            {t("update.actions.downloadInstall")}
          </Button>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<RefreshCw size={14} />}
            onClick={checkForUpdate}
            radius="md"
          >
            {t("update.actions.recheck")}
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
          {t("update.actions.recheck")}
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
        {t("update.actions.checkUpdate")}
      </Button>
    );
  };

  return (
    <>
      {/* Version Display */}
      <Box
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          background: "linear-gradient(135deg, var(--accent-glow), transparent)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px var(--accent-glow)",
              }}
            >
              <Package size={16} color="white" />
            </Box>
            <div>
              <Text size="sm" fw={600} style={{ fontFamily: "var(--font-display)" }}>Tauri Toolbox</Text>
              <Text size="xs" c="dimmed">{t("update.appDescription")}</Text>
            </div>
          </Group>
          <Tooltip label={t("update.currentVersion")} position="left" withArrow>
            <Badge
              variant="filled"
              styles={{
                root: {
                  fontFamily: "var(--font-mono)",
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
            <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>{t("update.updateStatus")}</Text>
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
          borderRadius: 8,
          backgroundColor: "var(--surface-panel)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>{t("update.autoCheck")}</Text>
            <Text size="xs" c="dimmed">{t("update.autoCheckDesc")}</Text>
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
