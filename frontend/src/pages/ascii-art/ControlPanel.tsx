import {
  Stack,
  Box,
  Text,
  Slider,
  TextInput,
  Checkbox,
  Select,
  ScrollArea,
  useMantineTheme,
} from "@mantine/core";
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import type { CharsetPreset, ColorMode, Background, RenderMode } from "@/types";

export function ControlPanel() {
  const params = useAsciiArtStore((s) => s.params);
  const setParams = useAsciiArtStore((s) => s.setParams);
  const theme = useMantineTheme();

  return (
    <Box
      w={280}
      style={{
        flexShrink: 0,
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.gray[3]}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="md" p="sm">
          {/* Render Mode */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>渲染模式</Text>
            <Select
              size="xs"
              value={params.renderMode}
              onChange={(v) => setParams({ renderMode: (v ?? "png") as RenderMode })}
              data={[
                { value: "png", label: "PNG - 快速，适合大图" },
                { value: "svg", label: "SVG - 矢量，缩放不失真" },
                { value: "canvas", label: "Canvas - 灵活，支持交互" },
              ]}
            />
          </Box>

          {/* Width */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>
              宽度: {params.width} 字符
            </Text>
            <Slider
              size="xs"
              value={params.width}
              onChange={(v) => setParams({ width: v })}
              min={300}
              max={2000}
              step={10}
            />
          </Box>

          {/* Charset */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>字符集</Text>
            <Select
              size="xs"
              value={params.charset}
              onChange={(v) => setParams({ charset: (v ?? "standard") as CharsetPreset })}
              data={[
                { value: "simple", label: "简单" },
                { value: "standard", label: "标准" },
                { value: "complex", label: "复杂" },
                { value: "custom", label: "自定义" },
              ]}
            />
          </Box>

          {/* Custom charset */}
          {params.charset === "custom" && (
            <Box>
              <Text size="xs" fw={500} c="dimmed" mb={4}>自定义字符</Text>
              <TextInput
                size="xs"
                style={{ fontFamily: "monospace" }}
                value={params.customCharset}
                onChange={(e) => setParams({ customCharset: e.currentTarget.value })}
                placeholder="从暗到亮排列字符"
              />
            </Box>
          )}

          {/* Contrast */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>
              对比度: {params.contrast.toFixed(1)}
            </Text>
            <Slider
              size="xs"
              value={params.contrast}
              onChange={(v) => setParams({ contrast: v })}
              min={0.1}
              max={3.0}
              step={0.1}
            />
          </Box>

          {/* Brightness */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>
              亮度: {params.brightness.toFixed(1)}
            </Text>
            <Slider
              size="xs"
              value={params.brightness}
              onChange={(v) => setParams({ brightness: v })}
              min={-1.0}
              max={1.0}
              step={0.1}
            />
          </Box>

          {/* Saturation */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>
              饱和度: {params.saturation.toFixed(1)}
            </Text>
            <Slider
              size="xs"
              value={params.saturation}
              onChange={(v) => setParams({ saturation: v })}
              min={0.0}
              max={2.0}
              step={0.1}
            />
          </Box>

          {/* Char aspect ratio */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>
              字符宽高比: {params.charAspectRatio.toFixed(2)}
            </Text>
            <Slider
              size="xs"
              value={params.charAspectRatio}
              onChange={(v) => setParams({ charAspectRatio: v })}
              min={0.3}
              max={1.0}
              step={0.05}
            />
          </Box>

          {/* Invert */}
          <Checkbox
            size="xs"
            label="反转明暗"
            checked={params.invert}
            onChange={(e) => setParams({ invert: e.currentTarget.checked })}
          />

          {/* Color mode */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>颜色模式</Text>
            <Select
              size="xs"
              value={params.colorMode}
              onChange={(v) => setParams({ colorMode: (v ?? "monochrome") as ColorMode })}
              data={[
                { value: "monochrome", label: "单色" },
                { value: "ansi256", label: "ANSI 256色" },
                { value: "trueColor", label: "真彩色" },
                { value: "html", label: "HTML" },
              ]}
            />
          </Box>

          {/* Background */}
          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>背景</Text>
            <Select
              size="xs"
              value={params.background}
              onChange={(v) => setParams({ background: (v ?? "black") as Background })}
              data={[
                { value: "black", label: "黑色" },
                { value: "white", label: "白色" },
                { value: "transparent", label: "透明" },
              ]}
            />
          </Box>
        </Stack>
      </ScrollArea>
    </Box>
  );
}
