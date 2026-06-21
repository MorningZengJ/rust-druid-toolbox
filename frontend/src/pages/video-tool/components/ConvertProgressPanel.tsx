import { Box, Flex, Stack, Text, Progress, ScrollArea } from "@mantine/core";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";

export function ConvertProgressPanel() {
  const { t } = useTranslation("videoTool");
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const convertBatchProgress = useVideoToolStore((s) => s.convertBatchProgress);
  const convertCurrentFileProgress = useVideoToolStore((s) => s.convertCurrentFileProgress);
  const convertBatchResult = useVideoToolStore((s) => s.convertBatchResult);
  const logs = useVideoToolStore((s) => s.logs);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);

  const logEndRef = useRef<HTMLDivElement>(null);
  const isComplete = !isProcessing && convertBatchResult !== null;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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

      <Box
        px="md"
        py="xs"
        style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-panel)" }}
      >
        <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
          {t("convertProgress.title")}
        </Text>
      </Box>
      <Box p="md">
        {convertBatchProgress && (
          <Box mb="md">
            <Flex justify="space-between" mb={4}>
              <Text size="xs" style={{ fontFamily: "var(--font-body)" }}>
                {t("convertProgress.batchProgress", { current: convertBatchProgress.currentIndex, total: convertBatchProgress.totalCount })}
              </Text>
              <Text size="xs" style={{ fontFamily: "var(--font-mono)" }}>
                {Math.round(convertBatchProgress.overallProgress * 100)}%
              </Text>
            </Flex>
            <Progress
              value={convertBatchProgress.overallProgress * 100}
              size="sm"
              radius="xl"
              color="amber"
            />
          </Box>
        )}

        {isProcessing && convertBatchProgress && (
          <Box mb="md">
            <Flex justify="space-between" mb={4}>
              <Text size="xs" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-body)" }}>
                {t("convertProgress.currentFile", { name: convertBatchProgress.currentFileName })}
              </Text>
              <Text size="xs" style={{ fontFamily: "var(--font-mono)" }}>
                {Math.round(convertCurrentFileProgress * 100)}%
              </Text>
            </Flex>
            <Progress
              value={convertCurrentFileProgress * 100}
              size="sm"
              radius="xl"
              color="teal"
            />
          </Box>
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
            <Text size="sm" c="red">
              {errorMessage}
            </Text>
          </Flex>
        )}

        {isComplete && convertBatchResult && (
          <Flex
            align="center"
            gap="xs"
            mb="md"
            px="sm"
            py="xs"
            style={{
              borderRadius: 8,
              backgroundColor: convertBatchResult.failCount > 0
                ? "var(--status-warning-bg)"
                : "var(--status-success-bg)",
              border: convertBatchResult.failCount > 0
                ? "1px solid var(--status-warning-border)"
                : "1px solid var(--status-success-border)",
            }}
          >
            {convertBatchResult.failCount > 0 ? (
              <>
                <AlertCircle size={16} style={{ color: "var(--status-warning)", flexShrink: 0 }} />
                <Text size="sm" c="yellow">
                  {t("convertProgress.completedWithResult", { success: convertBatchResult.successCount, fail: convertBatchResult.failCount })}
                </Text>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} style={{ color: "var(--status-success)", flexShrink: 0 }} />
                <Text size="sm" c="green">
                  {t("convertProgress.completedAllSuccess", { count: convertBatchResult.successCount })}
                </Text>
              </>
            )}
          </Flex>
        )}
      </Box>

      <Flex
        direction="column"
        flex={1}
        style={{
          minHeight: 0,
          borderTop: "1px solid var(--border-default)",
        }}
      >
        <Box px="md" py="xs" style={{ backgroundColor: "var(--surface-panel)" }}>
          <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
            {t("convertProgress.log")}
          </Text>
        </Box>
        <ScrollArea style={{ flex: 1 }} px="md" pb="md">
          <Stack
            gap={2}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
          >
            {logs.map((log, i) => (
              <Text
                key={i}
                size="xs"
                c={
                  log.level === "error"
                    ? "red"
                    : log.level === "warn"
                      ? "yellow"
                      : "dimmed"
                }
              >
                {log.message}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text size="xs" c="dimmed">
                {t("convertProgress.waiting")}
              </Text>
            )}
            <div ref={logEndRef} />
          </Stack>
        </ScrollArea>
      </Flex>
    </Flex>
  );
}
