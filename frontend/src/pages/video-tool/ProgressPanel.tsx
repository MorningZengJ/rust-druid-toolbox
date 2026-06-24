import { Box, Flex, Text, ScrollArea, Stack, Progress, Group } from "@mantine/core";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";

function formatEta(ms: number, t: (key: string, options?: any) => string): string {
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return t("time.seconds", { count: totalSec });
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return t("time.minutesSeconds", { minutes: min, seconds: sec });
}

export function ProgressPanel() {
  const { t } = useTranslation(["videoTool", "common"]);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const progress = useVideoToolStore((s) => s.progress);
  const logs = useVideoToolStore((s) => s.logs);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);
  const mergeProgressDetail = useVideoToolStore((s) => s.mergeProgressDetail);

  return (
    <Flex
      direction="column"
      style={{
        height: "100%",
        overflow: "hidden",
        borderRadius: 10,
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--surface-raised)",
        position: "relative",
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
          zIndex: 1,
        }}
      />

      <Box px="md" py="xs" style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-panel)" }}>
        <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>{t("progress.title")}</Text>
      </Box>
      <Box p="md">
        {isProcessing && (
          <Box mb="md">
            <Flex justify="space-between" mb={4}>
              <Text size="xs" style={{ fontFamily: "var(--font-body)" }}>{t("progress.processing")}</Text>
              <Text size="xs" style={{ fontFamily: "var(--font-mono)" }}>{Math.round(progress * 100)}%</Text>
            </Flex>
            <Progress value={progress * 100} size="sm" radius="xl" />
          </Box>
        )}

        {isProcessing && mergeProgressDetail && (
          <Stack gap={4} mb="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-body)" }}>
                {t("progress.fileProgress", { current: mergeProgressDetail.currentFileIndex + 1, total: mergeProgressDetail.totalFiles })}
                {mergeProgressDetail.currentFileName && ` - ${mergeProgressDetail.currentFileName}`}
              </Text>
            </Group>
            {mergeProgressDetail.framesProcessed > 0 && mergeProgressDetail.totalFrames > 0 && (
              <Group justify="space-between">
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>
                  {t("progress.frameProgress", { processed: mergeProgressDetail.framesProcessed, total: mergeProgressDetail.totalFrames })}
                </Text>
                {mergeProgressDetail.speed > 0 && (
                  <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>
                    {Math.round(mergeProgressDetail.speed)} fps
                  </Text>
                )}
              </Group>
            )}
            {mergeProgressDetail.etaMs > 0 && (
              <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>
                {t("progress.timeRemaining", { time: formatEta(mergeProgressDetail.etaMs, t) })}
              </Text>
            )}
          </Stack>
        )}

        {errorMessage && (
          <Flex
            align="center"
            gap="xs"
            mb="md"
            px="sm"
            py="xs"
            style={{
              borderRadius: 8,
              backgroundColor: "var(--status-error-bg)",
              border: "1px solid var(--status-error-border)",
            }}
          >
            <AlertCircle size={16} style={{ color: "var(--status-error)", flexShrink: 0 }} />
            <Text size="sm" style={{ color: "var(--status-error)" }}>{errorMessage}</Text>
          </Flex>
        )}

        {!isProcessing && progress >= 1 && !errorMessage && (
          <Flex
            align="center"
            gap="xs"
            mb="md"
            px="sm"
            py="xs"
            style={{
              borderRadius: 8,
              backgroundColor: "var(--status-success-bg)",
              border: "1px solid var(--status-success-border)",
            }}
          >
            <CheckCircle2 size={16} style={{ color: "var(--status-success)", flexShrink: 0 }} />
            <Text size="sm" style={{ color: "var(--status-success)" }}>{t("progress.completed")}</Text>
          </Flex>
        )}
      </Box>

      <Flex direction="column" flex={1} style={{ minHeight: 0, borderTop: "1px solid var(--border-default)" }}>
        <Box px="md" py="xs" style={{ backgroundColor: "var(--surface-panel)" }}>
          <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>{t("progress.log")}</Text>
        </Box>
        <ScrollArea style={{ flex: 1 }} px="md" pb="md">
          <Stack gap={2} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
            {logs.map((log, i) => (
              <Text
                key={i}
                size="xs"
                style={{
                  color: log.level === "error"
                    ? "var(--status-error)"
                    : log.level === "warn"
                      ? "var(--status-warning)"
                      : "var(--text-muted)",
                }}
              >
                {log.message}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text size="xs" c="dimmed">{t("progress.waiting")}</Text>
            )}
          </Stack>
        </ScrollArea>
      </Flex>
    </Flex>
  );
}
