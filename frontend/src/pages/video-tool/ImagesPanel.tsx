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
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import {
  Trash2,
  Play,
  FolderOpen,
  Music,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ProgressPanel } from "./ProgressPanel";
import { CodecSelector } from "./components/CodecSelector";

export function ImagesPanel() {
  const { t } = useTranslation("videoTool");
  const theme = useMantineTheme();
  const imagesFolderPath = useVideoToolStore((s) => s.imagesFolderPath);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "video-tool-images",
    storage: localStorage,
  });
  const imagesInputPaths = useVideoToolStore((s) => s.imagesInputPaths);
  const imagesOutputPath = useVideoToolStore((s) => s.imagesOutputPath);
  const imagesFps = useVideoToolStore((s) => s.imagesFps);
  const imagesOutputFormat = useVideoToolStore((s) => s.imagesOutputFormat);
  const imagesResolution = useVideoToolStore((s) => s.imagesResolution);
  const imagesAudioPath = useVideoToolStore((s) => s.imagesAudioPath);
  const imagesVideoCodec = useVideoToolStore((s) => s.imagesVideoCodec);
  const imagesVideoBitrate = useVideoToolStore((s) => s.imagesVideoBitrate);
  const imagesQualityPreset = useVideoToolStore((s) => s.imagesQualityPreset);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const loadImagesFromFolder = useVideoToolStore((s) => s.loadImagesFromFolder);
  const setImagesOutputPath = useVideoToolStore((s) => s.setImagesOutputPath);
  const setImagesFps = useVideoToolStore((s) => s.setImagesFps);
  const setImagesOutputFormat = useVideoToolStore((s) => s.setImagesOutputFormat);
  const setImagesResolution = useVideoToolStore((s) => s.setImagesResolution);
  const setImagesAudioPath = useVideoToolStore((s) => s.setImagesAudioPath);
  const setImagesVideoCodec = useVideoToolStore((s) => s.setImagesVideoCodec);
  const setImagesVideoBitrate = useVideoToolStore((s) => s.setImagesVideoBitrate);
  const setImagesQualityPreset = useVideoToolStore((s) => s.setImagesQualityPreset);
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
          name: t("images.audio"),
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
          name: t("images.outputFormat"),
          extensions: [imagesOutputFormat],
        },
      ],
    });
    if (path) setImagesOutputPath(path);
  };

  return (
    <ResizablePanelGroup
      id="video-tool-images"
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
        <Box px="md" py="xs" style={{ borderBottom: `1px solid ${theme.colors.dark[4]}` }}>
          <Text size="sm" fw={500}>{t("images.title")}</Text>
        </Box>

        <ScrollArea style={{ flex: 1 }} p="md">
          <Stack gap="md">
            <Box>
              <Text size="sm" fw={500}>{t("images.imageFolder")}</Text>
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
                      {t("images.loadedCount", { count: imagesInputPaths.length })}
                    </Text>
                    <Button
                      size="compact-sm"
                      variant="outline"
                      mt="xs"
                      fullWidth
                      onClick={selectFolder}
                    >
                      {t("images.changeFolder")}
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
                    <Text size="xs" c="dimmed">{t("images.dropHint")}</Text>
                  </Box>
                )}
              </Box>
            </Box>

            <Box>
              <Text size="sm" fw={500}>{t("images.fps")}</Text>
              <NumberInput
                mt={4}
                value={imagesFps}
                onChange={(v) => setImagesFps(typeof v === "number" ? v : 24)}
                min={1}
                max={60}
              />
            </Box>

            <Box>
              <Text size="sm" fw={500}>{t("images.outputFormat")}</Text>
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

            {imagesOutputFormat !== "gif" && (
              <CodecSelector
                codec={imagesVideoCodec}
                onCodecChange={setImagesVideoCodec}
                qualityPreset={imagesQualityPreset}
                onQualityPresetChange={setImagesQualityPreset}
                videoBitrate={imagesVideoBitrate}
                onVideoBitrateChange={setImagesVideoBitrate}
                showStreamCopy={false}
                showBitrate={true}
              />
            )}

            <Box>
              <Group gap="xs" mb="xs">
                <Checkbox
                  checked={imagesResolution !== null}
                  onChange={(e) =>
                    setImagesResolution(e.currentTarget.checked ? [1920, 1080] : null)
                  }
                />
                <Text size="sm" fw={500}>{t("images.customResolution")}</Text>
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
                    placeholder={t("images.widthPlaceholder")}
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
                    placeholder={t("images.heightPlaceholder")}
                    style={{ flex: 1 }}
                  />
                </Group>
              )}
            </Box>

            <Box>
              <Text size="sm" fw={500}>{t("images.audio")}</Text>
              <Group mt={4} gap="xs">
                <TextInput
                  value={imagesAudioPath || ""}
                  readOnly
                  placeholder={t("images.audioPlaceholder")}
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
              <Text size="sm" fw={500}>{t("images.outputPath")}</Text>
              <Group mt={4} gap="xs">
                <TextInput
                  value={imagesOutputPath}
                  onChange={(e) => setImagesOutputPath(e.currentTarget.value)}
                  placeholder={t("images.outputPathPlaceholder")}
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
              leftSection={isProcessing ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={16} />}
            >
              {t("images.startGenerate")}
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
