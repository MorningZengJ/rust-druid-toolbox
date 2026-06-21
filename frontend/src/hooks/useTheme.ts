import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";
import type { ColorMode, ColorTheme } from "@/stores/themeStore";

export type { ColorMode, ColorTheme };

export function useColorThemes() {
  const { t } = useTranslation("common");

  const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
    { value: "default", label: t("colors.default"), color: "#1a1a2e" },
    { value: "blue", label: t("colors.blue"), color: "#1a52ff" },
    { value: "green", label: t("colors.green"), color: "#0cc04b" },
    { value: "purple", label: t("colors.purple"), color: "#6a10ff" },
    { value: "orange", label: t("colors.orange"), color: "#ff8200" },
    { value: "rose", label: t("colors.rose"), color: "#ff0050" },
  ];

  return COLOR_THEMES;
}

/** @deprecated Use useColorThemes() instead */
export const COLOR_THEMES = [
  { value: "default" as ColorTheme, label: "默认", color: "#1a1a2e" },
  { value: "blue" as ColorTheme, label: "蓝色", color: "#1a52ff" },
  { value: "green" as ColorTheme, label: "绿色", color: "#0cc04b" },
  { value: "purple" as ColorTheme, label: "紫色", color: "#6a10ff" },
  { value: "orange" as ColorTheme, label: "橙色", color: "#ff8200" },
  { value: "rose" as ColorTheme, label: "玫红", color: "#ff0050" },
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
