import { useEffect } from "react";
import {
  Button,
  TextInput,
  NumberInput,
  Select,
  Checkbox,
  ScrollArea,
  Box,
  Text,
  Stack,
  Group,
  useMantineTheme,
} from "@mantine/core";
import {
  Trash2,
  Play,
  FolderOpen,
  Music,
  Loader2,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ProgressPanel } from "./ProgressPanel";

export function ImagesPanel() {
  const theme = useMantineTheme();
  const imagesFolderPath = useVideoToolStore((s) => s.imagesFolderPath);
  const imagesInputPaths = useVideoToolStore((s) => s.imagesInputPaths);
  const imagesOutputPath = useVideoToolStore((s) => s.imagesOutputPath);
  const imagesFps = useVideoToolStore((s) => s.imagesFps);
  const imagesOutputFormat = useVideoToolStore((s) => s.imagesOutputFormat);
  const imagesResolution = useVideoToolStore((s) => s.imagesResolution);
  const imagesAudioPath = useVideoToolStore((s) => s.imagesAudioPath);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const loadImagesFromFolder = useVideoToolStore((s) => s.loadImagesFromFolder);
  const setImagesOutputPath = useVideoToolStore((s) => s.setImagesOutputPath);
  const setImagesFps = useVideoToolStore((s) => s.setImagesFps);
  const setImagesOutputFormat = useVideoToolStore((s) => s.setImagesOutputFormat);
  const setImagesResolution = useVideoToolStore((s) => s.setImagesResolution);
  const setImagesAudioPath = useVideoToolStore((s) => s.setImagesAudioPath);
  const runImagesToVideo = useVideoToolStore((s) => s.runImagesToVideo);

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        const droppedPath = event.payload.paths[0];
        if (droppedPath) {
          loadImagesFromFolder(droppedPath);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadImagesFromFolder]);

  const selectFolder = async () => {
    await loadImagesFromFolder();
  };

  const selectAudio = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      filters: [
        {
          name: "音频文件",
          extensions: ["mp3", "aac", "wav", "flac", "ogg", "opus"],
        },
      ],
    });
    if (selected) {
      setImagesAudioPath(Array.isArray(selected) ? selected[0] : selected);
    }
  };

  const selectOutput = async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      filters: [
        {
          name: "视频文件",
          extensions: [imagesOutputFormat],
        },
      ],
    });
    if (path) setImagesOutputPath(path);
  };

  return (
    <>
      <Box
        pos="relative"
        w={320}
        style={{ display: "flex", flexDirection: "column", borderRadius: 8, border: `1px solid ${theme.colors.dark[4]}`, overflow: "hidden" }}
      >
        <Box px="md" py="xs" style={{ borderBottom: `1px solid ${theme.colors.dark[4]}` }}>
          <Text size="sm" fw={500}>图片转视频</Text>
        </Box>

        <ScrollArea style={{ flex: 1 }} p="md">
          <Stack gap="md">
            <Box>
              <Text size="sm" fw={500}>图片文件夹</Text>
              <Box mt={4}>
                {imagesFolderPath ? (
                  <Box p="sm" style={{ borderRadius: 6, border: `1px solid ${theme.colors.dark[4]}`, background: theme.colors.dark[3] }}>
                    <Group gap="xs" mb="xs">
                      <FolderOpen size={16} color={theme.colors.dark[2]} style={{ flexShrink: 0 }} />
                      <Text
                        size="xs"
                        style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={imagesFolderPath}
                      >
                        {imagesFolderPath.split(/[/\\]/).pop() || imagesFolderPath}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      已加载 {imagesInputPaths.length} 张图片
                    </Text>
                    <Button
                      size="compact-sm"
                      variant="outline"
                      mt="xs"
                      fullWidth
                      onClick={selectFolder}
                    >
                      更换文件夹
                    </Button>
                  </Box>
                ) : (
                  <Box
                    px="md"
                    py="xl"
                    ta="center"
                    style={{
                      borderRadius: 4,
                      border: `1px dashed ${theme.colors.dark[3]}`,
                      cursor: "pointer",
                    }}
                    onClick={selectFolder}
                  >
                    <Text size="xs" c="dimmed">拖拽文件夹到此处，或点击选择</Text>
                  </Box>
                )}
              </Box>
            </Box>

            <Box>
              <Text size="sm" fw={500}>FPS</Text>
              <NumberInput
                mt={4}
                value={imagesFps}
                onChange={(v) => setImagesFps(typeof v === "number" ? v : 24)}
                min={1}
                max={60}
              />
            </Box>

            <Box>
              <Text size="sm" fw={500}>输出格式</Text>
              <Select
                mt={4}
                value={imagesOutputFormat}
                onChange={(v) => v && setImagesOutputFormat(v)}
                data={[
                  { value: "mp4", label: "MP4" },
                  { value: "mkv", label: "MKV" },
                  { value: "gif", label: "GIF" },
                ]}
              />
            </Box>

            <Box>
              <Group gap="xs" mb="xs">
                <Checkbox
                  checked={imagesResolution !== null}
                  onChange={(e) =>
                    setImagesResolution(e.currentTarget.checked ? [1920, 1080] : null)
                  }
                />
                <Text size="sm" fw={500}>自定义分辨率</Text>
              </Group>
              {imagesResolution && (
                <Group gap="xs">
                  <NumberInput
                    value={imagesResolution[0]}
                    onChange={(v) =>
                      setImagesResolution([
                        typeof v === "number" ? v : 1920,
                        imagesResolution[1],
                      ])
                    }
                    placeholder="宽"
                    style={{ flex: 1 }}
                  />
                  <NumberInput
                    value={imagesResolution[1]}
                    onChange={(v) =>
                      setImagesResolution([
                        imagesResolution[0],
                        typeof v === "number" ? v : 1080,
                      ])
                    }
                    placeholder="高"
                    style={{ flex: 1 }}
                  />
                </Group>
              )}
            </Box>

            <Box>
              <Text size="sm" fw={500}>背景音频（可选）</Text>
              <Group mt={4} gap="xs">
                <TextInput
                  value={imagesAudioPath || ""}
                  readOnly
                  placeholder="选择音频文件"
                  style={{ flex: 1 }}
                  size="xs"
                />
                <Button variant="outline" onClick={selectAudio} style={{ padding: "0 8px" }}>
                  <Music size={16} />
                </Button>
                {imagesAudioPath && (
                  <Button
                    variant="outline"
                    color="red"
                    onClick={() => setImagesAudioPath(null)}
                    style={{ padding: "0 8px" }}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </Group>
            </Box>

            <Box>
              <Text size="sm" fw={500}>输出路径</Text>
              <Group mt={4} gap="xs">
                <TextInput
                  value={imagesOutputPath}
                  onChange={(e) => setImagesOutputPath(e.currentTarget.value)}
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
              onClick={runImagesToVideo}
              disabled={isProcessing || imagesInputPaths.length === 0}
              leftSection={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            >
              生成视频
            </Button>
          </Stack>
        </ScrollArea>
      </Box>

      <ProgressPanel />
    </>
  );
}
