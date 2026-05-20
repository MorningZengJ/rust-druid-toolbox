# 直播录制功能实现计划

## Context

用户需要在 Toolbox 中添加直播源录制功能：给定一个 URL（HLS/RTMP/RTSP/HTTP），将视频流录制保存到本地。支持多个录制任务同时运行，左侧面板切换任务，右侧实时预览画面。已有 `video-frame` 功能使用 `ffmpeg-next` 的模式可复用。

## 功能需求

1. **实时预览**：录制时右侧显示实时画面（独立解码连接）
2. **多任务并发**：同时录制多个直播源
3. **任务切换**：左侧任务列表，点击切换右侧预览
4. **流复制模式**：默认 `-c copy`，不重新编码，低 CPU
5. **分段录制**：按设定时长自动切分文件（如每 5 分钟一个文件）
6. **手动停止**：用户控制开始/停止
7. **输出格式**：支持 MP4/MKV/FLV/TS

## 实现方案

### Phase 1: 后端模型层

**新建** `src-tauri/src/model/live_record_state.rs`

数据结构（均 derive Serialize + Deserialize + `#[serde(rename_all = "camelCase")]`）：

- `RecordingStatus` 枚举：`Connecting | Recording | Stopping | Stopped | Error`
- `ContainerFormat` 枚举：`Mp4 | Mkv | Flv | Ts`，含 `extension()` 和 `ffmpeg_format()` 方法
- `RecordParams` 结构体：`url, output_dir, filename_prefix, container_format, stream_copy, segment_duration_secs, preview_enabled, preview_interval_ms`
- `RecordProgressInfo`：`task_id, status, duration_secs, file_size_bytes, bitrate_kbps, current_segment, output_path`
- `PreviewFrame`：`task_id, jpeg_data(Vec<u8>), width, height, timestamp`
- `LiveRecordLogEntry`：`task_id, level, message, timestamp`
- `RecordingTaskInfo`：`task_id, url, status, params, duration_secs, file_size_bytes, output_path, current_segment, start_time_ms`

**修改** `src-tauri/src/model/mod.rs` — 添加 `#[cfg(feature = "live-record")] pub mod live_record_state;`

### Phase 2: 后端引擎层

**新建** `src-tauri/src/utils/live_record_engine.rs`

`LiveRecordEngine` 单元结构体，静态方法，复用 `VideoFrameEngine` 模式：

```
start_recording(params, task_id, stop_flag: Arc<AtomicBool>, progress_cb, log_cb, preview_cb) -> Result<()>
```

核心逻辑：
1. `ffmpeg_next::format::input(&url)` 打开流
2. 找到最佳视频/音频流，创建输出 muxer
3. 流复制循环：读 packet → 重映射流索引 → rescale PTS/DTS → 写 packet
4. 每秒调用 `progress_cb` 报告时长/大小/码率
5. `stop_flag` 检测：循环内检查，break 后写 trailer 关闭文件
6. 分段逻辑：当前段时长超过阈值时，写 trailer → 递增段号 → 开新文件 → 写 header
7. 预览：单独 `spawn_blocking` 线程，二次连接同一 URL，解码视频帧 → 缩放到 480x270 → JPEG 编码 → `preview_cb`

**修改** `src-tauri/src/utils/mod.rs` — 添加 `#[cfg(feature = "live-record")] pub mod live_record_engine;`

### Phase 3: 后端命令层

**新建** `src-tauri/src/commands/live_record.rs`

管理状态：
```rust
pub struct LiveRecordManager {
    tasks: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}
```

命令（3 个）：
- `start_recording(params, app_handle, state) -> Result<RecordingTaskInfo, String>` — 生成 task_id，创建 stop_flag 存入 manager，spawn_blocking 启动录制，通过事件回调转发 progress/preview/log/status，立即返回 RecordingTaskInfo
- `stop_recording(task_id, state) -> Result<(), String>` — 查找 stop_flag 设为 true
- `list_recordings(state) -> Result<Vec<String>, String>` — 返回活跃 task_id 列表

事件命名：`live-record://progress`、`live-record://preview`、`live-record://log`、`live-record://status`

**修改** `src-tauri/src/commands/mod.rs` — 添加 `#[cfg(feature = "live-record")] pub mod live_record;`

### Phase 4: 后端注册

**修改** `src-tauri/src/lib.rs`：
- `.manage(commands::live_record::LiveRecordManager::new())`
- `generate_handler!` 中添加 3 个命令

**修改** `src-tauri/Cargo.toml`：
```toml
[features]
default = ["video-frame", "live-record"]
video-frame = ["dep:ffmpeg-next"]
live-record = ["dep:ffmpeg-next"]
```

### Phase 5: 前端类型

**修改** `frontend/src/types/index.ts` — 添加：

```typescript
export type RecordingStatus = "connecting" | "recording" | "stopping" | "stopped" | "error";
export type ContainerFormat = "mp4" | "mkv" | "flv" | "ts";
export interface RecordParams { url, outputDir, filenamePrefix, containerFormat, streamCopy, segmentDurationSecs, previewEnabled, previewIntervalMs }
export interface RecordProgressInfo { taskId, status, durationSecs, fileSizeBytes, bitrateKbps, currentSegment, outputPath }
export interface PreviewFrame { taskId, jpegData: number[], width, height, timestamp }
export interface LiveRecordLogEntry { taskId, level, message, timestamp }
export interface RecordingTaskInfo { taskId, url, status, params, durationSecs, fileSizeBytes, outputPath, currentSegment, startTimeMs }
```

### Phase 6: 前端 Store

**新建** `frontend/src/stores/liveRecordStore.ts`

状态：
- `tasks: Record<string, RecordingTask>` — task_id 到任务的映射
- `selectedTaskId: string | null` — 当前预览的任务
- `newRecordParams: RecordParams` — 新建录制的表单状态
- `_unlisteners: (() => void)[]` — 事件清理函数

关键 actions：
- `registerEventListeners()` — 挂载时注册 4 个事件监听，preview 事件中将 jpegData 转为 ObjectURL，清理旧 URL 防内存泄漏
- `startRecording()` — invoke 命令，将返回的 task 加入 tasks map，自动选中
- `stopRecording(taskId)` — invoke 停止命令，乐观更新状态为 stopping
- `selectTask(taskId)` — 切换预览选中
- `removeTask(taskId)` — 从列表移除已停止的任务
- `unregisterEventListeners()` — 卸载时清理所有监听和 ObjectURL

### Phase 7: 前端 UI

**新建** `frontend/src/pages/live-record/LiveRecordPage.tsx`

布局（左侧 320px + 右侧 flex-1）：

左侧面板：
- 新建录制表单：URL 输入、输出目录（dialog 选择）、文件名前缀、容器格式 Select、流复制开关 Checkbox、分段时长 Input、预览开关 Checkbox、开始录制 Button
- 任务列表 ScrollArea：每个任务卡片显示 URL（截断）、状态 Badge、时长/大小、停止按钮，选中高亮
- 日志面板（底部 140px，同 VideoFramePage 模式）

右侧面板：
- 预览区：`<img src={previewObjectUrl}>` 显示最新 JPEG 帧
- 信息叠加层：时长、文件大小、码率、当前分段
- 空状态：无任务时显示提示文字

图标：`Radio`（录制中）、`StopCircle`（停止）、`Plus`（开始）、`Trash2`（移除）

**修改** `frontend/src/App.tsx`：
- Page 类型添加 `"live-record"`
- navItems 添加 `{ id: "live-record", label: "录制", icon: Radio }`
- 导入并注册 LiveRecordPage 组件

## 需要创建的文件（4 个）

1. `src-tauri/src/model/live_record_state.rs`
2. `src-tauri/src/utils/live_record_engine.rs`
3. `src-tauri/src/commands/live_record.rs`
4. `frontend/src/pages/live-record/LiveRecordPage.tsx`

## 需要修改的文件（8 个）

1. `src-tauri/Cargo.toml` — 添加 live-record feature
2. `src-tauri/src/model/mod.rs` — 添加模块声明
3. `src-tauri/src/utils/mod.rs` — 添加模块声明
4. `src-tauri/src/commands/mod.rs` — 添加模块声明
5. `src-tauri/src/lib.rs` — 注册管理状态和命令
6. `frontend/src/types/index.ts` — 添加 TypeScript 类型
7. `frontend/src/stores/liveRecordStore.ts` — 新建 store（此文件为新建，归入 Phase 6）
8. `frontend/src/App.tsx` — 注册页面和导航

## 复用的参考文件

- `src-tauri/src/utils/video_frame_engine.rs` — 引擎模式、FFmpeg API、JPEG 编码
- `src-tauri/src/commands/video_frame.rs` — 命令模式、spawn_blocking + 回调、managed state
- `frontend/src/stores/videoFrameStore.ts` — Zustand store 模式、事件监听生命周期
- `frontend/src/pages/video-frame/VideoFramePage.tsx` — UI 布局模式、左右分面板

## 验证方式

1. `cargo check --manifest-path src-tauri/Cargo.toml --features live-record` — Rust 编译通过
2. `cargo test --manifest-path src-tauri/Cargo.toml` — 现有测试不破坏
3. `cd frontend && npm run build` — 前端编译通过
4. `npm run tauri dev` — 手动测试：输入 HLS 直播 URL，开始录制，验证预览画面、停止录制、分段文件生成

## 已知风险

- **MP4 容器**：流复制时 MP4 需要写 moov atom，可能在 trailer 写入前不可读。默认建议 TS/MKV 格式
- **双连接预览**：预览需要二次连接流源，RTSP 源可能限制连接数。预览可通过开关关闭
- **静态链接 FFmpeg**：`ffmpeg-next` 的 `static` feature 可能不包含所有协议处理器，需测试常用流类型
- **re-encoding 暂不实现**：初版仅支持流复制，重编码留后续版本
