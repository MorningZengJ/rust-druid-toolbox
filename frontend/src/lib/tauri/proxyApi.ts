import { invoke } from "./client";
import type { ProxyConfig } from "@/lib/configValidator";

/** 当前进程环境变量的快照 */
export interface ProxyState {
  httpProxy: string | null;
  httpsProxy: string | null;
  allProxy: string | null;
  noProxy: string | null;
}

/** 代理连接测试结果 */
export interface ProxyTestResult {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  errorKind: string | null;
}

/** 获取当前持久化的代理配置 */
export function getProxyConfig(): Promise<ProxyConfig> {
  return invoke<ProxyConfig>("get_proxy_config");
}

/** 保存并应用代理配置 */
export function setProxyConfig(config: ProxyConfig): Promise<void> {
  return invoke<void>("set_proxy_config", { config });
}

/** 读取当前进程环境变量快照 */
export function getCurrentProxyState(): Promise<ProxyState> {
  return invoke<ProxyState>("get_current_proxy_state");
}

/** 获取当前代理配置对应的有效代理 URL（供 updater 等组件使用） */
export function getEffectiveProxyUrl(): Promise<string | null> {
  return invoke<string | null>("get_effective_proxy_url");
}

/** 使用当前代理配置测试与目标 URL 的连接 */
export function testProxyConnection(testUrl: string): Promise<ProxyTestResult> {
  return invoke<ProxyTestResult>("test_proxy_connection", { testUrl });
}
