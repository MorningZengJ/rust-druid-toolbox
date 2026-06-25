import { create } from "zustand";
import { settingsStore } from "../lib/store";
import { validateProxyConfig, type ProxyConfig } from "../lib/configValidator";
import * as proxyApi from "../lib/tauri/proxyApi";

interface ProxyState {
  config: ProxyConfig;
  loaded: boolean;
  loadFromStore: () => Promise<void>;
  setConfig: (config: ProxyConfig) => Promise<void>;
}

export const useProxyStore = create<ProxyState>((set) => ({
  config: { mode: "system", manual: null },
  loaded: false,

  loadFromStore: async () => {
    try {
      const raw = await settingsStore.get("proxy");
      const config = validateProxyConfig(raw);
      set({ config, loaded: true });
    } catch {
      // 首次运行或数据损坏，使用默认值
      set({ loaded: true });
    }
  },

  setConfig: async (config) => {
    // 1) 同步更新 Zustand 状态，保证 UI 即时响应
    set({ config });
    // 2) 异步持久化（best-effort）
    try {
      await settingsStore.set("proxy", config);
      await settingsStore.save();
    } catch (e) {
      console.error("Failed to persist proxy config:", e);
    }
    // 3) 通过 IPC 应用到 Rust 后端
    try {
      await proxyApi.setProxyConfig(config);
    } catch (e) {
      console.error("Failed to apply proxy settings in backend:", e);
    }
  },
}));
