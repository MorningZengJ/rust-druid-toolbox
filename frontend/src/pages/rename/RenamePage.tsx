import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import Toolbar from "./Toolbar";
import FilterSection from "./FilterSection";
import RuleList from "./RuleList";
import FilePreview from "./FilePreview";
import StatusBar from "./StatusBar";
import ConfirmDialog from "./ConfirmDialog";

export default function RenamePage() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-panel">
      {/* Top toolbar */}
      <Toolbar />

      {/* Main content: left rules + right preview */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Left panel: filters + rules */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <div className="flex h-full flex-col overflow-hidden">
            <FilterSection />
            <RuleList />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: file preview */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <FilePreview />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Bottom status bar */}
      <StatusBar />

      {/* Confirmation dialog */}
      <ConfirmDialog />
    </div>
  );
}
