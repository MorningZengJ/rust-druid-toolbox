import {
  Flex,
  Box,
  Text,
  Button,
  useMantineTheme,
} from "@mantine/core";
import {
  Radio,
  Loader2,
  MonitorPlay,
  StopCircle,
} from "lucide-react";
import { useLiveRecordStore } from "@/stores/liveRecordStore";

function formatDuration(secs: number): string {
  if (secs < 60) return `${Math.floor(secs)}s`;
  const mins = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  if (mins < 60) return `${mins}:${s.toString().padStart(2, "0")}`;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return `${hrs}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function PreviewPanel() {
  const tasks = useLiveRecordStore((s) => s.tasks);
  const selectedTaskId = useLiveRecordStore((s) => s.selectedTaskId);
  const stopRecording = useLiveRecordStore((s) => s.stopRecording);
  const theme = useMantineTheme();

  const selectedTask =
    selectedTaskId ? tasks[selectedTaskId] ?? null : null;

  const taskEntries = Object.entries(tasks);
  const hasActiveTasks = taskEntries.some(
    ([, t]) =>
      t.info.status === "recording" || t.info.status === "connecting"
  );

  return (
    <Flex
      direction="column"
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.gray[3]}`,
      }}
    >
      <Flex
        align="center"
        px="sm"
        py="xs"
        style={{ borderBottom: `1px solid ${theme.colors.gray[3]}` }}
      >
        <Text size="xs" fw={500} c="dimmed">
          {selectedTask
            ? `实时预览 - ${selectedTask.info.url}`
            : "实时预览"}
        </Text>
        {selectedTask &&
          (selectedTask.info.status === "recording" ||
            selectedTask.info.status === "connecting") && (
            <Button
              variant="subtle"
              size="compact-xs"
              color="red"
              ml="auto"
              leftSection={<StopCircle size={12} />}
              onClick={() => stopRecording(selectedTaskId!)}
            >
              停止
            </Button>
          )}
      </Flex>

      <Box style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        {selectedTask ? (
          <>
            {selectedTask.previewObjectUrl ? (
              <img
                src={selectedTask.previewObjectUrl}
                alt="Live preview"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <Flex h="100%" align="center" justify="center">
                {selectedTask.info.status === "connecting" ? (
                  <Flex direction="column" align="center" gap="xs" c="dimmed">
                    <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: theme.colors[theme.primaryColor][6] }} />
                    <Text size="sm">正在连接...</Text>
                  </Flex>
                ) : selectedTask.info.status === "recording" ? (
                  <Flex direction="column" align="center" gap="xs" c="dimmed">
                    <Radio size={32} color="red" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
                    <Text size="sm">录制中，等待预览画面...</Text>
                  </Flex>
                ) : (
                  <Flex direction="column" align="center" gap="xs" c="dimmed">
                    <MonitorPlay size={32} />
                    <Text size="sm">
                      {selectedTask.info.status === "stopped"
                        ? "录制已停止"
                        : "录制出错"}
                    </Text>
                  </Flex>
                )}
              </Flex>
            )}

            {selectedTask.progress && (
              <Flex
                gap="md"
                align="center"
                px="sm"
                py={6}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  color: "white",
                  fontSize: "var(--mantine-font-size-xs)",
                }}
              >
                <span>时长: {formatDuration(selectedTask.progress.durationSecs)}</span>
                <span>大小: {formatSize(selectedTask.progress.fileSizeBytes)}</span>
                {selectedTask.progress.bitrateKbps > 0 && (
                  <span>码率: {selectedTask.progress.bitrateKbps.toFixed(0)} kbps</span>
                )}
                {selectedTask.progress.currentSegment > 1 && (
                  <span>分段: {selectedTask.progress.currentSegment}</span>
                )}
                <span style={{ marginLeft: "auto", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedTask.progress.outputPath.split(/[/\\]/).pop()}
                </span>
              </Flex>
            )}
          </>
        ) : (
          <Flex h="100%" align="center" justify="center">
            <Text size="sm" c="dimmed">
              {hasActiveTasks
                ? "从左侧选择任务查看预览"
                : "配置参数后点击「开始录制」"}
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
