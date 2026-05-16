import { useState, useEffect, useCallback } from "react";
import { LazyStore } from "@tauri-apps/plugin-store";

export type ColorMode = "light" | "dark" | "system";
export type ColorTheme = "default" | "blue" | "green" | "purple" | "orange" | "rose";

export const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
  { value: "default", label: "默认", color: "hsl(240, 5.9%, 10%)" },
  { value: "blue", label: "蓝色", color: "hsl(221, 83%, 53%)" },
  { value: "green", label: "绿色", color: "hsl(142, 71%, 45%)" },
  { value: "purple", label: "紫色", color: "hsl(262, 83%, 58%)" },
  { value: "orange", label: "橙色", color: "hsl(25, 95%, 53%)" },
  { value: "rose", label: "玫红", color: "hsl(347, 77%, 50%)" },
];

const store = new LazyStore("settings.json");

function applyColorMode(colorMode: ColorMode) {
  const root = document.documentElement;
  if (colorMode === "dark") {
    root.classList.add("dark");
  } else if (colorMode === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

function applyColorTheme(colorTheme: ColorTheme, customPrimary?: string) {
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("theme-blue", "theme-green", "theme-purple", "theme-orange", "theme-rose");

  // Add selected theme class (skip for default)
  if (colorTheme !== "default") {
    root.classList.add(`theme-${colorTheme}`);
  }

  // Apply custom primary color if provided
  if (customPrimary) {
    root.style.setProperty("--primary", customPrimary);
    root.style.setProperty("--accent", customPrimary);
    root.style.setProperty("--ring", customPrimary);
    root.style.setProperty("--sidebar-primary", customPrimary);
    // Keep foreground as white for custom colors
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--accent-foreground", "0 0% 100%");
    root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
  } else {
    // Clear custom properties to use theme defaults
    root.style.removeProperty("--primary");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--primary-foreground");
    root.style.removeProperty("--accent-foreground");
    root.style.removeProperty("--sidebar-primary-foreground");
  }
}

export function useTheme() {
  const [colorMode, setColorModeState] = useState<ColorMode>("system");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("default");
  const [customPrimary, setCustomPrimaryState] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  // Load persisted values from store on mount
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

  // Apply color mode after load and on change
  useEffect(() => {
    if (!loaded) return;
    applyColorMode(colorMode);

    if (colorMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyColorMode("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [colorMode, loaded]);

  // Apply color theme after load and on change
  useEffect(() => {
    if (!loaded) return;
    applyColorTheme(colorTheme, customPrimary);
  }, [colorTheme, customPrimary, loaded]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    store.set("colorMode", mode);
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    store.set("colorTheme", theme);
    // Clear custom primary when switching to a preset theme
    if (theme !== "default") {
      setCustomPrimaryState(undefined);
      store.set("customPrimary", undefined);
    }
  }, []);

  const setCustomPrimary = useCallback((hsl: string | undefined) => {
    setCustomPrimaryState(hsl);
    if (hsl) {
      store.set("customPrimary", hsl);
      // Switch to default theme when custom color is set
      setColorThemeState("default");
      store.set("colorTheme", "default");
    } else {
      store.set("customPrimary", undefined);
    }
  }, []);

  const isDark =
    colorMode === "dark" ||
    (colorMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Legacy compatibility
  const theme = colorMode;
  const setTheme = setColorMode;

  return {
    colorMode,
    colorTheme,
    customPrimary,
    isDark,
    setColorMode,
    setColorTheme,
    setCustomPrimary,
    // Legacy compatibility
    theme,
    setTheme,
  };
}
