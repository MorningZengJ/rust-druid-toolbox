import { Box, Flex, Text, ScrollArea, Stack, Progress, Group, useMantineTheme } from "@mantine/core";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";

function formatEta(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec}秒`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}分${sec}秒`;
}

export function ProgressPanel() {
  const theme = useMantineTheme();
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const progress = useVideoToolStore((s) => s.progress);
  const logs = useVideoToolStore((s) => s.logs);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);
  const mergeProgressDetail = useVideoToolStore((s) => s.mergeProgressDetail);

  return (
    <Flex direction="column" style={{ height: "100%", overflow: "hidden", borderRadius: theme.radius.md, border: `1px solid ${theme.colors.dark[4]}` }}>
      <Box px="md" py="xs" style={{ borderBottom: `1px solid ${theme.colors.dark[4]}` }}>
        <Text size="sm" fw={500}>进度</Text>
      </Box>
      <Box p="md">
        {isProcessing && (
          <Box mb="md">
            <Flex justify="space-between" mb={4}>
              <Text size="xs">处理中...</Text>
              <Text size="xs">{Math.round(progress * 100)}%</Text>
            </Flex>
            <Progress value={progress * 100} size="sm" radius="xl" />
          </Box>
        )}

        {isProcessing && mergeProgressDetail && (
          <Stack gap={4} mb="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                文件 {mergeProgressDetail.currentFileIndex + 1}/{mergeProgressDetail.totalFiles}
                {mergeProgressDetail.currentFileName && ` - ${mergeProgressDetail.currentFileName}`}
              </Text>
            </Group>
            {mergeProgressDetail.framesProcessed > 0 && mergeProgressDetail.totalFrames > 0 && (
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  帧 {mergeProgressDetail.framesProcessed}/{mergeProgressDetail.totalFrames}
                </Text>
                {mergeProgressDetail.speed > 0 && (
                  <Text size="xs" c="dimmed">
                    {Math.round(mergeProgressDetail.speed)} fps
                  </Text>
                )}
              </Group>
            )}
            {mergeProgressDetail.etaMs > 0 && (
              <Text size="xs" c="dimmed">
                预计剩余: {formatEta(mergeProgressDetail.etaMs)}
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
            style={{ borderRadius: 6, background: `${theme.colors.red[0]}` }}
          >
            <AlertCircle size={16} color={theme.colors.red[6]} style={{ flexShrink: 0 }} />
            <Text size="sm" c="red">{errorMessage}</Text>
          </Flex>
        )}

        {!isProcessing && progress >= 1 && !errorMessage && (
          <Flex
            align="center"
            gap="xs"
            mb="md"
            px="sm"
            py="xs"
            style={{ borderRadius: 6, background: `${theme.colors.green[0]}` }}
          >
            <CheckCircle2 size={16} color={theme.colors.green[6]} style={{ flexShrink: 0 }} />
            <Text size="sm" c="green">处理完成</Text>
          </Flex>
        )}
      </Box>

      <Flex direction="column" flex={1} style={{ minHeight: 0, borderTop: `1px solid ${theme.colors.dark[4]}` }}>
        <Box px="md" py="xs">
          <Text size="sm" fw={500}>日志</Text>
        </Box>
        <ScrollArea style={{ flex: 1 }} px="md" pb="md">
          <Stack gap={2} style={{ fontFamily: "monospace", fontSize: 12 }}>
            {logs.map((log, i) => (
              <Text
                key={i}
                size="xs"
                c={log.level === "error" ? "red" : log.level === "warn" ? "yellow" : "dimmed"}
              >
                {log.message}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text size="xs" c="dimmed">等待操作...</Text>
            )}
          </Stack>
        </ScrollArea>
      </Flex>
    </Flex>
  );
}
