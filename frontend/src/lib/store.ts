import { LazyStore } from "@tauri-apps/plugin-store";

/** 全局共享的 settings.json store 实例，避免多实例并发写入覆盖 */
export const settingsStore = new LazyStore("settings.json");
