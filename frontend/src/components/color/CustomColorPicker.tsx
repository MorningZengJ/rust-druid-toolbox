import { useState, useEffect, useRef, useCallback } from "react";
import { THEME_PALETTES } from "@/mantine-theme";
import { hexToHsv, hsvToHex, hsvToRgb, rgbaToHex, hexToRgba } from "@/lib/color";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PresetColor {
  hex: string;
  label?: string;
}

interface CustomColorPickerProps {
  value: string;
  onChange: (v: string) => void;
  presets?: PresetColor[];
  width?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientPos(e: PointerEvent): { x: number; y: number } {
  return { x: e.clientX, y: e.clientY };
}

export const DEFAULT_HEX = "#3b82f6";

// ---------------------------------------------------------------------------
// CustomColorPicker
// ---------------------------------------------------------------------------

function CustomColorPicker({
  value,
  onChange,
  presets,
  width = 300,
}: CustomColorPickerProps) {
  const initial = hexToRgba(value || DEFAULT_HEX);
  const [hsv, setHsv] = useState(() => ({
    h: hexToHsv(value || DEFAULT_HEX).h,
    s: hexToHsv(value || DEFAULT_HEX).s,
    v: hexToHsv(value || DEFAULT_HEX).v,
    a: initial.a,
  }));
  const fieldRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);

  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  const isDraggingField = useRef(false);
  const isDraggingHue = useRef(false);
  const isDraggingAlpha = useRef(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbaToHex(rgb.r, rgb.g, rgb.b, hsv.a);

  const presetList: PresetColor[] =
    presets ||
    (Object.entries(THEME_PALETTES).map(([key, hex]) => ({
      hex,
      label: key,
    })) as PresetColor[]);

  // 外部 value 同步：仅在非拖拽状态下更新内部 HSV
  useEffect(() => {
    if (!isDraggingField.current && !isDraggingHue.current && !isDraggingAlpha.current && value) {
      const rgba = hexToRgba(value);
      const hsvData = hexToHsv(value);
      setHsv({ h: hsvData.h, s: hsvData.s, v: hsvData.v, a: rgba.a });
    }
  }, [value]);

  // -- Saturation / Brightness field 拖拽逻辑 --

  const updateFromField = useCallback((clientX: number, clientY: number) => {
    if (!fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const newS = x * 100;
    const newV = (1 - y) * 100;
    setHsv((prev) => ({ ...prev, s: newS, v: newV }));
    return hsvToHex(hsvRef.current.h, newS, newV, hsvRef.current.a);
  }, []);

  const onFieldPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingField.current = true;
    const pos = getClientPos(e.nativeEvent);
    const newHex = updateFromField(pos.x, pos.y);
    if (newHex) onChangeRef.current(newHex);

    const onMove = (ev: PointerEvent) => {
      const p = getClientPos(ev);
      const h = updateFromField(p.x, p.y);
      if (h) onChangeRef.current(h);
    };
    const onUp = () => {
      isDraggingField.current = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const current = hsvRef.current;
      const finalHex = hsvToHex(current.h, current.s, current.v, current.a);
      onChangeRef.current(finalHex);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  // -- Hue slider 拖拽逻辑 --

  const updateFromHue = useCallback((clientX: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newH = x * 360;
    setHsv((prev) => ({ ...prev, h: newH }));
    return hsvToHex(newH, hsvRef.current.s, hsvRef.current.v, hsvRef.current.a);
  }, []);

  const onHuePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingHue.current = true;
    const pos = getClientPos(e.nativeEvent);
    const newHex = updateFromHue(pos.x);
    if (newHex) onChangeRef.current(newHex);

    const onMove = (ev: PointerEvent) => {
      const p = getClientPos(ev);
      const h = updateFromHue(p.x);
      if (h) onChangeRef.current(h);
    };
    const onUp = () => {
      isDraggingHue.current = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const current = hsvRef.current;
      const finalHex = hsvToHex(current.h, current.s, current.v, current.a);
      onChangeRef.current(finalHex);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  // -- Alpha slider 拖拽逻辑 --

  const updateFromAlpha = useCallback((clientX: number) => {
    if (!alphaRef.current) return;
    const rect = alphaRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newA = Math.round(x * 255);
    setHsv((prev) => ({ ...prev, a: newA }));
    return hsvToHex(hsvRef.current.h, hsvRef.current.s, hsvRef.current.v, newA);
  }, []);

  const onAlphaPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingAlpha.current = true;
    const pos = getClientPos(e.nativeEvent);
    const newHex = updateFromAlpha(pos.x);
    if (newHex) onChangeRef.current(newHex);

    const onMove = (ev: PointerEvent) => {
      const p = getClientPos(ev);
      const h = updateFromAlpha(p.x);
      if (h) onChangeRef.current(h);
    };
    const onUp = () => {
      isDraggingAlpha.current = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const current = hsvRef.current;
      const finalHex = hsvToHex(current.h, current.s, current.v, current.a);
      onChangeRef.current(finalHex);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  // 组件卸载时兜底清理
  useEffect(() => {
    return () => {
      isDraggingField.current = false;
      isDraggingHue.current = false;
      isDraggingAlpha.current = false;
    };
  }, []);

  const presetHsv = useCallback(
    (hex: string) => {
      const p = hexToHsv(hex);
      return {
        h: p.h,
        s: Math.max(p.s, 75),
        v: Math.max(p.v, 75),
        a: 255,
      };
    },
    [],
  );

  const checkerboardStyle: React.CSSProperties = {
    backgroundImage: `
      linear-gradient(45deg, #d0d0d0 25%, transparent 25%),
      linear-gradient(-45deg, #d0d0d0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #d0d0d0 75%),
      linear-gradient(-45deg, transparent 75%, #d0d0d0 75%)
    `,
    backgroundSize: "10px 10px",
    backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0",
  };

  const alphaPercent = (hsv.a / 255) * 100;
  const isOpaque = hsv.a === 255;

  return (
    <div style={{ width, userSelect: "none" }}>
      {/* Saturation / Brightness field */}
      <div
        ref={fieldRef}
        onPointerDown={onFieldPointerDown}
        style={{
          width: "100%",
          height: 200,
          borderRadius: 10,
          cursor: "crosshair",
          position: "relative",
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))
          `,
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "3px solid white",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.35)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            transition: isDraggingField.current
              ? "none"
              : "left 80ms ease-out, top 80ms ease-out",
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onPointerDown={onHuePointerDown}
        style={{
          width: "100%",
          height: 16,
          borderRadius: 8,
          marginTop: 14,
          cursor: "pointer",
          position: "relative",
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${(hsv.h / 360) * 100}%`,
            top: "50%",
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "3px solid white",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.35)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            transition: isDraggingHue.current
              ? "none"
              : "left 80ms ease-out",
          }}
        />
      </div>

      {/* Alpha slider */}
      <div
        ref={alphaRef}
        onPointerDown={onAlphaPointerDown}
        style={{
          width: "100%",
          height: 16,
          borderRadius: 8,
          marginTop: 14,
          cursor: "pointer",
          position: "relative",
          ...checkerboardStyle,
          touchAction: "none",
          overflow: "hidden",
        }}
      >
        {/* Alpha gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 8,
            background: `linear-gradient(to right, transparent, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}))`,
            pointerEvents: "none",
          }}
        />
        {/* Alpha thumb */}
        <div
          style={{
            position: "absolute",
            left: `${alphaPercent}%`,
            top: "50%",
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "3px solid white",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.35)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            transition: isDraggingAlpha.current
              ? "none"
              : "left 80ms ease-out",
          }}
        />
      </div>

      {/* Preset swatches */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {presetList.map((color) => {
          const preset = presetHsv(color.hex);
          const isActive =
            Math.abs(hsv.h - preset.h) < 12 &&
            Math.abs(hsv.s - preset.s) < 20 &&
            Math.abs(hsv.v - preset.v) < 20 &&
            isOpaque;
          return (
            <div
              key={color.hex}
              onClick={() => {
                setHsv(preset);
                onChange(hsvToHex(preset.h, preset.s, preset.v, preset.a));
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: color.hex,
                cursor: "pointer",
                border: isActive
                  ? "2.5px solid var(--accent-primary)"
                  : "2.5px solid transparent",
                boxShadow: isActive
                  ? "0 0 0 2px color-mix(in srgb, var(--accent-primary) 25%, transparent), 0 1px 3px rgba(0,0,0,0.12)"
                  : "0 1px 3px rgba(0,0,0,0.12)",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                transition:
                  "transform 180ms cubic-bezier(0.4, 0, 0.2, 1), border-color 180ms, box-shadow 180ms",
              }}
              title={color.label}
            />
          );
        })}
      </div>

      {/* Hex value display */}
      <div
        style={{
          marginTop: 14,
          padding: "9px 14px",
          borderRadius: 8,
          background: "var(--surface-panel)",
          border: "1px solid var(--border-default)",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 13,
          color: "var(--text-primary)",
          letterSpacing: "0.1em",
          textAlign: "center",
        }}
      >
        {hex.toUpperCase()}
      </div>
    </div>
  );
}

export default CustomColorPicker;
