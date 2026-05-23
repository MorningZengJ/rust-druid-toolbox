import {
  Flex,
  Box,
  Text,
  ScrollArea,
  Badge,
  ActionIcon,
  Button,
  useMantineTheme,
} from "@mantine/core";
import {
  StopCircle,
  Trash2,
  Circle,
  Loader2,
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

function statusBadge(status: string) {
  switch (status) {
    case "connecting":
      return (
        <Badge variant="outline" size="xs" leftSection={<Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />}>
          连接中
        </Badge>
      );
    case "recording":
      return (
        <Badge color="red" size="xs" leftSection={<Circle size={8} fill="currentColor" />}>
          录制中
        </Badge>
      );
    case "stopping":
      return (
        <Badge variant="outline" size="xs" leftSection={<Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />}>
          停止中
        </Badge>
      );
    case "stopped":
      return (
        <Badge variant="light" color="gray" size="xs">已停止</Badge>
      );
    case "error":
      return (
        <Badge color="red" variant="light" size="xs">错误</Badge>
      );
    default:
      return null;
  }
}

export function TaskList() {
  const tasks = useLiveRecordStore((s) => s.tasks);
  const selectedTaskId = useLiveRecordStore((s) => s.selectedTaskId);
  const stopRecording = useLiveRecordStore((s) => s.stopRecording);
  const selectTask = useLiveRecordStore((s) => s.selectTask);
  const removeTask = useLiveRecordStore((s) => s.removeTask);
  const theme = useMantineTheme();

  const taskEntries = Object.entries(tasks);

  return (
    <>
      <Box
        px="sm"
        py="xs"
        style={{ borderTop: `1px solid ${theme.colors.gray[3]}` }}
      >
        <Text size="xs" fw={500} c="dimmed">
          录制任务 ({taskEntries.length})
        </Text>
      </Box>

      <Box h={200} style={{ flexShrink: 0, borderBottom: `1px solid ${theme.colors.gray[3]}` }}>
        <ScrollArea h="100%">
          <Box p="xs">
            {taskEntries.length > 0 ? (
              taskEntries.map(([id, task]) => (
                <Box
                  key={id}
                  p="xs"
                  mb={4}
                  style={{
                    cursor: "pointer",
                    borderRadius: theme.radius.sm,
                    border: selectedTaskId === id
                      ? `1px solid ${theme.colors[theme.primaryColor][6]}`
                      : "1px solid transparent",
                    backgroundColor: selectedTaskId === id
                      ? `${theme.colors[theme.primaryColor][0]}`
                      : undefined,
                    transition: "all 150ms ease",
                  }}
                  onClick={() => selectTask(id)}
                >
                  <Flex justify="space-between" align="center" gap="xs">
                    <Text size="xs" fw={500} style={{ flex: 1 }} truncate>
                      {task.info.url.split(/[/\\]/).pop() || task.info.url}
                    </Text>
                    <Flex align="center" gap={4}>
                      {statusBadge(task.info.status)}
                      {(task.info.status === "stopped" ||
                        task.info.status === "error") && (
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          color="gray"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTask(id);
                          }}
                        >
                          <Trash2 size={10} />
                        </ActionIcon>
                      )}
                    </Flex>
                  </Flex>
                  <Flex align="center" gap="xs" mt={4} c="dimmed">
                    {task.progress && (
                      <>
                        <Text size="xs">
                          {formatDuration(task.progress.durationSecs)}
                        </Text>
                        <Text size="xs">{formatSize(task.progress.fileSizeBytes)}</Text>
                        {task.progress.bitrateKbps > 0 && (
                          <Text size="xs">
                            {task.progress.bitrateKbps.toFixed(0)} kbps
                          </Text>
                        )}
                      </>
                    )}
                    {(task.info.status === "recording" ||
                      task.info.status === "connecting") && (
                      <Button
                        variant="subtle"
                        size="compact-xs"
                        color="red"
                        ml="auto"
                        leftSection={<StopCircle size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          stopRecording(id);
                        }}
                      >
                        停止
                      </Button>
                    )}
                  </Flex>
                </Box>
              ))
            ) : (
              <Flex h="100%" align="center" justify="center" py="xl">
                <Text size="xs" c="dimmed">暂无录制任务</Text>
              </Flex>
            )}
          </Box>
        </ScrollArea>
      </Box>
    </>
  );
}
