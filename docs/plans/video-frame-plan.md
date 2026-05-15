# 视频抽帧功能实现计划

## 概述

新增"视频抽帧"页面，支持用户选择视频文件、配置抽帧参数、预览并导出帧图片。特别支持"全部帧"模式，逐帧抽取完整帧序列，可通过帧序列还原视频。作为工具箱的第三个功能模块，与批量重命名、字符画并列。

## 技术选型

### 视频解码方案：ffmpeg-next (crate)

| 方案 | 优点 | 缺点 |
|------|------|------|
| **ffmpeg-next** | API 成熟、社区活跃、功能完整 | 需要系统安装 FFmpeg |
| opencv | 功能强大 | 依赖过重，纯抽帧场景不必要 |
| 纯 Rust | 无外部依赖 | 无成熟视频解码库 |

**选择 `ffmpeg-next`**，原因：抽帧是标准 FFmpeg 场景，API 简洁，依赖轻量。

### 环境要求

- 用户系统需安装 FFmpeg 并加入 PATH
- 页面加载时检测 FFmpeg 可用性，不可用时显示引导提示

## 功能范围

### P0（本次实现）

1. **选择视频文件**：支持常见格式（mp4/avi/mkv/mov/webm/flv）
2. **抽帧模式**：
   - **全部帧**：逐帧解码视频的每一帧，输出可用于还原视频的完整帧序列
   - **按间隔**：每隔 N 秒 抽取一帧
   - **按数量**：均匀抽取 N 帧
   - **按时间点**：指定时间点列表抽取
3. **输出配置**：
   - 输出目录选择（默认视频同目录下 `video_frames/` 子目录）
   - 输出格式：PNG / JPEG（JPEG 可调质量）
   - 可选缩放分辨率
4. **输出文件命名**：
   - 全部帧模式：`frame_%06d.{ext}`（如 `frame_000001.png`），连续编号保证可还原性
   - 其他模式：`frame_%06d_{timestamp_ms}ms.{ext}`，附带时间戳信息
   - 输出目录自动生成 `meta.json`，记录源视频路径、fps、分辨率、抽取模式、帧数等元信息，便于后续还原
5. **进度反馈**：全部帧模式下显示抽取进度条（已完成帧数 / 总帧数）
6. **预览**：抽帧完成后展示缩略图网格，支持点击放大查看
7. **导出**：一键保存所有帧到输出目录

### P1（后续迭代）

- 批量视频处理
- 帧拼接（横向/纵向拼成长图）
- 从帧序列还原视频（读取 meta.json + 帧文件，调用 FFmpeg 编码）

## 模块设计

### 1. 数据模型 — `src/model/video_frame_state.rs`

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum ExtractMode {
    AllFrames,    // 全部帧（可还原视频）
    ByInterval,   // 按时间间隔
    ByCount,      // 按数量
    ByTimePoints, // 按时间点
}

#[derive(Debug, Clone, PartialEq)]
pub enum OutputFormat {
    Png,
    Jpeg, // 含 quality 字段
}

#[derive(Debug, Clone)]
pub struct ExtractedFrame {
    pub index: usize,
    pub timestamp: f64,       // 秒
    pub image_data: Vec<u8>,  // 编码后的图片 bytes（用于预览）
    pub filename: String,     // 输出文件名
}

#[derive(Debug, Clone)]
pub struct VideoFrameState {
    // 输入
    pub video_path: Option<PathBuf>,
    pub video_duration: f64,      // 秒
    pub video_width: u32,
    pub video_height: u32,
    pub video_fps: f64,
    pub total_frame_count: u64,   // 视频总帧数（用于全部帧模式预估）

    // 参数
    pub extract_mode: ExtractMode,
    pub interval_secs: f64,       // ByInterval 模式：间隔秒数
    pub frame_count: u32,         // ByCount 模式：抽取数量
    pub time_points: String,      // ByTimePoints 模式：逗号分隔的时间点（秒）
    pub output_format: OutputFormat,
    pub jpeg_quality: u8,         // 1-100
    pub output_dir: Option<PathBuf>,
    pub resize_width: Option<u32>, // 可选缩放

    // 结果
    pub frames: Vec<ExtractedFrame>,
    pub selected_frame: Option<usize>,

    // 状态
    pub is_extracting: bool,
    pub extract_progress: f32,    // 0.0 ~ 1.0
    pub error_message: Option<String>,
    pub ffmpeg_available: bool,
}
```

### 2. 抽帧引擎 — `src/utils/video_frame_engine.rs`

```rust
pub struct VideoFrameEngine;

impl VideoFrameEngine {
    /// 检测 FFmpeg 是否可用
    pub fn check_ffmpeg() -> bool;

    /// 获取视频元信息（时长、分辨率、帧率）
    pub fn probe_video(path: &Path) -> Result<VideoInfo>;

    /// 执行抽帧，返回帧数据列表
    pub fn extract_frames(params: &ExtractParams) -> Result<Vec<ExtractedFrame>>;
}
```

底层通过 `ffmpeg-next` crate 的 `format::input()`、`decoder`、`scaler` 实现：
1. 打开视频 → 获取流信息 → 创建解码器
2. 根据模式计算目标帧时间戳列表（AllFrames 模式则逐帧遍历）
3. seek 到目标位置 → 解码 → 缩放 → 编码为 PNG/JPEG
4. 返回帧数据，同时通过回调报告进度（AllFrames 模式需要）
5. AllFrames 模式额外输出 `meta.json`（含 fps、分辨率、总帧数、源文件路径）

### 3. 页面 UI — `src/ui/video_frame/mod.rs`

**布局**（参照 AsciiArt 页面模式）：

```
┌─────────────────────────────────────────────────┐
│ 工具栏：[选择视频] [选择输出目录] [开始抽帧]     │
├─────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌───────────────────────────────┐│
│ │ 参数面板     │ │ 帧预览网格                     ││
│ │             │ │ ┌─────┐ ┌─────┐ ┌─────┐       ││
│ │ 模式: ○全部 │ │ │     │ │     │ │     │       ││
│ │       ○间隔 │ │ │  1  │ │  2  │ │  3  │       ││
│ │       ○数量 │ │ └─────┘ └─────┘ └─────┘       ││
│ │       ○时间 │ │ ┌─────┐ ┌─────┐ ┌─────┐       ││
│ │ 间隔: [3]秒 │ │ │     │ │     │ │     │       ││
│ │ 格式: PNG ▼ │ │ │  4  │ │  5  │ │  6  │       ││
│ │ 质量: [85]  │ │ └─────┘ └─────┘ └─────┘       ││
│ │ 缩放: [    ]│ └───────────────────────────────┘│
│ └─────────────┘                                   │
├─────────────────────────────────────────────────┤
│ 进度条：[████████░░░░░░░░] 50% | 已抽取 300 帧   │
├─────────────────────────────────────────────────┤
│ 状态栏：输出目录: xxx | 总帧数: 600              │
└─────────────────────────────────────────────────┘
```

**Message 枚举**：

```rust
pub enum Message {
    // 文件选择
    OpenVideo,
    VideoLoaded(Result<PathBuf, String>),
    VideoProbed(Result<VideoInfo, String>),

    // 参数
    ExtractModeChanged(ExtractMode),
    IntervalChanged(String),
    FrameCountChanged(String),
    TimePointsChanged(String),
    OutputFormatChanged(OutputFormat),
    JpegQualityChanged(u8),
    ResizeWidthChanged(String),
    SelectOutputDir,
    OutputDirSelected(Option<PathBuf>),

    // 执行
    StartExtract,
    ExtractProgress(f32),
    ExtractComplete(Result<Vec<ExtractedFrame>, String>),

    // 预览
    FrameSelected(usize),
    ExportFrames,
    ExportComplete(Result<String, String>),

    // FFmpeg 检测
    FfmpegCheckComplete(bool),
    ShowError(String),
}
```

### 4. 注册接入

| 文件 | 修改 |
|------|------|
| `src/model/mod.rs` | 添加 `pub(crate) mod video_frame_state;` |
| `src/utils/mod.rs` | 添加 `pub(crate) mod video_frame_engine;` |
| `src/ui/mod.rs` | 添加 `pub(crate) mod video_frame;` |
| `src/ui/tabs/root_tab.rs` | `Page` 枚举添加 `VideoFrame` 变体，`view()` 添加按钮（使用已有的 `video_file.svg`） |
| `src/ui/home.rs` | `Message` 添加 `VideoFrame` 变体，`Home` 添加字段，`update`/`view` 接入 |

## 依赖变更 — `Cargo.toml`

```toml
# Video processing
ffmpeg-next = "7"
```

> 注意：`ffmpeg-next` 需要系统安装 FFmpeg 开发库。Windows 上可通过 vcpkg 或下载预编译的 shared libraries。README 中需添加 FFmpeg 安装说明。

## 文件清单

```
新增：
  src/model/video_frame_state.rs    — 数据模型
  src/utils/video_frame_engine.rs   — 抽帧引擎
  src/ui/video_frame/mod.rs         — 页面组件

修改：
  Cargo.toml                        — 添加 ffmpeg-next 依赖
  src/model/mod.rs                  — 注册模块
  src/utils/mod.rs                  — 注册模块
  src/ui/mod.rs                     — 注册模块
  src/ui/tabs/root_tab.rs           — 添加标签
  src/ui/home.rs                    — 接入页面
```

## 验证方式

1. `cargo build` 编译通过
2. 运行应用，左侧导航出现"视频抽帧"标签（使用 `video_file.svg` 图标）
3. 选择视频文件，确认元信息正确显示（时长、分辨率、帧率、总帧数）
4. 全部帧模式：抽取短片（~5秒），确认帧数与视频总帧数一致，文件名连续编号，meta.json 内容正确
5. 按间隔/按数量/按时间点模式：确认抽取结果符合预期
6. 导出帧到目录，确认文件正确生成
7. 用导出的帧序列 + meta.json 中的 fps 信息通过 FFmpeg 命令行还原视频，确认可播放
