import { createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";
import { hexToHsl, hslToHex, hexToRgba, blendOver, rgbaToHex } from "@/lib/color";

// === 琥珀金主色调 ===
const amber: MantineColorsTuple = [
  "#FFF8EB",
  "#FFEFC2",
  "#FFE08A",
  "#FFD060",
  "#F5A623",
  "#D4880F",
  "#B37200",
  "#8A5800",
  "#6B4500",
  "#4D3200",
];

// === 功能色 ===
const blue: MantineColorsTuple = [
  "#e7f0ff",
  "#d0ddff",
  "#a0b8ff",
  "#6b8fff",
  "#3b6bff",
  "#1a52ff",
  "#0042ee",
  "#0036c7",
  "#002da3",
  "#002280",
];

const green: MantineColorsTuple = [
  "#e3fcec",
  "#c5f5d5",
  "#8eeaae",
  "#52de83",
  "#27d462",
  "#0cc04b",
  "#00a93e",
  "#008732",
  "#006b29",
  "#005020",
];

const red: MantineColorsTuple = [
  "#fff0f0",
  "#ffe0e0",
  "#ffb8b8",
  "#ff8080",
  "#ff5050",
  "#ff2020",
  "#e50000",
  "#c00000",
  "#9c0000",
  "#7a0000",
];

const purple: MantineColorsTuple = [
  "#f3eaff",
  "#dfc8ff",
  "#be8eff",
  "#9c51ff",
  "#7e2aff",
  "#6a10ff",
  "#5c00eb",
  "#4c00c4",
  "#3f00a0",
  "#32007d",
];

const orange: MantineColorsTuple = [
  "#fff4e6",
  "#ffe0b8",
  "#ffc06b",
  "#ff9d24",
  "#ff8200",
  "#ff7000",
  "#e56000",
  "#c04e00",
  "#9a3f00",
  "#7a3200",
];

const rose: MantineColorsTuple = [
  "#ffe5ec",
  "#ffc0d1",
  "#ff8aad",
  "#ff5088",
  "#ff2068",
  "#ff0050",
  "#e50045",
  "#c0003a",
  "#9c0030",
  "#7a0025",
];

// === 暗色表面色 ===
const dark: MantineColorsTuple = [
  "#E8E8EC",   // 0: 最亮文字
  "#CDCDD4",   // 1: 次亮文字
  "#9494A0",   // 2: 弱化文字
  "#5C5C68",   // 3: 禁用文字
  "#3A3A42",   // 4: 边框
  "#2A2A32",   // 5: 抬升表面
  "#222228",   // 6: 卡片表面
  "#1A1A1F",   // 7: 基础表面
  "#131316",   // 8: 深层表面
  "#0C0C0E",   // 9: 最深背景
];

const MANTINE_THEME = createTheme({
  primaryColor: "amber",
  colors: { amber, blue, green, red, purple, orange, rose, dark },
  fontFamily: "'DM Sans Variable', 'Noto Sans SC', -apple-system, 'Segoe UI', sans-serif",
  defaultRadius: "md",
  headings: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontWeight: "600",
  },
  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Tabs: {
      defaultProps: {
        radius: "md",
      },
    },
  },
});

// === 色彩主题系统 ===
export type ColorTheme = "default" | "blue" | "green" | "purple" | "orange" | "rose";

export function getThemeWithPrimary(themeName: ColorTheme, customPrimary?: string, selectedShadeIndex?: number) {
  // 1. 确定活跃色板
  const activeTuple: MantineColorsTuple = customPrimary
    ? generateColorTuple(customPrimary)
    : PRESET_THEMES[themeName].tuple;

  // 2. 色阶覆盖：用选中色阶的 hex 重新生成完整色板
  if (selectedShadeIndex !== undefined) {
    const shadeHex = activeTuple[selectedShadeIndex];
    return {
      ...MANTINE_THEME,
      primaryColor: "custom" as const,
      colors: {
        ...MANTINE_THEME.colors,
        custom: generateColorTuple(shadeHex),
      },
    };
  }

  // 3. 原有逻辑（无色阶覆盖）
  if (customPrimary) {
    return {
      ...MANTINE_THEME,
      primaryColor: "custom",
      colors: {
        ...MANTINE_THEME.colors,
        custom: generateColorTuple(customPrimary),
      },
    };
  }
  if (themeName === "default") {
    return { ...MANTINE_THEME, primaryColor: "amber" };
  }
  return { ...MANTINE_THEME, primaryColor: themeName };
}

export const THEME_PALETTES: Record<ColorTheme, string> = {
  default: amber[5],
  blue: blue[5],
  green: green[5],
  purple: purple[5],
  orange: orange[5],
  rose: rose[5],
};

export interface PresetThemeConfig {
  key: ColorTheme;
  /** 锚点色 (index-5) */
  anchorHex: string;
  /** 亮色变体 (index-4)，用于 hover/active 状态 */
  accentHex: string;
  /** 完整 10 阶色板 */
  tuple: MantineColorsTuple;
}

export const PRESET_THEMES: Record<ColorTheme, PresetThemeConfig> = {
  default: { key: "default", anchorHex: amber[5], accentHex: amber[4], tuple: amber },
  blue:    { key: "blue",    anchorHex: blue[5],    accentHex: blue[4],    tuple: blue },
  green:   { key: "green",   anchorHex: green[5],   accentHex: green[4],   tuple: green },
  purple:  { key: "purple",  anchorHex: purple[5],  accentHex: purple[4],  tuple: purple },
  orange:  { key: "orange",  anchorHex: orange[5],  accentHex: orange[4],  tuple: orange },
  rose:    { key: "rose",    anchorHex: rose[5],    accentHex: rose[4],    tuple: rose },
};

export function generateColorTuple(hex: string): MantineColorsTuple {
  // 如果包含 alpha < 255，blend 到默认亮色表面产生等效不透明色
  const rgba = hexToRgba(hex);
  const effectiveRgb = rgba.a < 255
    ? blendOver(rgba.r, rgba.g, rgba.b, rgba.a, 245, 245, 247)
    : { r: rgba.r, g: rgba.g, b: rgba.b };
  const effectiveHex = rgbaToHex(effectiveRgb.r, effectiveRgb.g, effectiveRgb.b);
  const [h, s] = hexToHsl(effectiveHex);
  return [
    hslToHex(h, Math.max(s - 30, 10), 95),
    hslToHex(h, Math.max(s - 20, 15), 88),
    hslToHex(h, Math.max(s - 10, 20), 78),
    hslToHex(h, s, 68),
    hslToHex(h, s, 58),
    effectiveHex,
    hslToHex(h, Math.min(s + 5, 100), 45),
    hslToHex(h, Math.min(s + 5, 100), 38),
    hslToHex(h, Math.min(s + 5, 100), 30),
    hslToHex(h, Math.min(s + 5, 100), 22),
  ] as MantineColorsTuple;
}
