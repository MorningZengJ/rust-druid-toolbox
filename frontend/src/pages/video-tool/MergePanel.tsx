import { useEffect, useState } from "react";
import {
  Button,
  TextInput,
  Select,
  Checkbox,
  ScrollArea,
  Box,
  Flex,
  Text,
  Stack,
  Group,
} from "@mantine/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import {
  Plus,
  Trash2,
  Play,
  FolderOpen,
  Loader2,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { VIDEO_EXTENSIONS, VIDEO_FORMATS } from "./constants";
import { ProgressPanel } from "./ProgressPanel";
import { CodecSelector } from "./components/CodecSelector";

export function MergePanel() {
  const { t } = useTranslation("videoTool");
  const mergeInputPaths = useVideoToolStore((s) => s.mergeInputPaths);
  const mergeOutputPath = useVideoToolStore((s) => s.mergeOutputPath);
  const mergeOutputFormat = useVideoToolStore((s) => s.mergeOutputFormat);
  const mergeReencode = useVideoToolStore((s) => s.mergeReencode);
  const mergeVideoCodec = useVideoToolStore((s) => s.mergeVideoCodec);
  const mergeVideoBitrate = useVideoToolStore((s) => s.mergeVideoBitrate);
  const mergeQualityPreset = useVideoToolStore((s) => s.mergeQualityPreset);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const setMergeInputs = useVideoToolStore((s) => s.setMergeInputs);
  const setMergeOutputPath = useVideoToolStore((s) => s.setMergeOutputPath);
  const setMergeOutputFormat = useVideoToolStore((s) => s.setMergeOutputFormat);
  const setMergeReencode = useVideoToolStore((s) => s.setMergeReencode);
  const setMergeVideoCodec = useVideoToolStore((s) => s.setMergeVideoCodec);
  const setMergeVideoBitrate = useVideoToolStore((s) => s.setMergeVideoBitrate);
  const setMergeQualityPreset = useVideoToolStore((s) => s.setMergeQualityPreset);
  const runMerge = useVideoToolStore((s) => s.runMerge);
  const [isDragOver, setIsDragOver] = useState(false);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "video-tool-merge",
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
        const videoFiles = event.payload.paths.filter((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return VIDEO_EXTENSIONS.includes(ext);
        });
        if (videoFiles.length > 0) {
          setMergeInputs([...mergeInputPaths, ...videoFiles]);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [mergeInputPaths, setMergeInputs]);

  const addFiles = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: t("common.mediaFiles"),
          extensions: VIDEO_EXTENSIONS,
        },
      ],
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      setMergeInputs([...mergeInputPaths, ...paths]);
    }
  };

  const removeFile = (index: number) => {
    setMergeInputs(mergeInputPaths.filter((_, i) => i !== index));
  };

  const moveFile = (from: number, to: number) => {
    const newPaths = [...mergeInputPaths];
    const [item] = newPaths.splice(from, 1);
    newPaths.splice(to, 0, item);
    setMergeInputs(newPaths);
  };

  const selectOutput = async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      filters: [
        {
          name: t("common.mediaFiles"),
          extensions: [mergeOutputFormat],
        },
      ],
    });
    if (path) setMergeOutputPath(path);
  };

  return (
    <ResizablePanelGroup
      id="video-tool-merge"
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
            borderRadius: 10,
            border: "1px solid var(--border-default)",
            backgroundColor: "var(--surface-raised)",
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

          {isDragOver && (
            <Flex
              pos="absolute"
              inset={0}
              align="center"
              justify="center"
              style={{
                zIndex: 50,
                borderRadius: 10,
                border: "2px dashed var(--accent-primary)",
                backgroundColor: "var(--accent-glow)",
              }}
            >
              <Stack align="center" gap="xs" style={{ color: "var(--accent-primary)" }}>
                <Upload size={32} />
                <Text size="sm" fw={500}>{t("merge.dropHint")}</Text>
              </Stack>
            </Flex>
          )}
          <Box px="md" py="xs" style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-panel)" }}>
            <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>{t("merge.title")}</Text>
          </Box>

          <ScrollArea style={{ flex: 1 }} p="md">
            <Stack gap="md">
              <Box>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
                    {t("merge.inputFiles", { count: mergeInputPaths.length })}
                  </Text>
                  <Button size="compact-sm" variant="outline" onClick={addFiles}>
                    <Group gap={4}>
                      <Plus size={12} />
                      <Text size="xs">{t("merge.addFile")}</Text>
                    </Group>
                  </Button>
                </Group>
                <ScrollArea.Autosize maw="100%" mah={240}>
                  <Stack gap={4} pr="sm">
                    {mergeInputPaths.map((path, i) => (
                      <Flex
                        key={i}
                        align="center"
                        gap={4}
                        px="xs"
                        py={4}
                        style={{
                          borderRadius: 6,
                          backgroundColor: "var(--surface-panel)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <Text size="xs" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                          {path.split(/[/\\]/).pop()}
                        </Text>
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          style={{ width: 20, height: 20, padding: 0, minWidth: 20 }}
                          onClick={() => i > 0 && moveFile(i, i - 1)}
                          disabled={i === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          style={{ width: 20, height: 20, padding: 0, minWidth: 20 }}
                          onClick={() =>
                            i < mergeInputPaths.length - 1 && moveFile(i, i + 1)
                          }
                          disabled={i === mergeInputPaths.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="red"
                          style={{ width: 20, height: 20, padding: 0, minWidth: 20 }}
                          onClick={() => removeFile(i)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </Flex>
                    ))}
                    {mergeInputPaths.length === 0 && (
                      <Box
                        px="md"
                        py="xl"
                        ta="center"
                        style={{
                          borderRadius: 8,
                          border: "1px dashed var(--border-strong)",
                          backgroundColor: "var(--surface-panel)",
                        }}
                      >
                        <Text size="xs" c="dimmed">
                          {t("merge.dropHint")}
                        </Text>
                      </Box>
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Box>

              <Box>
                <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>{t("merge.outputFormat")}</Text>
                <Select
                  mt={4}
                  value={mergeOutputFormat}
                  onChange={(v) => v && setMergeOutputFormat(v)}
                  data={VIDEO_FORMATS.map((fmt) => ({ value: fmt, label: fmt.toUpperCase() }))}
                  styles={{
                    input: {
                      backgroundColor: "var(--surface-panel)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                    },
                  }}
                />
              </Box>

              <Group gap="xs">
                <Checkbox
                  checked={mergeReencode}
                  onChange={(e) => setMergeReencode(e.currentTarget.checked)}
                />
                <Text size="xs" style={{ fontFamily: "var(--font-body)" }}>{t("merge.reencodeMode")}</Text>
              </Group>

              <CodecSelector
                codec={mergeVideoCodec}
                onCodecChange={setMergeVideoCodec}
                qualityPreset={mergeQualityPreset}
                onQualityPresetChange={setMergeQualityPreset}
                videoBitrate={mergeVideoBitrate}
                onVideoBitrateChange={setMergeVideoBitrate}
                showStreamCopy={true}
                showBitrate={true}
              />

              <Box>
                <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>{t("merge.outputPath")}</Text>
                <Group mt={4} gap="xs">
                  <TextInput
                    value={mergeOutputPath}
                    onChange={(e) => setMergeOutputPath(e.currentTarget.value)}
                    placeholder={t("merge.outputPathPlaceholder")}
                    style={{ flex: 1 }}
                    size="xs"
                    styles={{
                      input: {
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "var(--surface-panel)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)",
                      },
                    }}
                  />
                  <Button variant="outline" onClick={selectOutput} style={{ padding: "0 8px" }}>
                    <FolderOpen size={16} />
                  </Button>
                </Group>
              </Box>

              <Button
                fullWidth
                onClick={runMerge}
                disabled={isProcessing || mergeInputPaths.length < 2}
                leftSection={isProcessing ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={16} />}
              >
                {t("merge.startMerge")}
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
