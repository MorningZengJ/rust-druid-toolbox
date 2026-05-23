import { Box, useMantineTheme } from "@mantine/core"
import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

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

  return (
    <ResizablePrimitive.Separator
      className={className}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 1,
        backgroundColor: theme.colors.gray[3],
        ...style,
      }}
      {...props}
    >
      {withHandle && (
        <Box
          style={{
            zIndex: 10,
            display: "flex",
            height: 16,
            width: 12,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            border: `1px solid ${theme.colors.gray[4]}`,
            backgroundColor: theme.colors.gray[2],
          }}
        >
          <GripVerticalIcon size={10} />
        </Box>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
