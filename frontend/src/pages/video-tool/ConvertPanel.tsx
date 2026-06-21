import { useEffect, useState } from "react";
import {
  Button,
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
  Play,
  Plus,
  Loader2,
  Upload,
  FolderOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { MEDIA_EXTENSIONS } from "./constants";
import { FileRow } from "./components/FileRow";
import { ConvertFormatOptions } from "./components/ConvertFormatOptions";
import { ConvertProgressPanel } from "./components/ConvertProgressPanel";

export function ConvertPanel() {
  const { t } = useTranslation("videoTool");
  const convertFiles = useVideoToolStore((s) => s.convertFiles);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const addConvertInputs = useVideoToolStore((s) => s.addConvertInputs);
  const removeConvertInput = useVideoToolStore((s) => s.removeConvertInput);
  const runBatchConvert = useVideoToolStore((s) => s.runBatchConvert);

  const [isDragOver, setIsDragOver] = useState(false);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "video-tool-convert",
    storage: localStorage,
  });

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
      filters: [{ name: t("common.mediaFiles"), extensions: MEDIA_EXTENSIONS }],
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
                <Text size="sm" fw={500}>
                  {t("common.releaseToAdd")}
                </Text>
              </Stack>
            </Flex>
          )}
          <Box
            px="md"
            py="xs"
            style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-panel)" }}
          >
            <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
              {t("common.formatConversion")}
            </Text>
          </Box>

          <ScrollArea style={{ flex: 1 }} p="md">
            <Stack gap="md">
              <Box>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
                    {t("common.inputFiles", { count: convertFiles.length })}
                  </Text>
                  <Group gap={4}>
                    <Button size="compact-sm" variant="outline" onClick={addFiles} color="amber">
                      <Group gap={4}>
                        <Plus size={12} />
                        <Text size="xs">{t("common.add")}</Text>
                      </Group>
                    </Button>
                    <Button size="compact-sm" variant="outline" onClick={addFolder} color="amber">
                      <Group gap={4}>
                        <FolderOpen size={12} />
                        <Text size="xs">{t("common.folder")}</Text>
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
                      />
                    ))}
                    {convertFiles.length === 0 && (
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
                          {t("common.dropHint")}
                        </Text>
                      </Box>
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Box>

              <ConvertFormatOptions />

              <Button
                fullWidth
                onClick={runBatchConvert}
                disabled={isProcessing || convertFiles.length === 0}
                leftSection={
                  isProcessing ? (
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Play size={16} />
                  )
                }
                color="amber"
              >
                {isProcessing ? t("convert.processing") : t("convert.startConvert")}
              </Button>
            </Stack>
          </ScrollArea>
        </Box>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
        <ConvertProgressPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
