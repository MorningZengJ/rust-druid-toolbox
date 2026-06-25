import { invoke as tauriInvoke } from "@tauri-apps/api/core";

/**
 * 统一 typed invoke 包装。
 * 所有 Tauri 后端命令必须通过此函数调用，不允许 store/page 直接 import invoke。
 */
export async function invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> {
  return tauriInvoke<T>(command, args);
}
