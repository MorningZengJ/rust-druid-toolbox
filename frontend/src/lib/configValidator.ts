/**
 * 配置文件校验工具
 *
 * settings.json 可能被手动编辑、版本迁移、或因 bug 写入异常值。
 * 读取时必须校验类型和范围，不盲信文件内容。
 */

import type { ColorTheme } from "@/mantine-theme";

// ---- 窗口状态 ----

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

/** 窗口最小尺寸，与 tauri.conf.json 的 minWidth/minHeight 一致 */
const MIN_WIDTH = 600;
const MIN_HEIGHT = 400;

/**
 * 校验并修复窗口状态。
 * - 字段缺失或类型错误 → 返回 null（使用默认值）
 * - 尺寸低于最小值 → 返回 null
 * - 位置为负数 → 保留，恢复时会 center
 */
export function validateWindowState(raw: unknown): WindowState | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const width = obj.width;
  const height = obj.height;
  const x = obj.x;
  const y = obj.y;
  const isMaximized = obj.isMaximized;

  // 类型校验
  if (typeof width !== "number" || typeof height !== "number") return null;
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (typeof isMaximized !== "boolean") return null;

  // NaN / Infinity
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  // 尺寸下限（最大化状态允许任意值，由系统处理）
  if (!isMaximized && (width < MIN_WIDTH || height < MIN_HEIGHT)) return null;

  return { x, y, width, height, isMaximized };
}

// ---- 主题 ----

const VALID_COLOR_MODES = new Set(["light", "dark", "system"]);
const VALID_COLOR_THEMES = new Set(["default", "blue", "green", "purple", "orange", "rose"]);

export function validateColorMode(raw: unknown): "light" | "dark" | "system" {
  if (typeof raw === "string" && VALID_COLOR_MODES.has(raw)) {
    return raw as "light" | "dark" | "system";
  }
  return "system";
}

export type { ColorTheme } from "@/mantine-theme";

export function validateColorTheme(raw: unknown): ColorTheme {
  if (typeof raw === "string" && VALID_COLOR_THEMES.has(raw)) {
    return raw as ColorTheme;
  }
  return "default";
}

export function validateCustomPrimary(raw: unknown): string | undefined {
  if (typeof raw === "string" && /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(raw)) {
    return raw;
  }
  return undefined;
}

// ---- 更新设置 ----

export function validateAutoCheck(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : false;
}
