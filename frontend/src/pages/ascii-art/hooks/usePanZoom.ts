import { useRef, useCallback, useEffect } from "react";
import { useAsciiArtStore } from "@/stores/asciiArtStore";

export function usePanZoom() {
  const displayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const rafId = useRef(0);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoom = useAsciiArtStore((s) => s.zoom);
  const panX = useAsciiArtStore((s) => s.panX);
  const panY = useAsciiArtStore((s) => s.panY);
  const setZoom = useAsciiArtStore((s) => s.setZoom);
  const setPan = useAsciiArtStore((s) => s.setPan);
  const resetView = useAsciiArtStore((s) => s.resetView);

  const transformState = useRef({ zoom, panX, panY });

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

  return {
    displayRef,
    contentRef,
    zoom,
    panX,
    panY,
    setZoom,
    resetView,
    applyTransform,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
  };
}
