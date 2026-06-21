import { Box, Select, Text, TextInput, Tooltip, Group } from "@mantine/core";
import type { ComboboxLikeRenderOptionInput, ComboboxItem } from "@mantine/core";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  VIDEO_CODECS,
  CONVERT_VIDEO_CODECS,
  QUALITY_PRESETS,
} from "../constants";

interface CodecSelectorProps {
  codec: string;
  onCodecChange: (codec: string) => void;
  qualityPreset: string;
  onQualityPresetChange: (preset: string) => void;
  videoBitrate: string;
  onVideoBitrateChange: (rate: string) => void;
  showStreamCopy?: boolean;
  showBitrate?: boolean;
}

function renderCodecOption(item: ComboboxLikeRenderOptionInput<ComboboxItem<string>>) {
  const tooltip = VIDEO_CODECS.find((c) => c.value === item.option.value)?.tooltip
    ?? QUALITY_PRESETS.find((p) => p.value === item.option.value)?.tooltip;
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="sm">{item.option.label}</Text>
      {tooltip && (
        <Tooltip
          label={tooltip}
          maw={300}
          multiline
          position="right"
          withArrow
        >
          <Info size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
        </Tooltip>
      )}
    </Group>
  );
}

export function CodecSelector({
  codec,
  onCodecChange,
  qualityPreset,
  onQualityPresetChange,
  videoBitrate,
  onVideoBitrateChange,
  showStreamCopy = false,
  showBitrate = true,
}: CodecSelectorProps) {
  const { t } = useTranslation("videoTool");
  const codecs = showStreamCopy ? VIDEO_CODECS : CONVERT_VIDEO_CODECS;
  const isLossless = codec === "ffv1" || codec === "copy";
  const selectedCodec = codecs.find((c) => c.value === codec);
  const selectedPreset = QUALITY_PRESETS.find((p) => p.value === qualityPreset);

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
          {t("codecSelector.title")}
        </Text>
        {selectedCodec && (
          <Text size="xs" c="dimmed" mt={2} style={{ fontFamily: "var(--font-body)" }}>
            {selectedCodec.tooltip}
          </Text>
        )}
        <Select
          mt={4}
          value={codec}
          onChange={(v) => v && onCodecChange(v)}
          data={codecs.map((c) => ({
            value: c.value,
            label: c.label,
          }))}
          renderOption={renderCodecOption}
          styles={selectStyles}
        />
      </Box>

      {!isLossless && (
        <Box>
          <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
            {t("codecSelector.qualityPreset")}
          </Text>
          {selectedPreset && (
            <Text size="xs" c="dimmed" mt={2} style={{ fontFamily: "var(--font-body)" }}>
              {selectedPreset.tooltip}
            </Text>
          )}
          <Select
            mt={4}
            value={qualityPreset}
            onChange={(v) => v && onQualityPresetChange(v)}
            data={QUALITY_PRESETS.map((p) => ({
              value: p.value,
              label: p.label,
            }))}
            renderOption={renderCodecOption}
            styles={selectStyles}
          />
        </Box>
      )}

      {showBitrate && !isLossless && (
        <Box>
          <Text size="sm" fw={500} style={{ fontFamily: "var(--font-body)" }}>
            {t("codecSelector.customBitrate")}
          </Text>
          <TextInput
            mt={4}
            value={videoBitrate}
            onChange={(e) => onVideoBitrateChange(e.currentTarget.value)}
            placeholder={t("codecSelector.bitratePlaceholder")}
            styles={{
              input: {
                fontFamily: "var(--font-mono)",
                backgroundColor: "var(--surface-panel)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              },
            }}
          />
        </Box>
      )}
    </>
  );
}
