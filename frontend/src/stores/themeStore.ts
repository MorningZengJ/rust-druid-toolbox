import { create } from "zustand";
import { LazyStore } from "@tauri-apps/plugin-store";

export type ColorMode = "light" | "dark" | "system";
export type ColorTheme = "default" | "blue" | "green" | "purple" | "orange" | "rose";

const persistStore = new LazyStore("settings.json");

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
    persistStore.set("colorMode", mode);
  },

  setColorTheme: (theme) => {
    set({ colorTheme: theme });
    persistStore.set("colorTheme", theme);
    if (theme !== "default") {
      set({ customPrimary: undefined });
      persistStore.set("customPrimary", undefined);
    }
  },

  setCustomPrimary: (hex) => {
    set({ customPrimary: hex });
    persistStore.set("customPrimary", hex);
    if (hex) {
      set({ colorTheme: "default" });
      persistStore.set("colorTheme", "default");
    }
  },

  loadFromStore: async () => {
    const [savedMode, savedTheme, savedCustom] = await Promise.all([
      persistStore.get<ColorMode>("colorMode"),
      persistStore.get<ColorTheme>("colorTheme"),
      persistStore.get<string>("customPrimary"),
    ]);
    set({
      colorMode: savedMode ?? "system",
      colorTheme: savedTheme ?? "default",
      customPrimary: savedCustom,
      loaded: true,
    });
  },
}));
