import { useState, useCallback } from "react"
import { Box, useMantineTheme } from "@mantine/core"
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
          width: hovered ? 1 : 0,
          backgroundColor: hovered ? theme.colors.gray[4] : "transparent",
          transition: "width 0.15s ease, background-color 0.15s ease",
          transform: "translateX(-50%)",
        }}
      />
      {withHandle && (
        <Box
          style={{
            zIndex: 10,
            display: "flex",
            height: 24,
            width: 12,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
            border: hovered ? `1px solid ${theme.colors.gray[4]}` : "1px solid transparent",
            backgroundColor: hovered ? theme.colors.gray[2] : "transparent",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
          }}
        >
          <GripVerticalIcon size={10} style={{ opacity: hovered ? 0.6 : 0 }} />
        </Box>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup, useDefaultLayout }
