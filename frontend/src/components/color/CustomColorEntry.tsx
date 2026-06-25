import { useState, useEffect, useRef } from "react";
import { Box, Popover, Text } from "@mantine/core";
import { Check, Plus } from "lucide-react";
import CustomColorPicker, { type PresetColor } from "./CustomColorPicker";
import { DEFAULT_HEX } from "./CustomColorPicker";

const CHECKERBOARD: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, #d0d0d0 25%, transparent 25%),
    linear-gradient(-45deg, #d0d0d0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d0d0d0 75%),
    linear-gradient(-45deg, transparent 75%, #d0d0d0 75%)
  `,
  backgroundSize: "10px 10px",
  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0",
};

interface CustomColorEntryProps {
  customPrimary: string | undefined;
  onSelect: (color: string | undefined) => void;
  customLabel: string;
  presets?: PresetColor[];
}

const ENTRY_SIZE = 44;

function CustomColorEntry({
  customPrimary,
  onSelect,
  customLabel,
  presets,
}: CustomColorEntryProps) {
  const [opened, setOpened] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const prevCustomRef = useRef(customPrimary);
  useEffect(() => {
    if (prevCustomRef.current && !customPrimary && opened) {
      setOpened(false);
    }
    prevCustomRef.current = customPrimary;
  }, [customPrimary, opened]);

  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const handler = (e: MouseEvent) => {
      e.stopPropagation();
    };
    btn.addEventListener("mousedown", handler);
    return () => btn.removeEventListener("mousedown", handler);
  }, []);

  const isCustomActive = !!customPrimary;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={328}
      position="bottom"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <Box
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          <Box
            ref={buttonRef}
            component="button"
            onClick={() => setOpened((o) => !o)}
            className="theme-swatch"
            style={{
              width: ENTRY_SIZE,
              height: ENTRY_SIZE,
              borderRadius: 10,
              borderStyle: isCustomActive ? "solid" : "dashed",
              borderWidth: isCustomActive ? 2 : 1.5,
              borderColor: isCustomActive
                ? customPrimary
                : "var(--border-strong)",
              backgroundColor: "transparent",
              ...(isCustomActive ? CHECKERBOARD : {}),
              transform: isCustomActive ? "scale(1.05)" : "scale(1)",
              boxShadow: isCustomActive ? "var(--shadow-sm)" : "none",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              padding: 0,
              transition:
                "transform 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms ease",
            }}
          >
            {/* 颜色层：放在 checkerboard 上面 */}
            {isCustomActive && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 10,
                  backgroundColor: customPrimary,
                }}
              />
            )}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: isCustomActive
                  ? "drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
                  : "none",
              }}
            >
              {isCustomActive ? (
                <Check size={14} color="white" />
              ) : (
                <Plus size={16} color="var(--text-secondary)" />
              )}
            </span>
          </Box>

          {/* 标签 */}
          <Text
            size="xs"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: isCustomActive ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: isCustomActive ? 600 : 400,
              textTransform: "lowercase",
              letterSpacing: "0.05em",
              transition: "color 200ms ease",
            }}
          >
            {customLabel}
          </Text>
        </Box>
      </Popover.Target>
      <Popover.Dropdown
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: "var(--surface-overlay)",
        }}
      >
        <CustomColorPicker
          value={customPrimary || DEFAULT_HEX}
          onChange={(val) => {
            onSelect(val);
          }}
          presets={presets}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

export default CustomColorEntry;
