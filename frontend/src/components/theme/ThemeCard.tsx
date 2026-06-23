import { Box, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface ThemeCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

export default function ThemeCard({ icon, title, children }: ThemeCardProps) {
  return (
    <Box
      style={{
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--surface-overlay)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 顶部高光线 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          backgroundColor: "var(--surface-panel)",
        }}
      >
        {icon}
        <Text size="sm" fw={600} style={{ fontFamily: "var(--font-body)" }}>
          {title}
        </Text>
      </div>
      <div style={{ padding: "14px" }}>
        {children}
      </div>
    </Box>
  );
}
