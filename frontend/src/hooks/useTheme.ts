import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";
import { THEME_PALETTES } from "@/mantine-theme";
import type { ColorMode, ColorTheme } from "@/stores/themeStore";

export type { ColorMode, ColorTheme };

export function useColorThemes() {
  const { t } = useTranslation("common");

  const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
    { value: "default", label: t("colors.default"), color: THEME_PALETTES.default },
    { value: "blue", label: t("colors.blue"), color: THEME_PALETTES.blue },
    { value: "green", label: t("colors.green"), color: THEME_PALETTES.green },
    { value: "purple", label: t("colors.purple"), color: THEME_PALETTES.purple },
    { value: "orange", label: t("colors.orange"), color: THEME_PALETTES.orange },
    { value: "rose", label: t("colors.rose"), color: THEME_PALETTES.rose },
  ];

  return COLOR_THEMES;
}

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
