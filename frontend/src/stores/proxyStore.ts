import { create } from "zustand";
import { settingsStore } from "../lib/store";
import { validateProxyConfig, type ProxyConfig } from "../lib/configValidator";
import * as proxyApi from "../lib/tauri/proxyApi";
import type { ProxyTestResult } from "../lib/tauri/proxyApi";

interface ProxyState {
  config: ProxyConfig;
  loaded: boolean;
  /** 是否正在进行代理连接测试 */
  testing: boolean;
  /** 最近一次测试结果 */
  testResult: ProxyTestResult | null;
  loadFromStore: () => Promise<void>;
  setConfig: (config: ProxyConfig) => Promise<void>;
  /** 使用当前代理配置测试与目标 URL 的连接 */
  testConnection: (testUrl: string) => Promise<ProxyTestResult>;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  config: { mode: "system", manual: null },
  loaded: false,
  testing: false,
  testResult: null,

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

  testConnection: async (testUrl: string) => {
    set({ testing: true, testResult: null });
    try {
      const result = await proxyApi.testProxyConnection(testUrl);
      set({ testing: false, testResult: result });

      // 将测试地址保存到配置中，持久化以便下次回显
      const cfg = { ...get().config, lastTestUrl: testUrl };
      await get().setConfig(cfg);

      return result;
    } catch (e) {
      console.error("[proxyStore] testConnection failed:", e);
      set({ testing: false });
      throw e;
    }
  },
}));
