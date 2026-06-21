import { create } from "zustand";
import { settingsStore } from "../lib/store";
import {
  validateColorMode,
  validateColorTheme,
  validateCustomPrimary,
  type ColorTheme,
} from "../lib/configValidator";

export type ColorMode = "light" | "dark" | "system";
export type { ColorTheme };

interface ThemeState {
  colorMode: ColorMode;
  colorTheme: ColorTheme;
  customPrimary: string | undefined;
  loaded: boolean;
  setColorMode: (mode: ColorMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setCustomPrimary: (hex: string | undefined) => void;
  loadFromStore: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  colorMode: "system",
  colorTheme: "default",
  customPrimary: undefined,
  loaded: false,

  setColorMode: (mode) => {
    set({ colorMode: mode });
    settingsStore.set("colorMode", mode);
  },

  setColorTheme: (theme) => {
    set({ colorTheme: theme });
    settingsStore.set("colorTheme", theme);
    if (theme !== "default") {
      set({ customPrimary: undefined });
      settingsStore.set("customPrimary", undefined);
    }
  },

  setCustomPrimary: (hex) => {
    set({ customPrimary: hex });
    settingsStore.set("customPrimary", hex);
    if (hex) {
      set({ colorTheme: "default" });
      settingsStore.set("colorTheme", "default");
    }
  },

  loadFromStore: async () => {
    const [rawMode, rawTheme, rawCustom] = await Promise.all([
      settingsStore.get("colorMode"),
      settingsStore.get("colorTheme"),
      settingsStore.get("customPrimary"),
    ]);
    set({
      colorMode: validateColorMode(rawMode),
      colorTheme: validateColorTheme(rawTheme),
      customPrimary: validateCustomPrimary(rawCustom),
      loaded: true,
    });
  },
}));
