# 系统概述

## 项目身份

- **名称**: druid-toolbox
- **版本**: 0.1.0
- **架构**: Tauri v2 + React 19 + TypeScript + Vite + shadcn/ui
- **后端**: Rust (edition 2021)，Tauri IPC 命令
- **前端**: React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix UI)
- **状态管理**: Zustand
- **作者**: MorningZeng (zengchennihon@gmail.com)
- **远程仓库**: git@github.com:MorningZengJ/rust-druid-toolbox.git

## 用途

Windows 桌面工具箱应用，中文界面。包含三个主要功能模块：

1. **批量文件重命名**：选择目录、过滤文件、定义替换规则、预览并执行重命名
2. **字符画生成**：将图片转换为 ASCII 字符画，支持多种颜色模式和参数调节
3. **视频抽帧**：从视频中提取帧图片，支持多种提取模式和输出格式

## 项目结构

```
frontend/                    # React 前端
  src/
    main.tsx                 # 入口，StrictMode + TooltipProvider 包裹
    App.tsx                  # 主布局：左侧 90px 导航栏 + 右侧内容区（display 切换，非路由）
    globals.css              # Tailwind CSS + shadcn/ui 主题变量（亮/暗 + 6 色彩主题）
    lib/
      utils.ts               # cn() 工具函数（clsx + tailwind-merge）
      renameLogic.ts         # 客户端重命名预览逻辑（镜像 Rust 后端）
    types/
      index.ts               # TypeScript 类型定义（匹配 Rust serde 结构）
    hooks/
      useTheme.ts            # 主题管理 hook（light/dark/system + 6 色彩主题 + 自定义主色，持久化到 Tauri store）
      useWindowState.ts      # 窗口位置/尺寸持久化（Tauri store）
    stores/
      renameStore.ts         # 重命名页 Zustand store
      asciiArtStore.ts       # 字符画页 Zustand store
      videoFrameStore.ts     # 视频抽帧页 Zustand store
    components/
      FileIcon.tsx           # 文件类型图标组件
      ui/                    # shadcn/ui 组件（15 个）
    pages/
      rename/                # 重命名页面（8 个子组件）
      ascii-art/
        AsciiArtPage.tsx     # 字符画页面（左侧控制面板 + 右侧预览）
      video-frame/
        VideoFramePage.tsx   # 视频抽帧页面（左侧参数 + 右侧帧网格）
      settings/
        SettingsPage.tsx     # 设置页（主题切换 + 自定义主色）

src-tauri/                   # Tauri 后端（Rust）
  src/
    main.rs                  # Windows subsystem 入口，调用 lib::run()
    lib.rs                   # Tauri Builder，注册插件和所有命令
    commands/
      mod.rs                 # 模块声明（video_frame 有 feature gate）
      rename.rs              # 7 个命令：list_files/preview_renames/detect_conflicts/execute_renames/validate_regex/apply_rule_template/parent_path
      ascii_art.rs           # 5 个命令：convert_ascii_art_from_path/save_temp_image_and_convert/load_image_from_file/write_binary_file/export_ascii_art
      video_frame.rs         # 5 个命令：check_ffmpeg/probe_video/extract_frames/start_frame_watcher/stop_frame_watcher
    model/
      mod.rs                 # 模块声明（video_frame_state 有 feature gate）
      file_info.rs           # FileInfo（name/path/parent_path/is_dir/extension/size/created_time/modified_time）
      replace_info.rs        # ReplaceInfo（id/content/target/enable/is_regex/is_error）
      rename_result.rs       # RenameResult + RenameError
      rule_template.rs       # RuleTemplate 枚举（6 变体）
      ascii_art_state.rs     # AsciiArtParams/AsciiArtOutput/CharsetPreset/ColorMode/Background/RenderMode/CharColor
      video_frame_state.rs   # VideoInfo/ExtractedFrame/ExtractParams/ExtractMode/OutputFormat/ProgressInfo/LogEntry（feature-gated）
    utils/
      mod.rs                 # 模块声明（video_frame_engine 有 feature gate）
      common_utils.rs        # CommonUtils: parent_path()/join_path()
      file_utils.rs          # FileUtils: list_files()/format_size()
      rename_logic.rs        # apply_replace_rules()/validate_regex()，含 8 个单元测试
      ascii_art_engine.rs    # AsciiArtEngine: convert_from_image()，支持 PNG/SVG/Canvas 输出模式
      video_frame_engine.rs  # VideoFrameEngine: check_ffmpeg/probe_video/extract_frames（含进度/日志/帧回调）
  Cargo.toml                 # 依赖：tauri 2、serde、fancy-regex 0.18、image 0.25、ffmpeg-next 8(optional)、uuid、anyhow、notify 7
  tauri.conf.json            # 窗口 800x600，最小 600x400
  build.rs                   # tauri_build::build()
```

## 核心架构

### IPC 通信

- Rust 后端通过 `#[tauri::command]` 暴露函数
- 前端通过 `@tauri-apps/api` 的 `invoke()` 调用 Rust 命令
- 所有跨 IPC 数据结构必须 derive `serde::Serialize` + `serde::Deserialize`
- 使用 `#[serde(rename_all = "camelCase")]` 实现 Rust snake_case ↔ JS camelCase 自动转换
- 异步命令使用 `tokio::task::spawn_blocking` 包裹 CPU 密集操作
- 进度更新通过 Tauri 事件系统：`app_handle.emit("event", data)` → `listen("event", callback)`

### 状态管理

- 前端使用 Zustand store 管理页面状态（zustand ^5.0.13）
- 每个页面独立 store：renameStore / asciiArtStore / videoFrameStore
- UI 状态（折叠、选中等）也在 store 中管理
- 规则撤销：store 内维护 ruleHistory 栈

### 重命名流程

1. 用户选择目录 → `invoke("list_files")` 加载文件列表
2. 过滤：关键字过滤（纯文本/正则）+ 快捷筛选（全部/文件夹/文件/扩展名）
3. 添加替换规则（content/target/enable/isRegex），支持模板
4. 客户端预览：`renameLogic.applyReplaceRules()` 实时计算新文件名
5. 冲突检测：`invoke("detect_conflicts")` 检测文件名冲突
6. 确认 → `invoke("execute_renames")` 执行，返回 RenameResult

### 字符画流程

1. 打开图片 → `invoke("load_image_from_file")` 读取字节，或拖拽图片通过 `invoke("save_temp_image_and_convert")` 一步完成
2. 调节参数（宽度/字符集/对比度/亮度/饱和度/颜色模式/背景/宽高比）
3. `invoke("convert_ascii_art_from_path")` 异步转换（spawn_blocking）
4. 输出 plainText/htmlText/ansiText，前端用 `dangerouslySetInnerHTML` 渲染 HTML
5. 支持缩放（CSS transform）和复制/导出

### 视频抽帧流程

1. `invoke("check_ffmpeg")` 检测 FFmpeg 可用性
2. 选择视频 → `invoke("probe_video")` 读取元数据
3. 设置参数 → `invoke("extract_frames")` 异步提取，通过事件监听进度（ProgressInfo/LogEntry/ExtractedFrame）
4. `invoke("start_frame_watcher")` 启动文件监控（notify crate），`invoke("stop_frame_watcher")` 停止
5. 帧网格展示，支持单帧预览和批量导出
6. 视频帧命令通过 `#[cfg(feature = "video-frame")]` 条件编译

### 主题系统

- shadcn/ui CSS 变量（HSL 色彩空间）
- 亮色/暗色主题通过 `.dark` class 切换
- 6 种预设色彩主题：default/blue/green/purple/orange/rose，通过 CSS class 切换
- 支持自定义主色（HSL 值），直接设置 CSS 变量 --primary/--accent/--ring
- `useTheme` hook 管理主题状态，通过 `@tauri-apps/plugin-store` 的 `LazyStore` 持久化到 `settings.json`
- 支持跟随系统主题（system mode）

## 依赖关系

### Rust 后端

| 依赖 | 版本 | 用途 |
|------|------|------|
| tauri | 2 (protocol-asset) | 桌面框架 |
| tauri-plugin-dialog | 2 | 文件/文件夹选择对话框 |
| tauri-plugin-clipboard-manager | 2 | 剪贴板操作 |
| tauri-plugin-opener | 2 | 打开 URL/文件 |
| tauri-plugin-store | 2 | 持久化键值存储 |
| serde + serde_json | 1 | IPC 序列化 |
| tokio | 1 (rt-multi-thread, macros) | 异步运行时 |
| fancy-regex | 0.18.0 | 正则表达式（支持前瞻/后顾） |
| image | 0.25 | 图片处理 |
| ffmpeg-next | 8 (optional, static) | 视频处理（feature = "video-frame"） |
| uuid | 1 (v4) | 替换规则 ID |
| anyhow | 1 | 错误处理 |
| notify | 7 | 文件系统监控 |

### 前端

| 依赖 | 版本 | 用途 |
|------|------|------|
| react / react-dom | ^19.2.6 | UI 框架 |
| @tauri-apps/api | ^2.11.0 | Tauri IPC |
| @tauri-apps/plugin-dialog | ^2.7.1 | 对话框 |
| @tauri-apps/plugin-clipboard-manager | ^2.3.2 | 剪贴板 |
| @tauri-apps/plugin-opener | ^2.0.0 | 打开 URL/文件 |
| @tauri-apps/plugin-store | ^2 | 持久化存储 |
| zustand | ^5.0.13 | 状态管理 |
| react-virtuoso | ^4.18.7 | 虚拟滚动 |
| lucide-react | ^1.16.0 | 图标 |
| tailwindcss | ^4.3.0 | 样式 |
| radix-ui | ^1.4.3 | UI 基础（shadcn/ui 依赖） |
| react-resizable-panels | ^4.11.1 | 可调整面板布局 |

## 测试

- **Rust**: `src-tauri/src/utils/rename_logic.rs` 包含 8 个单元测试（纯文本替换、正则替换、禁用规则跳过多规则链、无匹配、空规则、正则验证）
- **前端**: 无测试框架，手动验证关键交互流程

## 已知风险

- **测试覆盖不足**：仅 rename_logic.rs 有单元测试，前端无测试
- **FFmpeg 依赖**：视频抽帧需要系统安装 FFmpeg，feature flag 控制编译
- **大图片 IPC**：大图片 Vec<u8> 通过 IPC 传输可能较慢
- **视频帧数据**：ExtractedFrame.image_data 是大字节数组，建议后端写入临时目录
- **字符画渲染性能**：大量 HTML span 标签可能影响渲染
- **Iced 旧代码**：`.backup/` 目录保留了旧的 Iced GUI 代码，仅供参考
