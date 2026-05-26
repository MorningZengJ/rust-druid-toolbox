import { Box, Button, Group, Select, Text, TextInput } from "@mantine/core";
import { FileVideo, Music } from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import {
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  AUDIO_BITRATES,
  VIDEO_AUDIO_CODECS,
} from "../constants";

export function ConvertFormatOptions() {
  const convertTarget = useVideoToolStore((s) => s.convertTarget);
  const convertVideoFormat = useVideoToolStore((s) => s.convertVideoFormat);
  const convertAudioFormat = useVideoToolStore((s) => s.convertAudioFormat);
  const convertAudioCodec = useVideoToolStore((s) => s.convertAudioCodec);
  const convertAudioBitrate = useVideoToolStore((s) => s.convertAudioBitrate);
  const convertVideoBitrate = useVideoToolStore((s) => s.convertVideoBitrate);
  const setConvertTarget = useVideoToolStore((s) => s.setConvertTarget);
  const setConvertVideoFormat = useVideoToolStore((s) => s.setConvertVideoFormat);
  const setConvertAudioFormat = useVideoToolStore((s) => s.setConvertAudioFormat);
  const setConvertAudioCodec = useVideoToolStore((s) => s.setConvertAudioCodec);
  const setConvertAudioBitrate = useVideoToolStore((s) => s.setConvertAudioBitrate);
  const setConvertVideoBitrate = useVideoToolStore((s) => s.setConvertVideoBitrate);

  return (
    <>
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
              音频编码
            </Text>
            <Select
              mt={4}
              value={convertAudioCodec}
              onChange={(v) => v && setConvertAudioCodec(v)}
              data={(VIDEO_AUDIO_CODECS[convertVideoFormat] ?? ["aac"]).map((c) => ({
                value: c,
                label: c.toUpperCase(),
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
    </>
  );
}
