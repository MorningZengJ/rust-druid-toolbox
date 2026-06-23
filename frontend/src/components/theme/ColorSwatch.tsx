import { Box, Text } from "@mantine/core";
import { Check } from "lucide-react";

interface ColorSwatchProps {
  hex: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SWATCH_SIZE = 44;

export default function ColorSwatch({ hex, label, isActive, onClick }: ColorSwatchProps) {
  return (
    <Box
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
    >
      <Box
        onClick={onClick}
        className="theme-swatch"
        style={{
          width: SWATCH_SIZE,
          height: SWATCH_SIZE,
          borderRadius: 10,
          backgroundColor: hex,
          border: isActive
            ? "2px solid var(--accent-primary)"
            : "1.5px solid var(--border-strong)",
          boxShadow: isActive
            ? "0 0 0 3px var(--accent-glow), var(--shadow-sm)"
            : "var(--shadow-sm)",
          transform: isActive ? "scale(1.05)" : "scale(1)",
          cursor: "pointer",
          position: "relative",
          transition:
            "transform 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms ease",
        }}
      >
        {/* 激活标记：右下角小 pill */}
        {isActive && (
          <Box
            style={{
              position: "absolute",
              bottom: -5,
              right: -5,
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          >
            <Check size={10} color="white" strokeWidth={3} />
          </Box>
        )}
      </Box>

      {/* 标签 */}
      <Text
        size="xs"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: isActive ? "var(--text-primary)" : "var(--text-muted)",
          fontWeight: isActive ? 600 : 400,
          textTransform: "lowercase",
          letterSpacing: "0.05em",
          transition: "color 200ms ease",
          textAlign: "center",
          maxWidth: SWATCH_SIZE + 8,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Text>
    </Box>
  );
}
