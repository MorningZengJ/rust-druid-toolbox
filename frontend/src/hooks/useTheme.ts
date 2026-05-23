import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { useThemeStore } from "@/stores/themeStore";
import type { ColorMode, ColorTheme } from "@/stores/themeStore";

export type { ColorMode, ColorTheme };

export const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
  { value: "default", label: "默认", color: "#1a1a2e" },
  { value: "blue", label: "蓝色", color: "#1a52ff" },
  { value: "green", label: "绿色", color: "#0cc04b" },
  { value: "purple", label: "紫色", color: "#6a10ff" },
  { value: "orange", label: "橙色", color: "#ff8200" },
  { value: "rose", label: "玫红", color: "#ff0050" },
];

export function useTheme() {
  return useThemeStore();
}

export function useColorSchemeSync() {
  const colorMode = useThemeStore((s) => s.colorMode);
  const loaded = useThemeStore((s) => s.loaded);
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (!loaded) return;
    if (colorMode === "system") {
      setColorScheme("auto");
    } else {
      setColorScheme(colorMode);
    }
  }, [colorMode, loaded, setColorScheme]);
}
