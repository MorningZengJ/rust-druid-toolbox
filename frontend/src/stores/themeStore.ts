import { create } from "zustand";
import { settingsStore } from "../lib/store";
import {
  validateColorMode,
  validateColorTheme,
  validateCustomPrimary,
  validateSelectedShadeIndex,
  type ColorTheme,
} from "../lib/configValidator";

export type ColorMode = "light" | "dark" | "system";
export type { ColorTheme };

interface ThemeState {
  colorMode: ColorMode;
  colorTheme: ColorTheme;
  customPrimary: string | undefined;
  selectedShadeIndex: number | undefined;
  loaded: boolean;
  setColorMode: (mode: ColorMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setCustomPrimary: (hex: string | undefined) => void;
  setSelectedShadeIndex: (index: number | undefined) => void;
  loadFromStore: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  colorMode: "system",
  colorTheme: "default",
  customPrimary: undefined,
  selectedShadeIndex: undefined,
  loaded: false,

  setColorMode: (mode) => {
    set({ colorMode: mode });
    settingsStore.set("colorMode", mode);
  },

  setColorTheme: (theme) => {
    set({ colorTheme: theme, selectedShadeIndex: undefined });
    settingsStore.set("colorTheme", theme);
    settingsStore.set("selectedShadeIndex", undefined);
    if (theme !== "default") {
      set({ customPrimary: undefined });
      settingsStore.set("customPrimary", undefined);
    }
  },

  setCustomPrimary: (hex) => {
    set({ customPrimary: hex, selectedShadeIndex: undefined });
    settingsStore.set("customPrimary", hex);
    settingsStore.set("selectedShadeIndex", undefined);
    if (hex) {
      set({ colorTheme: "default" });
      settingsStore.set("colorTheme", "default");
    }
  },

  setSelectedShadeIndex: (index) => {
    set({ selectedShadeIndex: index });
    settingsStore.set("selectedShadeIndex", index);
  },

  loadFromStore: async () => {
    const [rawMode, rawTheme, rawCustom, rawShadeIndex] = await Promise.all([
      settingsStore.get("colorMode"),
      settingsStore.get("colorTheme"),
      settingsStore.get("customPrimary"),
      settingsStore.get("selectedShadeIndex"),
    ]);
    set({
      colorMode: validateColorMode(rawMode),
      colorTheme: validateColorTheme(rawTheme),
      customPrimary: validateCustomPrimary(rawCustom),
      selectedShadeIndex: validateSelectedShadeIndex(rawShadeIndex),
      loaded: true,
    });
  },
}));
