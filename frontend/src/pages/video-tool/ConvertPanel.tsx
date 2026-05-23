import { useEffect, useState } from "react";
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
  FolderOpen,
  Loader2,
  Upload,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  AUDIO_BITRATES,
  MEDIA_EXTENSIONS,
} from "./constants";
import { ProgressPanel } from "./ProgressPanel";

export function ConvertPanel() {
  const theme = useMantineTheme();
  const convertInputPath = useVideoToolStore((s) => s.convertInputPath);
  const convertOutputPath = useVideoToolStore((s) => s.convertOutputPath);
  const convertTarget = useVideoToolStore((s) => s.convertTarget);
  const convertVideoFormat = useVideoToolStore((s) => s.convertVideoFormat);
  const convertAudioFormat = useVideoToolStore((s) => s.convertAudioFormat);
  const convertAudioBitrate = useVideoToolStore((s) => s.convertAudioBitrate);
  const convertVideoBitrate = useVideoToolStore((s) => s.convertVideoBitrate);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const setConvertInputPath = useVideoToolStore((s) => s.setConvertInputPath);
  const setConvertOutputPath = useVideoToolStore((s) => s.setConvertOutputPath);
  const setConvertTarget = useVideoToolStore((s) => s.setConvertTarget);
  const setConvertVideoFormat = useVideoToolStore((s) => s.setConvertVideoFormat);
  const setConvertAudioFormat = useVideoToolStore((s) => s.setConvertAudioFormat);
  const setConvertAudioBitrate = useVideoToolStore((s) => s.setConvertAudioBitrate);
  const setConvertVideoBitrate = useVideoToolStore((s) => s.setConvertVideoBitrate);
  const runConvert = useVideoToolStore((s) => s.runConvert);
  const [isDragOver, setIsDragOver] = useState(false);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "video-tool-convert",
    storage: localStorage,
  });

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const mediaFile = event.payload.paths.find((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return MEDIA_EXTENSIONS.includes(ext);
        });
        if (mediaFile) {
          setConvertInputPath(mediaFile);
          const ext =
            convertTarget === "video" ? convertVideoFormat : convertAudioFormat;
          const base = mediaFile.replace(/\.[^.]+$/, "");
          setConvertOutputPath(`${base}_converted.${ext}`);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [convertTarget, convertVideoFormat, convertAudioFormat, setConvertInputPath, setConvertOutputPath]);

  const selectInput = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      filters: [
        {
          name: "媒体文件",
          extensions: MEDIA_EXTENSIONS,
        },
      ],
    });
    if (selected) {
      const path = Array.isArray(selected) ? selected[0] : selected;
      setConvertInputPath(path);
      const ext =
        convertTarget === "video" ? convertVideoFormat : convertAudioFormat;
      const base = path.replace(/\.[^.]+$/, "");
      setConvertOutputPath(`${base}_converted.${ext}`);
    }
  };

  const selectOutput = async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const ext =
      convertTarget === "video" ? convertVideoFormat : convertAudioFormat;
    const path = await save({
      filters: [
        {
          name: convertTarget === "video" ? "视频文件" : "音频文件",
          extensions: [ext],
        },
      ],
    });
    if (path) setConvertOutputPath(path);
  };

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
          style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", borderRadius: 8, border: `1px solid ${theme.colors.dark[4]}` }}
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
              <Text size="sm" fw={500}>释放文件以添加</Text>
            </Stack>
          </Flex>
        )}
        <Box px="md" py="xs" style={{ borderBottom: `1px solid ${theme.colors.dark[4]}` }}>
          <Text size="sm" fw={500}>格式转换</Text>
        </Box>

        <ScrollArea style={{ flex: 1 }} p="md">
          <Stack gap="md">
            <Box>
              <Text size="sm" fw={500}>输入文件</Text>
              <Group mt={4} gap="xs">
                <TextInput
                  value={convertInputPath}
                  readOnly
                  placeholder="拖拽媒体文件到此处，或点击选择"
                  style={{ flex: 1 }}
                  size="xs"
                />
                <Button variant="outline" onClick={selectInput} style={{ padding: "0 8px" }}>
                  <FileVideo size={16} />
                </Button>
              </Group>
            </Box>

            <Box>
              <Text size="sm" fw={500}>转换目标</Text>
              <Group mt={4} gap="xs">
                <Button
                  variant={convertTarget === "video" ? "filled" : "outline"}
                  style={{ flex: 1 }}
                  leftSection={<FileVideo size={16} />}
                  onClick={() => {
                    setConvertTarget("video");
                    if (convertInputPath) {
                      const base = convertInputPath.replace(/\.[^.]+$/, "");
                      setConvertOutputPath(
                        `${base}_converted.${convertVideoFormat}`
                      );
                    }
                  }}
                >
                  视频格式
                </Button>
                <Button
                  variant={convertTarget === "audio" ? "filled" : "outline"}
                  style={{ flex: 1 }}
                  leftSection={<Music size={16} />}
                  onClick={() => {
                    setConvertTarget("audio");
                    if (convertInputPath) {
                      const base = convertInputPath.replace(/\.[^.]+$/, "");
                      setConvertOutputPath(
                        `${base}_converted.${convertAudioFormat}`
                      );
                    }
                  }}
                >
                  提取音频
                </Button>
              </Group>
            </Box>

            {convertTarget === "video" ? (
              <>
                <Box>
                  <Text size="sm" fw={500}>输出格式</Text>
                  <Select
                    mt={4}
                    value={convertVideoFormat}
                    onChange={(v) => {
                      if (v) {
                        setConvertVideoFormat(v);
                        if (convertInputPath) {
                          const base = convertInputPath.replace(/\.[^.]+$/, "");
                          setConvertOutputPath(`${base}_converted.${v}`);
                        }
                      }
                    }}
                    data={VIDEO_FORMATS.map((fmt) => ({ value: fmt, label: fmt.toUpperCase() }))}
                  />
                </Box>
                <Box>
                  <Text size="sm" fw={500}>视频码率（可选）</Text>
                  <TextInput
                    mt={4}
                    value={convertVideoBitrate}
                    onChange={(e) => setConvertVideoBitrate(e.currentTarget.value)}
                    placeholder="如 5M, 2000k"
                  />
                </Box>
              </>
            ) : (
              <>
                <Box>
                  <Text size="sm" fw={500}>输出格式</Text>
                  <Select
                    mt={4}
                    value={convertAudioFormat}
                    onChange={(v) => {
                      if (v) {
                        setConvertAudioFormat(v);
                        if (convertInputPath) {
                          const base = convertInputPath.replace(/\.[^.]+$/, "");
                          setConvertOutputPath(`${base}_converted.${v}`);
                        }
                      }
                    }}
                    data={AUDIO_FORMATS.map((fmt) => ({ value: fmt, label: fmt.toUpperCase() }))}
                  />
                </Box>
                <Box>
                  <Text size="sm" fw={500}>音频码率</Text>
                  <Select
                    mt={4}
                    value={convertAudioBitrate}
                    onChange={(v) => v && setConvertAudioBitrate(v)}
                    data={AUDIO_BITRATES.map((rate) => ({ value: rate, label: rate }))}
                  />
                </Box>
              </>
            )}

            <Box>
              <Text size="sm" fw={500}>输出路径</Text>
              <Group mt={4} gap="xs">
                <TextInput
                  value={convertOutputPath}
                  onChange={(e) => setConvertOutputPath(e.currentTarget.value)}
                  placeholder="选择输出文件路径"
                  style={{ flex: 1 }}
                  size="xs"
                />
                <Button variant="outline" onClick={selectOutput} style={{ padding: "0 8px" }}>
                  <FolderOpen size={16} />
                </Button>
              </Group>
            </Box>

            <Button
              fullWidth
              onClick={runConvert}
              disabled={isProcessing || !convertInputPath}
              leftSection={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            >
              转换
            </Button>
          </Stack>
        </ScrollArea>
        </Box>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
        <ProgressPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
