import { Box, Flex, Stack, Text, Progress, ScrollArea, useMantineTheme } from "@mantine/core";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useVideoToolStore } from "@/stores/videoToolStore";

export function ConvertProgressPanel() {
  const theme = useMantineTheme();
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
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.dark[4]}`,
      }}
    >
      <Box
        px="md"
        py="xs"
        style={{ borderBottom: `1px solid ${theme.colors.dark[4]}` }}
      >
        <Text size="sm" fw={500}>
          进度
        </Text>
      </Box>
      <Box p="md">
        {convertBatchProgress && (
          <Box mb="md">
            <Flex justify="space-between" mb={4}>
              <Text size="xs">
                总进度 {convertBatchProgress.currentIndex}/{convertBatchProgress.totalCount} 文件
              </Text>
              <Text size="xs">
                {Math.round(convertBatchProgress.overallProgress * 100)}%
              </Text>
            </Flex>
            <Progress
              value={convertBatchProgress.overallProgress * 100}
              size="sm"
              radius="xl"
              color="blue"
            />
          </Box>
        )}

        {isProcessing && convertBatchProgress && (
          <Box mb="md">
            <Flex justify="space-between" mb={4}>
              <Text size="xs" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                当前文件: {convertBatchProgress.currentFileName}
              </Text>
              <Text size="xs">
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
            style={{ borderRadius: 6, background: `${theme.colors.red[0]}` }}
          >
            <AlertCircle
              size={16}
              color={theme.colors.red[6]}
              style={{ flexShrink: 0 }}
            />
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
              borderRadius: 6,
              background:
                convertBatchResult.failCount > 0
                  ? `${theme.colors.yellow[0]}`
                  : `${theme.colors.green[0]}`,
            }}
          >
            {convertBatchResult.failCount > 0 ? (
              <>
                <AlertCircle
                  size={16}
                  color={theme.colors.yellow[6]}
                  style={{ flexShrink: 0 }}
                />
                <Text size="sm" c="yellow">
                  转换完成: {convertBatchResult.successCount} 成功,{" "}
                  {convertBatchResult.failCount} 失败
                </Text>
              </>
            ) : (
              <>
                <CheckCircle2
                  size={16}
                  color={theme.colors.green[6]}
                  style={{ flexShrink: 0 }}
                />
                <Text size="sm" c="green">
                  转换完成: {convertBatchResult.successCount} 个文件全部成功
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
          borderTop: `1px solid ${theme.colors.dark[4]}`,
        }}
      >
        <Box px="md" py="xs">
          <Text size="sm" fw={500}>
            日志
          </Text>
        </Box>
        <ScrollArea style={{ flex: 1 }} px="md" pb="md">
          <Stack
            gap={2}
            style={{ fontFamily: "monospace", fontSize: 12 }}
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
                等待操作...
              </Text>
            )}
            <div ref={logEndRef} />
          </Stack>
        </ScrollArea>
      </Flex>
    </Flex>
  );
}
