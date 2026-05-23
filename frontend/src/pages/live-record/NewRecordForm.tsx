import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useLiveRecordStore } from "@/stores/liveRecordStore";
import { DirectoryPicker } from "@/components/common/DirectoryPicker";
import type { ContainerFormat } from "@/types";

export function NewRecordForm() {
  const newRecordParams = useLiveRecordStore((s) => s.newRecordParams);
  const errorMessage = useLiveRecordStore((s) => s.errorMessage);
  const setNewRecordParams = useLiveRecordStore((s) => s.setNewRecordParams);
  const startRecording = useLiveRecordStore((s) => s.startRecording);
  const clearError = useLiveRecordStore((s) => s.clearError);

  return (
    <div className="border-b border-border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        新建录制
      </span>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 p-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              直播源 URL
            </label>
            <Input
              className="h-8 text-sm"
              placeholder="https://... / rtmp://... / rtsp://..."
              value={newRecordParams.url}
              onChange={(e) => {
                clearError();
                setNewRecordParams({ url: e.target.value });
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              输出目录
            </label>
            <DirectoryPicker
              value={newRecordParams.outputDir}
              onChange={(dir) => setNewRecordParams({ outputDir: dir })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              文件名前缀
            </label>
            <Input
              className="h-8 text-sm"
              value={newRecordParams.filenamePrefix}
              onChange={(e) =>
                setNewRecordParams({ filenamePrefix: e.target.value })
              }
              placeholder="recording"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              容器格式
            </label>
            <Select
              value={newRecordParams.containerFormat}
              onValueChange={(v) =>
                setNewRecordParams({ containerFormat: v as ContainerFormat })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ts">TS（推荐）</SelectItem>
                <SelectItem value="mkv">MKV</SelectItem>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="flv">FLV</SelectItem>
              </SelectContent>
            </Select>
            {newRecordParams.containerFormat === "mp4" && (
              <p className="text-[10px] text-amber-500">
                MP4 格式在异常中断时文件可能不可用，推荐 TS 或 MKV
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="stream-copy"
              checked={newRecordParams.streamCopy}
              onCheckedChange={(checked) =>
                setNewRecordParams({ streamCopy: !!checked })
              }
            />
            <label
              htmlFor="stream-copy"
              className="text-xs font-medium text-muted-foreground cursor-pointer"
            >
              流复制（不重新编码）
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              分段时长（秒，留空不分段）
            </label>
            <Input
              type="number"
              className="h-8 text-sm"
              placeholder="300 = 5分钟"
              value={newRecordParams.segmentDurationSecs ?? ""}
              onChange={(e) => {
                const val = e.target.value
                  ? parseInt(e.target.value)
                  : null;
                setNewRecordParams({
                  segmentDurationSecs: val && val > 0 ? val : null,
                });
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="preview-enabled"
              checked={newRecordParams.previewEnabled}
              onCheckedChange={(checked) =>
                setNewRecordParams({ previewEnabled: !!checked })
              }
            />
            <label
              htmlFor="preview-enabled"
              className="text-xs font-medium text-muted-foreground cursor-pointer"
            >
              实时预览
            </label>
          </div>

          {errorMessage && (
            <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          <Button
            className="w-full"
            onClick={startRecording}
            disabled={!newRecordParams.url || !newRecordParams.outputDir}
          >
            <Plus size={14} className="mr-1" />
            开始录制
          </Button>
        </div>
      </div>
    </div>
  );
}
