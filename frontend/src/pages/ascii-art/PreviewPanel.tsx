import { useCallback } from "react";
import { Flex, Box, Text, Progress, useMantineTheme } from "@mantine/core";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import { exportAsciiArtPng, writeCanvasToPng } from "@/lib/asciiArtApi";
import { usePanZoom } from "./hooks/usePanZoom";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { PreviewToolbar } from "./components/PreviewToolbar";
import { AsciiContent } from "./components/AsciiContent";

export function PreviewPanel() {
  const imagePreviewUrl = useAsciiArtStore((s) => s.imagePreviewUrl);
  const output = useAsciiArtStore((s) => s.output);
  const params = useAsciiArtStore((s) => s.params);
  const isConverting = useAsciiArtStore((s) => s.isConverting);
  const errorMessage = useAsciiArtStore((s) => s.errorMessage);
  const progress = useAsciiArtStore((s) => s.progress);
  const estimatedTimeRemaining = useAsciiArtStore(
    (s) => s.estimatedTimeRemaining,
  );
  const copyToClipboard = useAsciiArtStore((s) => s.copyToClipboard);
  const exportOutput = useAsciiArtStore((s) => s.exportOutput);
  const activeTab = useAsciiArtStore((s) => s.activeTab);
  const setActiveTab = useAsciiArtStore((s) => s.setActiveTab);
  const loadImageFromFile = useAsciiArtStore((s) => s.loadImageFromFile);
  const theme = useMantineTheme();

  const {
    displayRef,
    contentRef,
    zoom,
    panX,
    panY,
    setZoom,
    resetView,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
  } = usePanZoom();

  const { canvasRef } = useCanvasRenderer();

  const handleExportPng = useCallback(async () => {
    const { output, params, imagePath } = useAsciiArtStore.getState();
    if (!output || !imagePath) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const filePath = await save({
        filters: [{ name: "图片", extensions: ["png"] }],
        defaultPath: "ascii_art.png",
      });
      if (!filePath) return;

      if (params.renderMode === "png") {
        await exportAsciiArtPng(params, imagePath, filePath);
      } else if (canvasRef.current) {
        await writeCanvasToPng(canvasRef.current, filePath);
      }
    } catch (e) {
      useAsciiArtStore.getState().setErrorMessage(`导出PNG失败: ${e}`);
    }
  }, [canvasRef]);

  return (
    <Flex
      direction="column"
      h="100%"
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.dark[4]}`,
      }}
    >
      <PreviewToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasOutput={!!output}
        zoom={zoom}
        setZoom={setZoom}
        resetView={resetView}
        isConverting={isConverting}
        progress={progress}
        estimatedTimeRemaining={estimatedTimeRemaining}
        copyToClipboard={copyToClipboard}
        exportOutput={exportOutput}
        onExportPng={handleExportPng}
      />

      {isConverting && <Progress value={progress} size="xs" radius={0} />}

      <Box
        ref={displayRef}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          background:
            params.background === "white"
              ? "#fff"
              : params.background === "transparent"
                ? "repeating-conic-gradient(#808080 0% 25%, #000 0% 50%) 50% / 20px 20px"
                : "#000",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        {errorMessage && (
          <Box
            p="xs"
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              right: 8,
              border: `1px solid ${theme.colors.red[5]}`,
              borderRadius: theme.radius.sm,
              backgroundColor: `${theme.colors.red[0]}`,
              color: theme.colors.red[7],
              zIndex: 10,
            }}
          >
            <Text size="sm">{errorMessage}</Text>
          </Box>
        )}

        {activeTab === "original" ? (
          <Flex h="100%" align="center" justify="center">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="原始图片"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <Flex
                direction="column"
                align="center"
                gap="xs"
                c="dimmed"
                style={{ cursor: "pointer" }}
                onDoubleClick={loadImageFromFile}
              >
                <ImageIcon size={48} />
                <Text size="sm">双击选择图片</Text>
                <Text size="xs">支持拖拽或 Ctrl+V 粘贴</Text>
              </Flex>
            )}
          </Flex>
        ) : (
          <Box h="100%" style={{ overflow: "hidden" }} p="md">
            {isConverting ? (
              <Flex h="100%" align="center" justify="center" c="dimmed">
                <Loader2
                  size={24}
                  style={{
                    animation: "spin 1s linear infinite",
                    marginRight: 8,
                  }}
                />
                <Text size="sm">正在转换...</Text>
              </Flex>
            ) : output ? (
              <AsciiContent
                output={output}
                renderMode={params.renderMode}
                panX={panX}
                panY={panY}
                zoom={zoom}
                contentRef={contentRef}
                canvasRef={canvasRef}
              />
            ) : (
              <Flex
                h="100%"
                align="center"
                justify="center"
                c="dimmed"
                style={{ cursor: "pointer" }}
                onDoubleClick={loadImageFromFile}
              >
                <Text size="sm">双击选择图片</Text>
              </Flex>
            )}
          </Box>
        )}
      </Box>
    </Flex>
  );
}
