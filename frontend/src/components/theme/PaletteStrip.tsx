import { Box, Text, Tooltip } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

interface PaletteStripProps {
  shades: MantineColorsTuple;
  anchorIndex: number;
}

const BAR_WIDTH = 24;
const BAR_HEIGHT = 8;
const GAP = 2;

export default function PaletteStrip({ shades, anchorIndex }: PaletteStripProps) {
  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* 色阶条 */}
      <Box style={{ display: "flex", gap: GAP }}>
        {shades.map((hex, i) => {
          const isAnchor = i === anchorIndex;
          return (
            <Tooltip key={i} label={hex.toUpperCase()} withArrow openDelay={300}>
              <Box
                style={{
                  width: BAR_WIDTH,
                  height: isAnchor ? BAR_HEIGHT + 2 : BAR_HEIGHT,
                  borderRadius: 4,
                  backgroundColor: hex,
                  border: isAnchor
                    ? "1px solid rgba(255,255,255,0.9)"
                    : "1px solid transparent",
                  boxShadow: isAnchor
                    ? "0 1px 3px rgba(0,0,0,0.15)"
                    : "none",
                  cursor: "pointer",
                  transition: "transform 120ms ease, filter 120ms ease",
                  alignSelf: "center",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.filter = "brightness(1.15)";
                  (e.currentTarget as HTMLElement).style.transform = "scaleY(1.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.filter = "brightness(1)";
                  (e.currentTarget as HTMLElement).style.transform = "scaleY(1)";
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {/* 索引数字 */}
      <Box style={{ display: "flex", gap: GAP }}>
        {shades.map((_, i) => (
          <Text
            key={i}
            size="xs"
            style={{
              width: BAR_WIDTH,
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: i === anchorIndex ? "var(--accent-primary)" : "var(--text-muted)",
              fontWeight: i === anchorIndex ? 600 : 400,
            }}
          >
            {i}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
