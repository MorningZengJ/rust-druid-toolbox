import {
  Stack,
  Box,
  Text,
  Slider,
  TextInput,
  Checkbox,
  Select,
  ScrollArea,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import type { CharsetPreset, ColorMode, Background, RenderMode } from "@/types";

export function ControlPanel() {
  const { t } = useTranslation("asciiArt");
  const params = useAsciiArtStore((s) => s.params);
  const setParams = useAsciiArtStore((s) => s.setParams);

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: 10,
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--surface-raised)",
        position: "relative",
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

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="md" p="sm">
          {/* Render Mode */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.renderMode")}
            </Text>
            <Select
              size="xs"
              value={params.renderMode}
              onChange={(v) => setParams({ renderMode: (v ?? "png") as RenderMode })}
              data={[
                { value: "png", label: t("control.renderModes.png") },
                { value: "svg", label: t("control.renderModes.svg") },
                { value: "canvas", label: t("control.renderModes.canvas") },
              ]}
              styles={{
                input: {
                  backgroundColor: "var(--surface-panel)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                },
              }}
            />
          </Box>

          {/* Width */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.width", { value: params.width })}
            </Text>
            <Slider
              size="xs"
              value={params.width}
              onChange={(v) => setParams({ width: v })}
              min={300}
              max={2000}
              step={10}
              color="amber"
            />
          </Box>

          {/* Charset */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.charset")}
            </Text>
            <Select
              size="xs"
              value={params.charset}
              onChange={(v) => setParams({ charset: (v ?? "standard") as CharsetPreset })}
              data={[
                { value: "simple", label: t("control.charsets.simple") },
                { value: "standard", label: t("control.charsets.standard") },
                { value: "complex", label: t("control.charsets.complex") },
                { value: "custom", label: t("control.charsets.custom") },
              ]}
              styles={{
                input: {
                  backgroundColor: "var(--surface-panel)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                },
              }}
            />
          </Box>

          {/* Custom charset */}
          {params.charset === "custom" && (
            <Box>
              <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
                {t("control.customChars")}
              </Text>
              <TextInput
                size="xs"
                value={params.customCharset}
                onChange={(e) => setParams({ customCharset: e.currentTarget.value })}
                placeholder={t("control.customCharsPlaceholder")}
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

          {/* Contrast */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.contrast", { value: params.contrast.toFixed(1) })}
            </Text>
            <Slider
              size="xs"
              value={params.contrast}
              onChange={(v) => setParams({ contrast: v })}
              min={0.1}
              max={3.0}
              step={0.1}
              color="amber"
            />
          </Box>

          {/* Brightness */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.brightness", { value: params.brightness.toFixed(1) })}
            </Text>
            <Slider
              size="xs"
              value={params.brightness}
              onChange={(v) => setParams({ brightness: v })}
              min={-1.0}
              max={1.0}
              step={0.1}
              color="amber"
            />
          </Box>

          {/* Saturation */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.saturation", { value: params.saturation.toFixed(1) })}
            </Text>
            <Slider
              size="xs"
              value={params.saturation}
              onChange={(v) => setParams({ saturation: v })}
              min={0.0}
              max={2.0}
              step={0.1}
              color="amber"
            />
          </Box>

          {/* Char aspect ratio */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.charAspectRatio", { value: params.charAspectRatio.toFixed(2) })}
            </Text>
            <Slider
              size="xs"
              value={params.charAspectRatio}
              onChange={(v) => setParams({ charAspectRatio: v })}
              min={0.3}
              max={1.0}
              step={0.05}
              color="amber"
            />
          </Box>

          {/* Invert */}
          <Checkbox
            size="xs"
            label={t("control.invertColors")}
            checked={params.invert}
            onChange={(e) => setParams({ invert: e.currentTarget.checked })}
            color="amber"
          />

          {/* Color mode */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.colorMode")}
            </Text>
            <Select
              size="xs"
              value={params.colorMode}
              onChange={(v) => setParams({ colorMode: (v ?? "monochrome") as ColorMode })}
              data={[
                { value: "monochrome", label: t("control.colorModes.monochrome") },
                { value: "ansi256", label: t("control.colorModes.ansi256") },
                { value: "trueColor", label: t("control.colorModes.trueColor") },
                { value: "html", label: t("control.colorModes.html") },
              ]}
              styles={{
                input: {
                  backgroundColor: "var(--surface-panel)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                },
              }}
            />
          </Box>

          {/* Background */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4} style={{ fontFamily: "var(--font-body)" }}>
              {t("control.background")}
            </Text>
            <Select
              size="xs"
              value={params.background}
              onChange={(v) => setParams({ background: (v ?? "black") as Background })}
              data={[
                { value: "black", label: t("control.backgrounds.black") },
                { value: "white", label: t("control.backgrounds.white") },
                { value: "transparent", label: t("control.backgrounds.transparent") },
              ]}
              styles={{
                input: {
                  backgroundColor: "var(--surface-panel)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                },
              }}
            />
          </Box>
        </Stack>
      </ScrollArea>
    </Box>
  );
}
