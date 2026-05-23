import { useEffect, useState, useRef } from "react";
import {
  Button,
  TextInput,
  Select,
  ScrollArea,
  Box,
  Flex,
  Text,
  Stack,
  Group,
  Progress,
  useMantineTheme,
} from "@mantine/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import {
  Play,
  FileVideo,
  Music,
  Plus,
  Trash2,
  Loader2,
  Upload,
  Circle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import {
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  AUDIO_BITRATES,
  MEDIA_EXTENSIONS,
} from "./constants";
import type { ConvertFileItem } from "@/types";

function FileRow({
  file,
  index,
  onRemove,
  isProcessing,
  theme,
}: {
  file: ConvertFileItem;
  index: number;
  onRemove: (index: number) => void;
  isProcessing: boolean;
  theme: ReturnType<typeof useMantineTheme>;
}) {
  const statusIcon = {
    pending: <Circle size={10} color={theme.colors.gray[5]} fill={theme.colors.gray[5]} />,
    converting: <Loader2 size={12} className="animate-spin" color={theme.colors.blue[6]} />,
    done: <CheckCircle2 size={12} color={theme.colors.green[6]} />,
    error: <XCircle size={12} color={theme.colors.red[6]} />,
  };

  return (
    <Flex
      align="center"
      gap={4}
      px="xs"
      py={4}
      style={{ borderRadius: 4, background: theme.colors.dark[3] }}
    >
      {statusIcon[file.status]}
      <Text
        size="xs"
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={file.inputPath}
      >
        {file.inputPath.split(/[/\\]/).pop()}
      </Text>
      {file.error && (
        <Text
          size="xs"
          c="red"
          title={file.error}
          style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {file.error}
        </Text>
      )}
      <Button
        size="compact-xs"
        variant="subtle"
        color="red"
        style={{ width: 20, height: 20, padding: 0, minWidth: 20 }}
        onClick={() => onRemove(index)}
        disabled={isProcessing}
      >
        <Trash2 size={12} />
      </Button>
    </Flex>
  );
}

export function ConvertPanel() {
  const theme = useMantineTheme();
  const convertFiles = useVideoToolStore((s) => s.convertFiles);
  const convertTarget = useVideoToolStore((s) => s.convertTarget);
  const convertVideoFormat = useVideoToolStore((s) => s.convertVideoFormat);
  const convertAudioFormat = useVideoToolStore((s) => s.convertAudioFormat);
  const convertAudioBitrate = useVideoToolStore((s) => s.convertAudioBitrate);
  const convertVideoBitrate = useVideoToolStore((s) => s.convertVideoBitrate);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const convertBatchProgress = useVideoToolStore((s) => s.convertBatchProgress);
  const convertCurrentFileProgress = useVideoToolStore((s) => s.convertCurrentFileProgress);
  const convertBatchResult = useVideoToolStore((s) => s.convertBatchResult);
  const logs = useVideoToolStore((s) => s.logs);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);

  const addConvertInputs = useVideoToolStore((s) => s.addConvertInputs);
  const removeConvertInput = useVideoToolStore((s) => s.removeConvertInput);
  const setConvertTarget = useVideoToolStore((s) => s.setConvertTarget);
  const setConvertVideoFormat = useVideoToolStore((s) => s.setConvertVideoFormat);
  const setConvertAudioFormat = useVideoToolStore((s) => s.setConvertAudioFormat);
  const setConvertAudioBitrate = useVideoToolStore((s) => s.setConvertAudioBitrate);
  const setConvertVideoBitrate = useVideoToolStore((s) => s.setConvertVideoBitrate);
  const runBatchConvert = useVideoToolStore((s) => s.runBatchConvert);

  const [isDragOver, setIsDragOver] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "video-tool-convert",
    storage: localStorage,
  });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const allPaths: string[] = [];
        for (const p of event.payload.paths) {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          if (MEDIA_EXTENSIONS.includes(ext)) {
            allPaths.push(p);
          } else if (!ext || ext === p.toLowerCase()) {
            // Likely a folder — scan for media files
            try {
              const files = await invoke<string[]>("list_media_files_in_folder", { folderPath: p });
              allPaths.push(...files);
            } catch {
              // Ignore non-folder paths without extension
            }
          }
        }
        if (allPaths.length > 0) {
          addConvertInputs(allPaths);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addConvertInputs]);

  const addFiles = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: true,
      filters: [{ name: "媒体文件", extensions: MEDIA_EXTENSIONS }],
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      addConvertInputs(paths);
    }
  };

  const addFolder = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      const folderPath = selected as string;
      try {
        const files = await invoke<string[]>("list_media_files_in_folder", { folderPath });
        if (files.length > 0) {
          addConvertInputs(files);
        }
      } catch {
        // Ignore
      }
    }
  };

  const isComplete = !isProcessing && convertBatchResult !== null;

  return (
    <ResizablePanelGroup
      id="video-tool-convert"
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      style={{ height: "100%" }}
    >
      <ResizablePanel defaultSize={50} minSize={30}>
        <Box
          pos="relative"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            borderRadius: 8,
            border: `1px solid ${theme.colors.dark[4]}`,
          }}
        >
          {isDragOver && (
            <Flex
              pos="absolute"
              inset={0}
              align="center"
              justify="center"
              style={{
                zIndex: 50,
                borderRadius: 8,
                border: `2px dashed ${theme.colors.blue[6]}`,
                background: `${theme.colors.blue[0]}`,
              }}
            >
              <Stack align="center" gap="xs" c="blue">
                <Upload size={32} />
                <Text size="sm" fw={500}>
                  释放文件以添加
                </Text>
              </Stack>
            </Flex>
          )}
          <Box
            px="md"
            py="xs"
            style={{ borderBottom: `1px solid ${theme.colors.dark[4]}` }}
          >
            <Text size="sm" fw={500}>
              格式转换
            </Text>
          </Box>

          <ScrollArea style={{ flex: 1 }} p="md">
            <Stack gap="md">
              <Box>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>
                    输入文件 ({convertFiles.length})
                  </Text>
                  <Group gap={4}>
                    <Button size="compact-sm" variant="outline" onClick={addFiles}>
                      <Group gap={4}>
                        <Plus size={12} />
                        <Text size="xs">添加</Text>
                      </Group>
                    </Button>
                    <Button size="compact-sm" variant="outline" onClick={addFolder}>
                      <Group gap={4}>
                        <FolderOpen size={12} />
                        <Text size="xs">文件夹</Text>
                      </Group>
                    </Button>
                  </Group>
                </Group>
                <ScrollArea.Autosize maw="100%" mah={200}>
                  <Stack gap={4} pr="sm">
                    {convertFiles.map((file, i) => (
                      <FileRow
                        key={file.inputPath}
                        file={file}
                        index={i}
                        onRemove={removeConvertInput}
                        isProcessing={isProcessing}
                        theme={theme}
                      />
                    ))}
                    {convertFiles.length === 0 && (
                      <Box
                        px="md"
                        py="xl"
                        ta="center"
                        style={{
                          borderRadius: 4,
                          border: `1px dashed ${theme.colors.dark[3]}`,
                        }}
                      >
                        <Text size="xs" c="dimmed">
                          拖拽媒体文件或文件夹到此处，或点击"添加"
                        </Text>
                      </Box>
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Box>

              <Box>
                <Text size="sm" fw={500}>
                  转换目标
                </Text>
                <Group mt={4} gap="xs">
                  <Button
                    variant={convertTarget === "video" ? "filled" : "outline"}
                    style={{ flex: 1 }}
                    leftSection={<FileVideo size={16} />}
                    onClick={() => setConvertTarget("video")}
                  >
                    视频格式
                  </Button>
                  <Button
                    variant={convertTarget === "audio" ? "filled" : "outline"}
                    style={{ flex: 1 }}
                    leftSection={<Music size={16} />}
                    onClick={() => setConvertTarget("audio")}
                  >
                    提取音频
                  </Button>
                </Group>
              </Box>

              {convertTarget === "video" ? (
                <>
                  <Box>
                    <Text size="sm" fw={500}>
                      输出格式
                    </Text>
                    <Select
                      mt={4}
                      value={convertVideoFormat}
                      onChange={(v) => v && setConvertVideoFormat(v)}
                      data={VIDEO_FORMATS.map((fmt) => ({
                        value: fmt,
                        label: fmt.toUpperCase(),
                      }))}
                    />
                  </Box>
                  <Box>
                    <Text size="sm" fw={500}>
                      视频码率（可选）
                    </Text>
                    <TextInput
                      mt={4}
                      value={convertVideoBitrate}
                      onChange={(e) =>
                        setConvertVideoBitrate(e.currentTarget.value)
                      }
                      placeholder="如 5M, 2000k"
                    />
                  </Box>
                </>
              ) : (
                <>
                  <Box>
                    <Text size="sm" fw={500}>
                      输出格式
                    </Text>
                    <Select
                      mt={4}
                      value={convertAudioFormat}
                      onChange={(v) => v && setConvertAudioFormat(v)}
                      data={AUDIO_FORMATS.map((fmt) => ({
                        value: fmt,
                        label: fmt.toUpperCase(),
                      }))}
                    />
                  </Box>
                  <Box>
                    <Text size="sm" fw={500}>
                      音频码率
                    </Text>
                    <Select
                      mt={4}
                      value={convertAudioBitrate}
                      onChange={(v) => v && setConvertAudioBitrate(v)}
                      data={AUDIO_BITRATES.map((rate) => ({
                        value: rate,
                        label: rate,
                      }))}
                    />
                  </Box>
                </>
              )}

              <Button
                fullWidth
                onClick={runBatchConvert}
                disabled={isProcessing || convertFiles.length === 0}
                leftSection={
                  isProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )
                }
              >
                {isProcessing ? "转换中..." : "开始转换"}
              </Button>
            </Stack>
          </ScrollArea>
        </Box>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
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
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
