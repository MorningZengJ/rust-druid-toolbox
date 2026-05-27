import { useEffect, useState } from "react";
import {
  Button,
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
  Plus,
  Loader2,
  Upload,
  FolderOpen,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { MEDIA_EXTENSIONS } from "./constants";
import { FileRow } from "./components/FileRow";
import { ConvertFormatOptions } from "./components/ConvertFormatOptions";
import { ConvertProgressPanel } from "./components/ConvertProgressPanel";

export function ConvertPanel() {
  const theme = useMantineTheme();
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
              >
                {isProcessing ? "转换中..." : "开始转换"}
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
