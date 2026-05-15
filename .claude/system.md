# 系统概述

## 项目身份

- **名称**: druid-toolbox
- **版本**: 0.1.0
- **架构**: Tauri v2 + React 18 + TypeScript + Vite + shadcn/ui
- **后端**: Rust (edition 2021)，Tauri IPC 命令
- **前端**: React 18 + TypeScript + Tailwind CSS + shadcn/ui (Radix UI)
- **状态管理**: Zustand
- **作者**: MorningZeng (zengchennihon@gmail.com)

## 用途

Windows 桌面工具箱应用，中文界面。包含三个主要功能模块：

1. **批量文件重命名**：选择目录、过滤文件、定义替换规则、预览并执行重命名
2. **字符画生成**：将图片转换为 ASCII 字符画，支持多种颜色模式和参数调节
3. **视频抽帧**：从视频中提取帧图片，支持多种提取模式和输出格式

## 项目结构

```
frontend/                    # React 前端
  src/
    main.tsx                 # 入口，TooltipProvider 包裹
    App.tsx                  # 主布局：左侧 90px 导航栏 + 右侧内容区
    globals.css              # Tailwind CSS + shadcn/ui 主题变量（亮/暗）
    lib/utils.ts             # cn() 工具函数（clsx + tailwind-merge）
    lib/renameLogic.ts       # 客户端重命名预览逻辑（镜像 Rust 后端）
    types/index.ts           # TypeScript 类型定义（匹配 Rust serde 结构）
    hooks/useTheme.ts        # 主题管理 hook（light/dark/system）
    stores/
      renameStore.ts         # 重命名页 Zustand store
      asciiArtStore.ts       # 字符画页 Zustand store
      videoFrameStore.ts     # 视频抽帧页 Zustand store
    components/ui/           # shadcn/ui 组件（button/input/slider/select/checkbox/dialog/resizable/scroll-area/tabs/tooltip/alert/popover/table/badge）
    pages/
      rename/                # 重命名页面
        RenamePage.tsx       # 主布局（ResizablePanelGroup）
        Toolbar.tsx          # 目录路径、浏览、上级目录、撤销
        FilterSection.tsx    # 可折叠筛选区
        QuickFilters.tsx     # 快捷筛选按钮（全部/文件夹/文件/扩展名）
        RuleList.tsx         # 替换规则列表
        RuleCard.tsx         # 单条规则卡片
        FilePreview.tsx      # 虚拟滚动文件预览（react-virtuoso）
        StatusBar.tsx        # 底部状态栏
        ConfirmDialog.tsx    # 确认弹窗
      ascii-art/
        AsciiArtPage.tsx     # 字符画页面（左侧控制面板 + 右侧预览）
      video-frame/
        VideoFramePage.tsx   # 视频抽帧页面（左侧参数 + 右侧帧网格）
      settings/
        SettingsPage.tsx     # 设置页（主题切换）

src-tauri/                   # Tauri 后端（Rust）
  src/
    main.rs                  # Windows subsystem 入口
    lib.rs                   # Tauri Builder，注册所有命令（视频帧命令条件编译）
    commands/
      mod.rs                 # 模块声明（video-frame feature gate）
      rename.rs              # 7 个 Tauri 命令：list_files/preview_renames/detect_conflicts/execute_renames/validate_regex/apply_rule_template/parent_path
      ascii_art.rs           # 2 个命令：convert_ascii_art（async spawn_blocking）/load_image_from_file
      video_frame.rs         # 4 个命令：check_ffmpeg/probe_video/extract_frames（async + 事件进度）/export_frames
    model/
      file_info.rs           # FileInfo（serde）
      replace_info.rs        # ReplaceInfo（serde）
      rename_result.rs       # RenameResult/RenameError（serde）
      rule_template.rs       # RuleTemplate 枚举（serde）
      rename_state.rs        # QuickFilter/FilterItem/ConflictInfo（serde）
      ascii_art_state.rs     # AsciiArtParams/CharsetPreset/ColorMode/Background（serde）
      video_frame_state.rs   # VideoInfo/ExtractedFrame/ExtractParams/ExtractMode/OutputFormat（serde）
    utils/
      common_utils.rs        # parent_path()/join_path()（返回 Result）
      file_utils.rs          # list_files()/format_size()
      rename_logic.rs        # apply_replace_rules()/validate_regex()，含 8 个单元测试
      ascii_art_engine.rs    # AsciiArtEngine::convert_from_image()，支持 4 种输出模式
      video_frame_engine.rs  # VideoFrameEngine：check_ffmpeg/probe_video/extract_frames
  Cargo.toml                 # 依赖：tauri 2、serde、fancy-regex、image、ffmpeg-next(optional)、uuid、anyhow
  tauri.conf.json            # 窗口 800x600，最小 600x400
  build.rs                   # tauri_build::build()
```

## 核心架构

### IPC 通信

- Rust 后端通过 `#[tauri::command]` 暴露函数
- 前端通过 `invoke()` 调用 Rust 命令
- 所有跨 IPC 数据结构必须 derive `serde::Serialize` + `serde::Deserialize`
- 使用 `#[serde(rename_all = "camelCase")]` 实现 Rust snake_case ↔ JS camelCase 自动转换
- 异步命令（convert_ascii_art/extract_frames）使用 `tokio::task::spawn_blocking`
- 进度更新通过 Tauri 事件系统：`app_handle.emit("event", data)` → `listen("event", callback)`

### 状态管理

- 前端使用 Zustand store 管理页面状态
- 每个页面独立 store：renameStore/asciiArtStore/videoFrameStore
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

1. 打开图片 → `invoke("load_image_from_file")` 读取字节
2. 调节参数（宽度/字符集/对比度/亮度/饱和度/颜色模式/背景/宽高比）
3. `invoke("convert_ascii_art")` 异步转换（spawn_blocking）
4. 输出 plainText/htmlText/ansiText，前端用 `dangerouslySetInnerHTML` 渲染 HTML
5. 支持缩放（CSS transform）和复制/导出

### 视频抽帧流程

1. `invoke("check_ffmpeg")` 检测 FFmpeg 可用性
2. 选择视频 → `invoke("probe_video")` 读取元数据
3. 设置参数 → `invoke("extract_frames")` 异步提取，通过事件监听进度
4. 帧网格展示，支持单帧预览和批量导出
5. 视频帧命令通过 `#[cfg(feature = "video-frame")]` 条件编译

### 主题系统

- shadcn/ui CSS 变量（HSL 色彩空间）
- 亮色/暗色主题通过 `.dark` class 切换
- `useTheme` hook 管理主题状态（light/dark/system），持久化到 localStorage
- 自定义颜色：toolbar/bottom-bar/panel/splitter/conflict/diff-added/diff-removed/success/warning

## 依赖关系

### Rust 后端

| 依赖 | 用途 |
|------|------|
| tauri 2 | 桌面框架 |
| tauri-plugin-dialog 2 | 文件/文件夹选择对话框 |
| tauri-plugin-clipboard-manager 2 | 剪贴板操作 |
| serde + serde_json | IPC 序列化 |
| tokio 1 | 异步运行时 |
| fancy-regex 0.13 | 正则表达式 |
| image 0.25 | 图片处理 |
| ffmpeg-next 8 (optional) | 视频处理（feature = "video-frame"） |
| uuid 1 | 替换规则 ID |
| anyhow 1 | 错误处理 |

### 前端

| 依赖 | 用途 |
|------|------|
| react 18 | UI 框架 |
| @tauri-apps/api 2 | Tauri IPC |
| @tauri-apps/plugin-dialog | 对话框 |
| @tauri-apps/plugin-clipboard-manager | 剪贴板 |
| zustand | 状态管理 |
| react-virtuoso | 虚拟滚动 |
| lucide-react | 图标 |
| tailwindcss | 样式 |
| shadcn/ui (radix) | UI 组件 |

## 测试

- `src-tauri/src/utils/rename_logic.rs` 包含 8 个单元测试
- 前端无测试框架（桌面应用场景，手动验证）

## 已知风险

- **测试覆盖不足**：仅 rename_logic.rs 有单元测试
- **FFmpeg 依赖**：视频抽帧需要系统安装 FFmpeg，feature flag 控制编译
- **大图片 IPC**：大图片 Vec<u8> 通过 IPC 传输可能较慢
- **视频帧数据**：ExtractedFrame.image_data 是大字节数组，建议后端写入临时目录
- **字符画渲染性能**：大量 HTML span 标签可能影响渲染
