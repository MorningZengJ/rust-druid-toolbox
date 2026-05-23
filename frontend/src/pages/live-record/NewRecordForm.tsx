import {
  Stack,
  Text,
  TextInput,
  NumberInput,
  Select,
  Checkbox,
  Button,
  Box,
  useMantineTheme,
} from "@mantine/core";
import { Plus } from "lucide-react";
import { useLiveRecordStore } from "@/stores/liveRecordStore";
import { DirectoryPicker } from "@/components/common/DirectoryPicker";
import type { ContainerFormat } from "@/types";

export function NewRecordForm() {
  const newRecordParams = useLiveRecordStore((s) => s.newRecordParams);
  const errorMessage = useLiveRecordStore((s) => s.errorMessage);
  const setNewRecordParams = useLiveRecordStore((s) => s.setNewRecordParams);
  const startRecording = useLiveRecordStore((s) => s.startRecording);
  const theme = useMantineTheme();
  const clearError = useLiveRecordStore((s) => s.clearError);

  return (
    <Box style={{ borderBottom: `1px solid ${theme.colors.dark[4]}` }} px="sm" py="xs">
      <Text size="xs" fw={500} c="dimmed" mb="xs">新建录制</Text>
      <Stack gap="sm">
        <Box>
          <Text size="xs" fw={500} c="dimmed" mb={4}>直播源 URL</Text>
          <TextInput
            size="xs"
            placeholder="https://... / rtmp://... / rtsp://..."
            value={newRecordParams.url}
            onChange={(e) => {
              clearError();
              setNewRecordParams({ url: e.currentTarget.value });
            }}
          />
        </Box>

        <Box>
          <Text size="xs" fw={500} c="dimmed" mb={4}>输出目录</Text>
          <DirectoryPicker
            value={newRecordParams.outputDir}
            onChange={(dir) => setNewRecordParams({ outputDir: dir })}
          />
        </Box>

        <Box>
          <Text size="xs" fw={500} c="dimmed" mb={4}>文件名前缀</Text>
          <TextInput
            size="xs"
            value={newRecordParams.filenamePrefix}
            onChange={(e) =>
              setNewRecordParams({ filenamePrefix: e.currentTarget.value })
            }
            placeholder="recording"
          />
        </Box>

        <Box>
          <Text size="xs" fw={500} c="dimmed" mb={4}>容器格式</Text>
          <Select
            size="xs"
            value={newRecordParams.containerFormat}
            onChange={(v) =>
              setNewRecordParams({ containerFormat: (v ?? "ts") as ContainerFormat })
            }
            data={[
              { value: "ts", label: "TS（推荐）" },
              { value: "mkv", label: "MKV" },
              { value: "mp4", label: "MP4" },
              { value: "flv", label: "FLV" },
            ]}
          />
          {newRecordParams.containerFormat === "mp4" && (
            <Text size="xs" c="orange">MP4 格式在异常中断时文件可能不可用，推荐 TS 或 MKV</Text>
          )}
        </Box>

        <Checkbox
          size="xs"
          label="流复制（不重新编码）"
          checked={newRecordParams.streamCopy}
          onChange={(e) =>
            setNewRecordParams({ streamCopy: e.currentTarget.checked })
          }
        />

        <Box>
          <Text size="xs" fw={500} c="dimmed" mb={4}>分段时长（秒，留空不分段）</Text>
          <NumberInput
            size="xs"
            placeholder="300 = 5分钟"
            value={newRecordParams.segmentDurationSecs ?? undefined}
            onChange={(v) => {
              const val = typeof v === "number" ? v : null;
              setNewRecordParams({
                segmentDurationSecs: val && val > 0 ? val : null,
              });
            }}
            min={0}
          />
        </Box>

        <Checkbox
          size="xs"
          label="实时预览"
          checked={newRecordParams.previewEnabled}
          onChange={(e) =>
            setNewRecordParams({ previewEnabled: e.currentTarget.checked })
          }
        />

        {errorMessage && (
          <Box
            px="sm"
            py="xs"
            style={{
              border: "1px solid var(--mantine-color-red-5)",
              borderRadius: "var(--mantine-radius-sm)",
              backgroundColor: "var(--mantine-color-red-0)",
            }}
          >
            <Text size="xs" c="red">{errorMessage}</Text>
          </Box>
        )}

        <Button
          fullWidth
          size="compact-sm"
          leftSection={<Plus size={14} />}
          onClick={startRecording}
          disabled={!newRecordParams.url || !newRecordParams.outputDir}
        >
          开始录制
        </Button>
      </Stack>
    </Box>
  );
}
