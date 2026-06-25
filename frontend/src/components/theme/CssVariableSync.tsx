import { useLayoutEffect, useRef } from "react";
import { useComputedColorScheme } from "@mantine/core";
import { useThemeStore } from "@/stores/themeStore";
import { getThemeWithPrimary } from "@/mantine-theme";
import { hexToRgb, tintForDarkSurface } from "@/lib/color";

/**
 * 生成主题指纹，用于判断主题是否真正变化（跳过 transition 的重复设置）
 */
function themeFingerprint(
  colorTheme: string,
  customPrimary: string | undefined,
  selectedShadeIndex: number | undefined,
): string {
  return `${colorTheme}|${customPrimary ?? ""}|${selectedShadeIndex ?? ""}`;
}

/** 主色调同步到 CSS 变量 + 暗色表面色微调 */
export function CssVariableSync() {
  const colorTheme = useThemeStore((s) => s.colorTheme);
  const customPrimary = useThemeStore((s) => s.customPrimary);
  const selectedShadeIndex = useThemeStore((s) => s.selectedShadeIndex);
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

  // 记录上一次的主题指纹，避免重复设置 transition
  const prevFingerprintRef = useRef("");

  // 将所有计算放在 useLayoutEffect 内部，确保闭包始终捕获最新值
  useLayoutEffect(() => {
    const theme = getThemeWithPrimary(colorTheme, customPrimary, selectedShadeIndex);
    const primary = theme.colors?.[theme.primaryColor];
    const primaryHex = primary?.[5];

    if (!primary || !primaryHex) return;

    const root = document.documentElement;
    const accentRgb = hexToRgb(primary[5]);

    // 仅在主题真正变化时设置过渡动画，避免每次 effect 都重设
    const fp = themeFingerprint(colorTheme, customPrimary, selectedShadeIndex) + "|" + (isDark ? "dark" : "light");
    if (fp !== prevFingerprintRef.current) {
      prevFingerprintRef.current = fp;
      root.style.transition =
        "background-color 300ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease";
    }

    // 主色调
    root.style.setProperty("--accent-primary", primary[5]);
    root.style.setProperty("--accent-light", primary[3]);
    root.style.setProperty("--accent-dark", primary[7]);
    root.style.setProperty("--accent-glow", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`);

    if (isDark) {
      // 暗色表面色随主色调微调
      root.style.setProperty("--surface-base", tintForDarkSurface(primaryHex, 4));
      root.style.setProperty("--surface-raised", tintForDarkSurface(primaryHex, 6));
      root.style.setProperty("--surface-overlay", tintForDarkSurface(primaryHex, 8));
      root.style.setProperty("--surface-panel", tintForDarkSurface(primaryHex, 10));

      root.style.setProperty("--text-primary", "#E8E8EC");
      root.style.setProperty("--text-secondary", "#9494A0");
      root.style.setProperty("--text-muted", "#5C5C68");
      root.style.setProperty("--text-disabled", "#3A3A42");

      root.style.setProperty("--border-subtle", "rgba(255, 255, 255, 0.04)");
      root.style.setProperty("--border-default", "rgba(255, 255, 255, 0.08)");
      root.style.setProperty("--border-strong", "rgba(255, 255, 255, 0.14)");

      root.style.setProperty("--shadow-sm", "0 1px 2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)");
      root.style.setProperty("--shadow-md", "0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)");
      root.style.setProperty("--shadow-lg", "0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)");
    } else {
      root.style.setProperty("--surface-base", "#F5F5F7");
      root.style.setProperty("--surface-raised", "#FFFFFF");
      root.style.setProperty("--surface-overlay", "#FFFFFF");
      root.style.setProperty("--surface-panel", "#EDEDF0");

      root.style.setProperty("--text-primary", "#1A1A2E");
      root.style.setProperty("--text-secondary", "#6B6B80");
      root.style.setProperty("--text-muted", "#9494A0");
      root.style.setProperty("--text-disabled", "#C0C0CC");

      root.style.setProperty("--border-subtle", "rgba(0, 0, 0, 0.04)");
      root.style.setProperty("--border-default", "rgba(0, 0, 0, 0.08)");
      root.style.setProperty("--border-strong", "rgba(0, 0, 0, 0.14)");

      root.style.setProperty("--shadow-sm", "0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)");
      root.style.setProperty("--shadow-md", "0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.06)");
      root.style.setProperty("--shadow-lg", "0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)");
    }

    // 状态色（亮色/暗色相同）
    root.style.setProperty("--status-success", "#10B981");
    root.style.setProperty("--status-success-alt", "#34D399");
    root.style.setProperty("--status-success-bg", "rgba(16, 185, 129, 0.1)");
    root.style.setProperty("--status-success-border", "rgba(16, 185, 129, 0.2)");
    root.style.setProperty("--status-error", "#F87171");
    root.style.setProperty("--status-error-bg", "rgba(239, 68, 68, 0.1)");
    root.style.setProperty("--status-error-border", "rgba(239, 68, 68, 0.2)");
    root.style.setProperty("--status-warning", "#F59E0B");
    root.style.setProperty("--status-warning-bg", "rgba(245, 158, 11, 0.1)");
    root.style.setProperty("--status-warning-border", "rgba(245, 158, 11, 0.2)");
  }, [colorTheme, customPrimary, selectedShadeIndex, isDark]);

  return null;
}
