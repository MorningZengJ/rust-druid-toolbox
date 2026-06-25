import { type ReactNode } from "react";
import { Box } from "@mantine/core";
import RenamePage from "@/pages/rename/RenamePage";
import AsciiArtPage from "@/pages/ascii-art/AsciiArtPage";
import VideoToolPage from "@/pages/video-tool/VideoToolPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import type { SidebarPage } from "./Sidebar";

interface PageContainerProps {
  activePage: SidebarPage;
  /** 过渡动画可见标志，false 时触发 fade-out */
  visible: boolean;
  children?: ReactNode;
}

/**
 * 页面容器 —— 只挂载当前激活页。
 * 解决旧方案中四个页面常驻 display:none 导致的 drag/drop/listener 副作用。
 * 页面数据通过 Zustand store 持久化，切换时组件 local state 会丢失（这是预期的）。
 */
function PageContent({ page }: { page: SidebarPage }) {
  switch (page) {
    case "rename":
      return <RenamePage />;
    case "ascii-art":
      return <AsciiArtPage />;
    case "video-tool":
      return <VideoToolPage />;
    case "settings":
      return <SettingsPage />;
  }
}

export default function PageContainer({ activePage, visible }: PageContainerProps) {
  return (
    <Box
      style={{
        flex: 1,
        overflow: "hidden",
        padding: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 150ms ease, transform 150ms ease",
      }}
    >
      <Box h="100%">
        <PageContent page={activePage} />
      </Box>
    </Box>
  );
}
