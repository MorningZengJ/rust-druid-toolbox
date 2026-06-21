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
  /** 当前选中的编码器 */
  codec: string;
  /** 编码器变更回调 */
  onCodecChange: (codec: string) => void;
  /** 当前选中的质量预设 */
  qualityPreset: string;
  /** 质量预设变更回调 */
  onQualityPresetChange: (preset: string) => void;
  /** 自定义视频码率 */
  videoBitrate: string;
  /** 视频码率变更回调 */
  onVideoBitrateChange: (rate: string) => void;
  /** 是否显示流复制选项（合并面板用） */
  showStreamCopy?: boolean;
  /** 是否显示自定义码率输入 */
  showBitrate?: boolean;
}

/** 带 tooltip 的 Select 选项渲染 */
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

  return (
    <>
      <Box>
        <Text size="sm" fw={500}>
          {t("codecSelector.title")}
        </Text>
        {selectedCodec && (
          <Text size="xs" c="dimmed" mt={2}>
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
        />
      </Box>

      {!isLossless && (
        <Box>
          <Text size="sm" fw={500}>
            {t("codecSelector.qualityPreset")}
          </Text>
          {selectedPreset && (
            <Text size="xs" c="dimmed" mt={2}>
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
          />
        </Box>
      )}

      {showBitrate && !isLossless && (
        <Box>
          <Text size="sm" fw={500}>
            {t("codecSelector.customBitrate")}
          </Text>
          <TextInput
            mt={4}
            value={videoBitrate}
            onChange={(e) => onVideoBitrateChange(e.currentTarget.value)}
            placeholder={t("codecSelector.bitratePlaceholder")}
          />
        </Box>
      )}
    </>
  );
}
