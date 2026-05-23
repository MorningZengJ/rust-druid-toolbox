import { useState, useEffect, useCallback } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { LazyStore } from "@tauri-apps/plugin-store";

export type ColorMode = "light" | "dark" | "system";
export type ColorTheme = "default" | "blue" | "green" | "purple" | "orange" | "rose";

export const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
  { value: "default", label: "默认", color: "#1a1a2e" },
  { value: "blue", label: "蓝色", color: "#1a52ff" },
  { value: "green", label: "绿色", color: "#0cc04b" },
  { value: "purple", label: "紫色", color: "#6a10ff" },
  { value: "orange", label: "橙色", color: "#ff8200" },
  { value: "rose", label: "玫红", color: "#ff0050" },
];

const store = new LazyStore("settings.json");

export function useTheme() {
  const { setColorScheme } = useMantineColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>("system");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("default");
  const [customPrimary, setCustomPrimaryState] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  // Sync with store on mount
  useEffect(() => {
    (async () => {
      const [savedMode, savedTheme, savedCustom] = await Promise.all([
        store.get<ColorMode>("colorMode"),
        store.get<ColorTheme>("colorTheme"),
        store.get<string>("customPrimary"),
      ]);
      if (savedMode) setColorModeState(savedMode);
      if (savedTheme) setColorThemeState(savedTheme);
      if (savedCustom) setCustomPrimaryState(savedCustom);
      setLoaded(true);
    })();
  }, []);

  // Apply color scheme to Mantine whenever colorMode changes
  useEffect(() => {
    if (!loaded) return;
    if (colorMode === "system") {
      setColorScheme("auto");
    } else {
      setColorScheme(colorMode);
    }
  }, [colorMode, loaded, setColorScheme]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    store.set("colorMode", mode);
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    store.set("colorTheme", theme);
    if (theme !== "default") {
      setCustomPrimaryState(undefined);
      store.set("customPrimary", undefined);
    }
  }, []);

  const setCustomPrimary = useCallback((hex: string | undefined) => {
    setCustomPrimaryState(hex);
    if (hex) {
      store.set("customPrimary", hex);
      setColorThemeState("default");
      store.set("colorTheme", "default");
    } else {
      store.set("customPrimary", undefined);
    }
  }, []);

  const isDark =
    colorMode === "dark" ||
    (colorMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return {
    colorMode,
    colorTheme,
    customPrimary,
    isDark,
    loaded,
    setColorMode,
    setColorTheme,
    setCustomPrimary,
  };
}
