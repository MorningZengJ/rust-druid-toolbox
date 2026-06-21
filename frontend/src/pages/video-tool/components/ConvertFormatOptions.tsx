import { Box, Button, Group, Select, Text } from "@mantine/core";
import { FileVideo, Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";
import {
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  AUDIO_BITRATES,
  VIDEO_AUDIO_CODECS,
} from "../constants";
import { CodecSelector } from "./CodecSelector";

export function ConvertFormatOptions() {
  const { t } = useTranslation("videoTool");
  const convertTarget = useVideoToolStore((s) => s.convertTarget);
  const convertVideoFormat = useVideoToolStore((s) => s.convertVideoFormat);
  const convertAudioFormat = useVideoToolStore((s) => s.convertAudioFormat);
  const convertAudioCodec = useVideoToolStore((s) => s.convertAudioCodec);
  const convertAudioBitrate = useVideoToolStore((s) => s.convertAudioBitrate);
  const convertVideoBitrate = useVideoToolStore((s) => s.convertVideoBitrate);
  const convertVideoCodec = useVideoToolStore((s) => s.convertVideoCodec);
  const convertQualityPreset = useVideoToolStore((s) => s.convertQualityPreset);
  const setConvertTarget = useVideoToolStore((s) => s.setConvertTarget);
  const setConvertVideoFormat = useVideoToolStore((s) => s.setConvertVideoFormat);
  const setConvertAudioFormat = useVideoToolStore((s) => s.setConvertAudioFormat);
  const setConvertAudioCodec = useVideoToolStore((s) => s.setConvertAudioCodec);
  const setConvertAudioBitrate = useVideoToolStore((s) => s.setConvertAudioBitrate);
  const setConvertVideoBitrate = useVideoToolStore((s) => s.setConvertVideoBitrate);
  const setConvertVideoCodec = useVideoToolStore((s) => s.setConvertVideoCodec);
  const setConvertQualityPreset = useVideoToolStore((s) => s.setConvertQualityPreset);

  const selectStyles = {
    input: {
      backgroundColor: "var(--surface-panel)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
    },
  };

  return (
    <>
      <Box>
        <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
          {t("convert.target")}
        </Text>
        <Group mt={4} gap="xs">
          <Button
            variant={convertTarget === "video" ? "filled" : "outline"}
            style={{ flex: 1 }}
            leftSection={<FileVideo size={16} />}
            onClick={() => setConvertTarget("video")}
            color="amber"
          >
            {t("convert.videoFormat")}
          </Button>
          <Button
            variant={convertTarget === "audio" ? "filled" : "outline"}
            style={{ flex: 1 }}
            leftSection={<Music size={16} />}
            onClick={() => setConvertTarget("audio")}
            color="amber"
          >
            {t("convert.audioFormat")}
          </Button>
        </Group>
      </Box>

      {convertTarget === "video" ? (
        <>
          <Box>
            <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
              {t("convert.outputFormat")}
            </Text>
            <Select
              mt={4}
              value={convertVideoFormat}
              onChange={(v) => v && setConvertVideoFormat(v)}
              data={VIDEO_FORMATS.map((fmt) => ({
                value: fmt,
                label: fmt.toUpperCase(),
              }))}
              styles={selectStyles}
            />
          </Box>

          <CodecSelector
            codec={convertVideoCodec}
            onCodecChange={setConvertVideoCodec}
            qualityPreset={convertQualityPreset}
            onQualityPresetChange={setConvertQualityPreset}
            videoBitrate={convertVideoBitrate}
            onVideoBitrateChange={setConvertVideoBitrate}
            showStreamCopy={false}
            showBitrate={true}
          />

          <Box>
            <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
              {t("convert.audioCodec")}
            </Text>
            <Select
              mt={4}
              value={convertAudioCodec}
              onChange={(v) => v && setConvertAudioCodec(v)}
              data={(VIDEO_AUDIO_CODECS[convertVideoFormat] ?? ["aac"]).map((c) => ({
                value: c,
                label: c.toUpperCase(),
              }))}
              styles={selectStyles}
            />
          </Box>
        </>
      ) : (
        <>
          <Box>
            <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
              {t("convert.outputFormat")}
            </Text>
            <Select
              mt={4}
              value={convertAudioFormat}
              onChange={(v) => v && setConvertAudioFormat(v)}
              data={AUDIO_FORMATS.map((fmt) => ({
                value: fmt,
                label: fmt.toUpperCase(),
              }))}
              styles={selectStyles}
            />
          </Box>
          <Box>
            <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
              {t("convert.audioBitrate")}
            </Text>
            <Select
              mt={4}
              value={convertAudioBitrate}
              onChange={(v) => v && setConvertAudioBitrate(v)}
              data={AUDIO_BITRATES.map((rate) => ({
                value: rate,
                label: rate,
              }))}
              styles={selectStyles}
            />
          </Box>
        </>
      )}
    </>
  );
}
