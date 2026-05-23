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
  useMantineTheme,
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
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { VIDEO_EXTENSIONS, VIDEO_FORMATS } from "./constants";
import { ProgressPanel } from "./ProgressPanel";

export function MergePanel() {
  const theme = useMantineTheme();
  const mergeInputPaths = useVideoToolStore((s) => s.mergeInputPaths);
  const mergeOutputPath = useVideoToolStore((s) => s.mergeOutputPath);
  const mergeOutputFormat = useVideoToolStore((s) => s.mergeOutputFormat);
  const mergeReencode = useVideoToolStore((s) => s.mergeReencode);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const setMergeInputs = useVideoToolStore((s) => s.setMergeInputs);
  const setMergeOutputPath = useVideoToolStore((s) => s.setMergeOutputPath);
  const setMergeOutputFormat = useVideoToolStore((s) => s.setMergeOutputFormat);
  const setMergeReencode = useVideoToolStore((s) => s.setMergeReencode);
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
          name: "视频文件",
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
          name: "视频文件",
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
          <Text size="sm" fw={500}>合并视频</Text>
        </Box>

        <ScrollArea style={{ flex: 1 }} p="md">
          <Stack gap="md">
            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>输入文件 ({mergeInputPaths.length})</Text>
                <Button size="compact-sm" variant="outline" onClick={addFiles}>
                  <Group gap={4}>
                    <Plus size={12} />
                    <Text size="xs">添加</Text>
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
                      style={{ borderRadius: 4, background: theme.colors.dark[3] }}
                    >
                      <Text size="xs" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                        borderRadius: 4,
                        border: `1px dashed ${theme.colors.dark[3]}`,
                      }}
                    >
                      <Text size="xs" c="dimmed">
                        拖拽视频文件到此处，或点击"添加"
                      </Text>
                    </Box>
                  )}
                </Stack>
              </ScrollArea.Autosize>
            </Box>

            <Box>
              <Text size="sm" fw={500}>输出格式</Text>
              <Select
                mt={4}
                value={mergeOutputFormat}
                onChange={(v) => v && setMergeOutputFormat(v)}
                data={VIDEO_FORMATS.map((fmt) => ({ value: fmt, label: fmt.toUpperCase() }))}
              />
            </Box>

            <Group gap="xs">
              <Checkbox
                checked={mergeReencode}
                onChange={(e) => setMergeReencode(e.currentTarget.checked)}
              />
              <Text size="xs">重编码模式（处理不同编码格式，速度较慢）</Text>
            </Group>

            <Box>
              <Text size="sm" fw={500}>输出路径</Text>
              <Group mt={4} gap="xs">
                <TextInput
                  value={mergeOutputPath}
                  onChange={(e) => setMergeOutputPath(e.currentTarget.value)}
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
              onClick={runMerge}
              disabled={isProcessing || mergeInputPaths.length < 2}
              leftSection={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            >
              合并
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
