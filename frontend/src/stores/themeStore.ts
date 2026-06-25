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
  setColorMode: (mode: ColorMode) => Promise<void>;
  setColorTheme: (theme: ColorTheme) => Promise<void>;
  setCustomPrimary: (hex: string | undefined) => Promise<void>;
  setSelectedShadeIndex: (index: number | undefined) => Promise<void>;
  loadFromStore: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  colorMode: "system",
  colorTheme: "default",
  customPrimary: undefined,
  selectedShadeIndex: undefined,
  loaded: false,

  setColorMode: async (mode) => {
    // 1) 同步更新 zustand 状态，保证 UI 即时响应
    set({ colorMode: mode });
    // 2) 异步持久化（best-effort，不影响 UI）
    try {
      await settingsStore.set("colorMode", mode);
      await settingsStore.save();
    } catch (e) {
      console.error("Failed to persist colorMode:", e);
    }
  },

  setColorTheme: async (theme) => {
    // 1) 同步完成所有 zustand set()，确保原子性
    //    ⚠️ 必须在第一次 await 前完成全部 set()，防止中途抛异常导致状态不一致
    set({
      colorTheme: theme,
      selectedShadeIndex: undefined,
      customPrimary: theme !== "default" ? undefined : get().customPrimary,
    });
    // 2) 异步持久化
    try {
      await settingsStore.set("colorTheme", theme);
      await settingsStore.set("selectedShadeIndex", undefined);
      await settingsStore.save();
      if (theme !== "default") {
        await settingsStore.set("customPrimary", undefined);
        await settingsStore.save();
      }
    } catch (e) {
      console.error("Failed to persist colorTheme:", e);
    }
  },

  setCustomPrimary: async (hex) => {
    // 1) 同步完成所有 zustand set()
    set({
      customPrimary: hex,
      selectedShadeIndex: undefined,
      colorTheme: hex ? "default" : get().colorTheme,
    });
    // 2) 异步持久化
    try {
      await settingsStore.set("customPrimary", hex);
      await settingsStore.set("selectedShadeIndex", undefined);
      await settingsStore.save();
      if (hex) {
        await settingsStore.set("colorTheme", "default");
        await settingsStore.save();
      }
    } catch (e) {
      console.error("Failed to persist customPrimary:", e);
    }
  },

  setSelectedShadeIndex: async (index) => {
    // 1) 同步更新 zustand 状态
    set({ selectedShadeIndex: index });
    // 2) 异步持久化
    try {
      await settingsStore.set("selectedShadeIndex", index);
      await settingsStore.save();
    } catch (e) {
      console.error("Failed to persist selectedShadeIndex:", e);
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
      selectedShadeIndex: undefined, // selectedShadeIndex 不跨会话持久化
      loaded: true,
    });
  },
}));
