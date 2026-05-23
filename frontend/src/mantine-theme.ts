import { createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

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

export const MANTINE_THEME = createTheme({
  primaryColor: "blue",
  colors: { blue, green, purple, orange, rose },
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  defaultRadius: "md",
  headings: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  },
});

export type ColorTheme = "default" | "blue" | "green" | "purple" | "orange" | "rose";

export const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
  { value: "default", label: "默认", color: "#1a1a2e" },
  { value: "blue", label: "蓝色", color: "#1a52ff" },
  { value: "green", label: "绿色", color: "#0cc04b" },
  { value: "purple", label: "紫色", color: "#6a10ff" },
  { value: "orange", label: "橙色", color: "#ff8200" },
  { value: "rose", label: "玫红", color: "#ff0050" },
];

export function getThemeWithPrimary(themeName: ColorTheme, customPrimary?: string) {
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
    return { ...MANTINE_THEME, primaryColor: "blue" };
  }
  return { ...MANTINE_THEME, primaryColor: themeName };
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateColorTuple(hex: string): MantineColorsTuple {
  const [h, s] = hexToHsl(hex);
  return [
    hslToHex(h, Math.max(s - 30, 10), 95),
    hslToHex(h, Math.max(s - 20, 15), 88),
    hslToHex(h, Math.max(s - 10, 20), 78),
    hslToHex(h, s, 68),
    hslToHex(h, s, 58),
    hex,
    hslToHex(h, Math.min(s + 5, 100), 45),
    hslToHex(h, Math.min(s + 5, 100), 38),
    hslToHex(h, Math.min(s + 5, 100), 30),
    hslToHex(h, Math.min(s + 5, 100), 22),
  ] as MantineColorsTuple;
}
