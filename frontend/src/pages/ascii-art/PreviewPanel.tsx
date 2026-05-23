import { useRef, useCallback, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import {
  Flex,
  Box,
  Text,
  Button,
  ActionIcon,
  Tabs,
  Progress,
  Menu,
  useMantineTheme,
} from "@mantine/core";
import {
  Copy,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Image as ImageIcon,
  FileDown,
} from "lucide-react";
import { useAsciiArtStore } from "@/stores/asciiArtStore";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}分${sec}秒`;
}

export function PreviewPanel() {
  const imagePreviewUrl = useAsciiArtStore((s) => s.imagePreviewUrl);
  const output = useAsciiArtStore((s) => s.output);
  const params = useAsciiArtStore((s) => s.params);
  const isConverting = useAsciiArtStore((s) => s.isConverting);
  const errorMessage = useAsciiArtStore((s) => s.errorMessage);
  const progress = useAsciiArtStore((s) => s.progress);
  const estimatedTimeRemaining = useAsciiArtStore((s) => s.estimatedTimeRemaining);
  const copyToClipboard = useAsciiArtStore((s) => s.copyToClipboard);
  const exportOutput = useAsciiArtStore((s) => s.exportOutput);
  const zoom = useAsciiArtStore((s) => s.zoom);
  const setZoom = useAsciiArtStore((s) => s.setZoom);
  const panX = useAsciiArtStore((s) => s.panX);
  const panY = useAsciiArtStore((s) => s.panY);
  const setPan = useAsciiArtStore((s) => s.setPan);
  const resetView = useAsciiArtStore((s) => s.resetView);
  const activeTab = useAsciiArtStore((s) => s.activeTab);
  const setActiveTab = useAsciiArtStore((s) => s.setActiveTab);
  const theme = useMantineTheme();

  const displayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const transformState = useRef({ zoom, panX, panY });
  const rafId = useRef(0);

  useEffect(() => {
    transformState.current = { zoom, panX, panY };
  }, [zoom, panX, panY]);

  const applyTransform = useCallback((z: number, px: number, py: number) => {
    const el = contentRef.current;
    if (!el) return;
    transformState.current = { zoom: z, panX: px, panY: py };
    el.style.transform = `translate(${px}px, ${py}px) scale(${z})`;
  }, []);

  useEffect(() => {
    return () => { cancelAnimationFrame(rafId.current); };
  }, []);

  useEffect(() => {
    if (params.renderMode !== "canvas" || !output || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const charWidth = 8;
    const charHeight = 12;

    if (!output.charColors || output.charColors.length === 0) return;

    const lines = output.plainText.split("\n");
    const gridWidth = lines[0]?.length || 1;
    const gridHeight = lines.length;

    canvas.width = gridWidth * charWidth;
    canvas.height = gridHeight * charHeight;

    ctx.fillStyle = params.background === "white" ? "#ffffff" : params.background === "transparent" ? "transparent" : "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "10px monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const colorGroups = new Map<string, {char: string, x: number, y: number}[]>();
    let idx = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (idx >= output.charColors.length) break;
        const cc = output.charColors[idx];
        const key = `${cc.r},${cc.g},${cc.b}`;
        let group = colorGroups.get(key);
        if (!group) {
          group = [];
          colorGroups.set(key, group);
        }
        group.push({ char: cc.char, x: x * charWidth, y: y * charHeight });
        idx++;
      }
    }

    for (const [color, chars] of colorGroups) {
      ctx.fillStyle = `rgb(${color})`;
      for (const { char, x, y } of chars) {
        ctx.fillText(char, x, y);
      }
    }
  }, [output, params.renderMode, params.background]);

  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = displayRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const { zoom: curZoom, panX: curPanX, panY: curPanY } = transformState.current;

      const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(0.1, Math.min(10, curZoom * delta));

      const scale = newZoom / curZoom;
      const newPanX = mouseX - scale * (mouseX - curPanX);
      const newPanY = mouseY - scale * (mouseY - curPanY);

      applyTransform(newZoom, newPanX, newPanY);

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        const { zoom: z, panX: px, panY: py } = transformState.current;
        setZoom(z);
        setPan(px, py);
      }, 150);
    },
    [applyTransform, setZoom, setPan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        isDragging.current = true;
        const { panX: curPanX, panY: curPanY } = transformState.current;
        dragStart.current = { x: e.clientX, y: e.clientY, panX: curPanX, panY: curPanY };
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const { zoom: curZoom } = transformState.current;
        applyTransform(curZoom, dragStart.current.panX + dx, dragStart.current.panY + dy);
      });
    },
    [applyTransform]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        isDragging.current = false;
        const { zoom: z, panX: px, panY: py } = transformState.current;
        setZoom(z);
        setPan(px, py);
      }
    },
    [setZoom, setPan]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

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
        await invoke("export_ascii_art", { params, imagePath, format: "png", path: filePath });
      } else if (canvasRef.current) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob(resolve, "image/png")
        );
        if (!blob) return;
        const buffer = await blob.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        await invoke("write_binary_file", { path: filePath, contents: bytes });
      }
    } catch (e) {
      useAsciiArtStore.getState().setErrorMessage(`导出PNG失败: ${e}`);
    }
  }, []);

  const renderAsciiContent = () => {
    if (!output) return null;

    const child = (() => {
      switch (params.renderMode) {
        case "svg":
          if (!output.svgData) return null;
          const svgBase64 = btoa(unescape(encodeURIComponent(output.svgData)));
          return (
            <img
              src={`data:image/svg+xml;base64,${svgBase64}`}
              alt="ASCII Art"
              style={{ display: "block" }}
            />
          );

        case "png":
          if (!output.outputPath) return null;
          return (
            <img
              src={convertFileSrc(output.outputPath)}
              alt="ASCII Art"
              style={{ display: "block" }}
            />
          );

        case "canvas":
          return (
            <canvas
              ref={canvasRef}
              style={{ display: "block" }}
            />
          );

        default:
          return null;
      }
    })();

    if (!child) return null;

    return (
      <div
        ref={contentRef}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {child}
      </div>
    );
  };

  return (
    <Flex
      direction="column"
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.dark[4]}`,
      }}
    >
      {/* Toolbar */}
      <Flex
        align="center"
        justify="space-between"
        px="sm"
        py="xs"
        style={{ borderBottom: `1px solid ${theme.colors.gray[3]}` }}
      >
        <Flex align="center" gap="xs">
          <Tabs value={activeTab} onChange={(v) => setActiveTab((v ?? "original") as "original" | "ascii")}>
            <Tabs.List>
              <Tabs.Tab value="original" leftSection={<ImageIcon size={12} />}>
                <Text size="xs">原图</Text>
              </Tabs.Tab>
              <Tabs.Tab value="ascii" disabled={!output}>
                <Text size="xs">字符画</Text>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          <Flex align="center" gap={4} ml="xs">
            <ActionIcon variant="subtle" size="sm" onClick={() => setZoom(zoom * 1.2)}>
              <ZoomIn size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" onClick={() => setZoom(zoom / 1.2)}>
              <ZoomOut size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" onClick={resetView}>
              <RotateCcw size={14} />
            </ActionIcon>
            <Text size="xs" c="dimmed">
              {Math.round(zoom * 100)}%
            </Text>
          </Flex>
        </Flex>

        <Flex align="center" gap="xs">
          {isConverting && (
            <Flex align="center" gap="xs">
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              <Text size="xs" c="dimmed">
                {progress.toFixed(0)}%
                {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                  <span> · 剩余 {formatTime(estimatedTimeRemaining)}</span>
                )}
              </Text>
            </Flex>
          )}
          <Button
            variant="subtle"
            size="compact-xs"
            disabled={!output}
            leftSection={<Copy size={14} />}
            onClick={copyToClipboard}
          >
            复制
          </Button>
          <Menu position="bottom-end">
            <Menu.Target>
              <Button
                variant="subtle"
                size="compact-xs"
                disabled={!output}
                leftSection={<Download size={14} />}
              >
                导出
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<FileDown size={14} />} onClick={handleExportPng}>
                导出为 PNG
              </Menu.Item>
              <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("svg")}>
                导出为 SVG
              </Menu.Item>
              <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("txt")}>
                导出为 TXT
              </Menu.Item>
              <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("html")}>
                导出为 HTML
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Flex>
      </Flex>

      {/* Progress bar */}
      {isConverting && (
        <Progress value={progress} size="xs" radius={0} />
      )}

      {/* Display area */}
      <Box
        ref={displayRef}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          background: params.background === "white"
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
              <Flex direction="column" align="center" gap="xs" c="dimmed">
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
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
                <Text size="sm">正在转换...</Text>
              </Flex>
            ) : output ? (
              renderAsciiContent()
            ) : (
              <Flex h="100%" align="center" justify="center" c="dimmed">
                <Text size="sm">请先加载图片</Text>
              </Flex>
            )}
          </Box>
        )}
      </Box>
    </Flex>
  );
}
