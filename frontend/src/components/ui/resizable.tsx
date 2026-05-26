import { useState, useCallback } from "react"
import { Box, useMantineTheme, useComputedColorScheme } from "@mantine/core"
import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

const { useDefaultLayout } = ResizablePrimitive

function ResizablePanelGroup({
  className,
  style,
  ...props
}: ResizablePrimitive.GroupProps & { className?: string; style?: React.CSSProperties }) {
  return (
    <ResizablePrimitive.Group
      className={className}
      style={{ display: "flex", width: "100%", height: "100%", ...style }}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  style,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const theme = useMantineTheme()
  const colorScheme = useComputedColorScheme()
  const isDark = colorScheme === "dark"
  const [hovered, setHovered] = useState(false)
  const onMouseEnter = useCallback(() => setHovered(true), [])
  const onMouseLeave = useCallback(() => setHovered(false), [])

  return (
    <ResizablePrimitive.Separator
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 8,
        flexShrink: 0,
        cursor: "col-resize",
        ...style,
      }}
      {...props}
    >
      <Box
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          width: hovered ? 2 : 1,
          backgroundColor: hovered
            ? theme.colors[theme.primaryColor][isDark ? 5 : 4]
            : isDark
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.08)",
          transition: "width 150ms ease, background-color 150ms ease",
          transform: "translateX(-50%)",
          borderRadius: 1,
        }}
      />
      {withHandle && (
        <Box
          style={{
            zIndex: 10,
            display: "flex",
            height: 28,
            width: 14,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            border: hovered
              ? `1px solid ${theme.colors[theme.primaryColor][isDark ? 5 : 4]}40`
              : `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
            backgroundColor: hovered
              ? isDark
                ? "rgba(255, 255, 255, 0.06)"
                : "rgba(0, 0, 0, 0.04)"
              : "transparent",
            opacity: hovered ? 1 : 0.4,
            transition: "opacity 150ms ease, background-color 150ms ease, border-color 150ms ease",
          }}
        >
          <GripVerticalIcon
            size={10}
            style={{
              opacity: hovered ? 0.8 : 0.4,
              color: isDark ? theme.colors.dark[2] : theme.colors.gray[5],
              transition: "opacity 150ms ease",
            }}
          />
        </Box>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup, useDefaultLayout }
