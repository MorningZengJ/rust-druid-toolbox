# 系统概述

## 项目身份

- **名称**: tauri-toolbox
- **版本**: 0.1.0
- **架构**: Tauri v2 + React 19 + TypeScript + Vite + Mantine UI
- **后端**: Rust (edition 2021)，Tauri IPC 命令
- **前端**: React 19 + TypeScript + Mantine UI v9
- **状态管理**: Zustand v5
- **作者**: MorningZeng (zengchennihon@gmail.com)
- **远程仓库**: git@github.com:MorningZengJ/rust-druid-toolbox.git

## 用途

Windows 桌面工具箱应用，中文界面。包含四个主要功能页面：

1. **批量文件重命名**：选择目录、过滤文件、定义替换规则、预览并执行重命名
2. **字符画生成**：将图片转换为 ASCII 字符画，支持多种颜色模式和参数调节
3. **视频工具**：视频合并、图片序列转视频、格式转换（视频/音频）、视频抽帧，支持流复制和重编码两阶段策略
4. **设置**：主题切换、自定义主色

## 项目目标

- 长期可维护
- AI 可持续协作
- 模块清晰
- 避免大文件
- 易于扩展

## 架构原则

- feature-first
- 单向依赖
- 单一职责
- 低耦合
- 高内聚

## 项目结构

```
frontend/                        # React 前端
  src/
    main.tsx                     # 入口：窗口状态恢复 → ThemeProvider 包裹 → StrictMode + App (52 行)
    App.tsx                      # 主布局：左侧 90px 导航栏 + 右侧内容区（display 切换，非路由，4 个页面）(324 行)
    globals.css                  # 全局基础样式（Mantine 主题通过 MantineProvider 管理）
    mantine-theme.ts             # Mantine 主题定义（6 色彩主题 + 自定义主色生成）(167 行)
    lib/
      renameLogic.ts             # 客户端重命名预览逻辑（镜像 Rust 后端）(30 行)
    types/
      index.ts                   # TypeScript 类型定义（匹配 Rust serde 结构）(269 行)
    hooks/
      useTheme.ts                # 主题管理 hook（light/dark/system + 6 色彩主题 + 自定义主色）(34 行)
      useWindowState.ts          # 窗口位置/尺寸持久化（Tauri store）(53 行)
    stores/
      renameStore.ts             # 重命名页 Zustand store (375 行)
      asciiArtStore.ts           # 字符画页 Zustand store (260 行)
      videoToolStore.ts          # 重导出 useVideoToolStore（从 videoTool/ 目录）
      videoTool/                 # 视频工具页 Zustand store（slice 模式）
        index.ts                 # 主 store：shared 状态 + 事件监听 + slice 组合 (152 行)
        types.ts                 # VideoToolState 类型定义 (123 行)
        mergeSlice.ts            # 合并功能 slice (71 行)
        imagesSlice.ts           # 图片转视频 slice (103 行)
        convertSlice.ts          # 格式转换 slice (173 行)
        extractSlice.ts          # 抽帧 slice (190 行)
      themeStore.ts              # 主题状态 Zustand store（持久化到 LazyStore）(62 行)
      updateStore.ts             # 更新状态 Zustand store（检查/下载/安装更新）(~100 行)
    components/
      ThemeProvider.tsx           # 主题包装组件
      FileIcon.tsx               # 文件类型图标组件
      common/
        DirectoryPicker.tsx      # 目录选择器组件
        FfmpegWarning.tsx        # FFmpeg 不可用警告组件
        LogPanel.tsx             # 日志面板组件（视频工具通用）
      ui/
        resizable.tsx            # 包装 react-resizable-panels
    pages/
      rename/                    # 重命名页面
        RenamePage.tsx           # 页面入口 (76 行)
        FilePreview.tsx          # 文件预览表格，使用 @tanstack/react-table (487 行)
        Toolbar.tsx              # 工具栏 (93 行)
        FilterSection.tsx        # 过滤区域 (112 行)
        QuickFilters.tsx         # 快捷筛选 (69 行)
        RuleCard.tsx             # 规则卡片 (145 行)
        RuleList.tsx             # 规则列表 (72 行)
        StatusBar.tsx            # 状态栏 (82 行)
      ascii-art/
        AsciiArtPage.tsx         # 字符画页面入口 (105 行)
        ControlPanel.tsx         # 控制面板 (195 行)
        PreviewPanel.tsx         # 预览面板 (190 行)
        components/
          AsciiContent.tsx       # ASCII 内容渲染 (73 行)
          PreviewToolbar.tsx     # 预览工具栏 (136 行)
        hooks/
          useCanvasRenderer.ts   # Canvas 渲染 hook (62 行)
          usePanZoom.ts          # 平移缩放 hook (122 行)
      video-tool/
        VideoToolPage.tsx        # 视频工具页面入口（4 个 Tab）(170 行)
        MergePanel.tsx           # 视频合并面板 (281 行)
        ImagesPanel.tsx          # 图片序列转视频面板 (290 行)
        ConvertPanel.tsx         # 格式转换面板 (238 行)
        ExtractPanel.tsx         # 视频抽帧面板 (115 行)
        ProgressPanel.tsx        # 进度/日志展示面板 (117 行)
        constants.ts             # 视频格式常量
        components/
          ConvertFormatOptions.tsx   # 格式转换选项 (129 行)
          ConvertProgressPanel.tsx   # 转换进度面板 (187 行)
          ExtractParamsPanel.tsx     # 抽帧参数面板 (234 行)
          FileRow.tsx                # 文件行组件 (67 行)
          FrameViewer.tsx            # 帧查看器 (180 行)
      settings/
        SettingsPage.tsx         # 设置页（主题切换 + 自定义主色 + 更新检查）(~210 行)
        UpdateSection.tsx        # 更新功能组件（版本显示/检查更新/自动更新）(~280 行)
    utils/
      formatTime.ts              # 时间格式化工具 (约 10 行)

src-tauri/                       # Tauri 后端（Rust）
  src/
    main.rs                      # Windows subsystem 入口 (6 行)
    lib.rs                       # Tauri Builder，注册插件和所有命令（feature-gate 双分支）(84 行)
    commands/
      mod.rs                     # 模块声明（video_frame/video_tool 有 feature gate）(7 行)
      rename.rs                  # 7 个命令 (93 行)
      ascii_art.rs               # 6 个命令 (180 行)
      video_frame.rs             # 5 个命令 (108 行，feature-gated: video-frame)
      video_tool.rs              # 5 个命令 (111 行，feature-gated: video-frame)
      video_utils.rs             # 2 个命令 (161 行，无 feature gate，含自然排序)
    model/
      mod.rs                     # 模块声明 (9 行)
      file_info.rs               # FileInfo (15 行)
      replace_info.rs            # ReplaceInfo (26 行)
      rename_result.rs           # RenameResult + RenameError (16 行)
      rule_template.rs           # RuleTemplate 枚举 6 变体 (33 行)
      ascii_art_state.rs         # AsciiArtParams/AsciiArtOutput 等 (115 行)
      video_frame_state.rs       # VideoInfo/ExtractedFrame/ExtractParams 等 (68 行，feature-gated)
      video_tool_state.rs        # MergeVideosParams/ImagesToVideoParams/ConvertFormatParams 等 (144 行，feature-gated)
    utils/
      mod.rs                     # 模块声明 (9 行)
      common_utils.rs            # CommonUtils: parent_path()/join_path() (19 行)
      font_renderer.rs           # 字体渲染（私有模块，用于 ASCII art PNG 导出）(93 行)
      file_utils.rs              # FileUtils: list_files()/format_size() (111 行)
      rename_logic.rs            # apply_replace_rules()/validate_regex()，含 8 个单元测试 (98 行)
      video_frame_engine.rs      # VideoFrameEngine: check_ffmpeg/probe_video/extract_frames (361 行，feature-gated)
      ascii_art_engine/          # AsciiArtEngine 子模块
        mod.rs                   # 入口：convert_from_image() (73 行)
        grid.rs                  # 字符网格生成 (104 行)
        image_preprocess.rs      # 图片预处理 (56 行)
        renderers.rs             # 输出渲染器：PNG/SVG/Canvas/HTML (244 行)
      video_tool_engine/         # VideoToolEngine 子模块 (feature-gated)
        mod.rs                   # 空结构体 + 子模块声明 (9 行)
        common.rs                # 共享工具函数：probe/codec 检测/分辨率计算/日志发送 (380 行)
        merge.rs                 # merge_videos() 流复制入口 (381 行)
        merge_reencode.rs        # merge_videos() 重编码逻辑 (537 行)
        convert.rs               # convert_format() 流复制入口 (365 行)
        convert_video.rs         # convert_format() 重编码逻辑 (492 行)
        cover.rs                 # 封面提取工具 (186 行)
        images_to_video.rs       # images_to_video() 图片序列转视频 (270 行)
  Cargo.toml                     # 依赖见下方表格
  tauri.conf.json                # 窗口 800x600，最小 600x400
  build.rs                       # tauri_build::build() + Windows 系统库链接（FFmpeg 静态编译）
  tests/                         # 测试目录（当前为空）
```

## 核心架构

### IPC 通信

- Rust 后端通过 `#[tauri::command]` 暴露函数（共 25 个命令，其中 10 个 feature-gated）
- 前端通过 `@tauri-apps/api` 的 `invoke()` 调用 Rust 命令
- 所有跨 IPC 数据结构必须 derive `serde::Serialize` + `serde::Deserialize`
- 使用 `#[serde(rename_all = "camelCase")]` 实现 Rust snake_case ↔ JS camelCase 自动转换
- 异步命令使用 `tokio::task::spawn_blocking` 包裹 CPU 密集操作
- 进度更新通过 Tauri 事件系统：`app_handle.emit("event", data)` → `listen("event", callback)`

### 状态管理

- 前端使用 Zustand store 管理页面状态（zustand ^5.0.13）
- 每个页面独立 store：renameStore / asciiArtStore / videoToolStore
- videoToolStore 使用 slice 模式拆分（mergeSlice / imagesSlice / convertSlice / extractSlice）
- 主题状态独立 store：themeStore（持久化到 Tauri LazyStore）
- 规则撤销：store 内维护 ruleHistory 栈

### 主题系统

- ThemeProvider 组件在 main.tsx 中包裹 App，从 themeStore 加载主题配置
- MantineProvider 管理主题配置（colors、primaryColor、defaultColorScheme）
- 亮色/暗色主题通过 `useMantineColorScheme()` 切换
- 6 种预设色彩主题：default/blue/green/purple/orange/rose
- 支持自定义主色（hex 值），通过 `getThemeWithPrimary()` 生成自定义色阶
- `useTheme` hook 管理主题状态，通过 `@tauri-apps/plugin-store` 的 `LazyStore` 持久化到 `settings.json`
- 支持跟随系统主题（auto colorScheme）

### 重命名流程

1. 用户选择目录 → `invoke("list_files")` 加载文件列表
2. 过滤：关键字过滤（纯文本/正则）+ 快捷筛选（全部/文件夹/文件/扩展名）
3. 添加替换规则（content/target/enable/isRegex），支持模板
4. 客户端预览：`renameLogic.applyReplaceRules()` 实时计算新文件名，使用 @tanstack/react-table 渲染表格
5. 冲突检测：`invoke("detect_conflicts")` 检测文件名冲突
6. 确认 → `invoke("execute_renames")` 执行，返回 RenameResult

### 字符画流程

1. 打开图片 → `invoke("load_image_from_file")` 读取字节，或拖拽图片通过 `invoke("save_temp_image_and_convert")` 一步完成
2. 调节参数（宽度/字符集/对比度/亮度/饱和度/颜色模式/背景/宽高比）
3. `invoke("convert_ascii_art_from_path")` 异步转换（spawn_blocking）
4. 输出 plainText/htmlText/ansiText，前端用 Canvas 或 HTML 渲染
5. 支持缩放（CSS transform / Canvas transform）和复制/导出

### 视频工具流程

1. `invoke("check_ffmpeg")` + `invoke("check_video_encoders")` 检测 FFmpeg 和编码器可用性
2. **视频合并**（MergePanel）：选择多个视频 → `invoke("merge_videos")`，支持流复制（快速）和重编码两种模式，自动检测编解码器兼容性，不兼容时自动降级到重编码
3. **图片转视频**（ImagesPanel）：选择图片文件夹 → `invoke("list_images_in_folder")` 获取自然排序的图片列表 → `invoke("images_to_video")`，支持自定义 FPS/分辨率/音频/循环次数
4. **格式转换**（ConvertPanel）：选择文件 → `invoke("convert_format")` 或 `invoke("batch_convert_format")`，支持视频格式互转和音频提取，两阶段策略（流复制优先，失败自动重编码），支持自定义分辨率/码率
5. **视频抽帧**（ExtractPanel）：`invoke("probe_video")` 读取元数据 → `invoke("extract_frames")` 异步提取，支持文件监控（notify crate）
6. 宽高比保持：重编码时自动计算保持宽高比的缩放尺寸，不足部分填充黑边
7. 进度通过事件监听：`video-tool://progress`（进度/步骤）、`video-tool://log`（日志）
8. 视频工具命令通过 `#[cfg(feature = "video-frame")]` 条件编译

## 依赖关系

### Rust 后端

| 依赖 | 版本 | 用途 |
|------|------|------|
| tauri | 2 (protocol-asset) | 桌面框架 |
| tauri-plugin-dialog | 2 | 文件/文件夹选择对话框 |
| tauri-plugin-clipboard-manager | 2 | 剪贴板操作 |
| tauri-plugin-opener | 2 | 打开 URL/文件 |
| tauri-plugin-store | 2 | 持久化键值存储 |
| tauri-plugin-updater | 2 | 自动更新（签名验证） |
| tauri-plugin-process | 2 | 进程重启（更新后 relaunch） |
| serde + serde_json | 1 | IPC 序列化 |
| tokio | 1 (rt-multi-thread, macros) | 异步运行时 |
| fancy-regex | 0.18.0 | 正则表达式（支持前瞻/后顾） |
| image | 0.25 | 图片处理 |
| ab_glyph | 0.2 | 字体渲染（ASCII art PNG 导出） |
| ffmpeg-next | 8 (optional, static) | 视频处理（feature = "video-frame"） |
| uuid | 1 (v4) | 替换规则 ID |
| anyhow | 1 | 错误处理 |
| notify | 7 | 文件系统监控（视频抽帧） |

### 前端

| 依赖 | 版本 | 用途 |
|------|------|------|
| react / react-dom | ^19.2.6 | UI 框架 |
| @tauri-apps/api | ^2.11.0 | Tauri IPC |
| @tauri-apps/plugin-dialog | ^2.7.1 | 对话框 |
| @tauri-apps/plugin-clipboard-manager | ^2.3.2 | 剪贴板 |
| @tauri-apps/plugin-opener | ^2.0.0 | 打开 URL/文件 |
| @tauri-apps/plugin-store | ^2 | 持久化存储 |
| @tauri-apps/plugin-updater | ^2 | 自动更新 |
| @tauri-apps/plugin-process | ^2 | 进程重启 |
| @mantine/core | ^9.2.1 | Mantine UI 组件库 |
| @mantine/hooks | ^9.2.1 | Mantine hooks |
| @mantine/modals | ^9.2.1 | Mantine 模态框管理 |
| @mantine/notifications | ^9.2.1 | Mantine 通知组件 |
| zustand | ^5.0.13 | 状态管理 |
| @tanstack/react-table | ^8.21.3 | 表格组件（重命名文件预览） |
| react-virtuoso | ^4.18.7 | 虚拟滚动 |
| lucide-react | ^1.16.0 | 图标 |
| react-resizable-panels | ^4.11.1 | 可调整面板布局 |

## 构建与运行

- **Tauri 开发**: `npm run tauri dev`（项目根目录）
- **前端构建**: `cd frontend && npm run build`
- **Tauri 构建**: `npx tauri build`
- **Rust 检查**: `cargo check --manifest-path src-tauri/Cargo.toml`
- **Rust 测试**: `cargo test --manifest-path src-tauri/Cargo.toml`
- **FFmpeg 编译检查**: `cargo check --manifest-path src-tauri/Cargo.toml --features video-frame`
- **平台**: Windows 为主（`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`）

## 环境要求

- **PowerShell 执行策略**: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- **LLVM**: `winget install LLVM.LLVM --accept-package-agreements --accept-source-agreements`（FFmpeg 编译需要）
- **vcpkg FFmpeg 静态库**: `C:\vcpkg\vcpkg install ffmpeg:x64-windows-static-md`

## 测试

- **Rust**: `src-tauri/src/utils/rename_logic.rs` 包含 8 个单元测试（纯文本替换、正则替换、禁用规则跳过多规则链、无匹配、空规则、正则验证）
- **前端**: 无测试框架，手动验证关键交互流程
- **测试目录**: `src-tauri/tests/` 存在但当前为空

## Git 规范

- 主分支：main（远程），master（本地当前分支）
- 提交信息使用中文，简洁描述变更内容

## 已知风险

- **video_tool_engine/merge_reencode.rs 过大（537 行）**：超出 500 行限制，需进一步拆分
- **video_tool_engine/convert_video.rs 接近限制（492 行）**：接近 500 行限制
- **FilePreview.tsx 接近限制（487 行）**：接近 500 行限制
- **测试覆盖不足**：仅 rename_logic.rs 有单元测试，前端无测试，src-tauri/tests/ 为空
- **FFmpeg 依赖**：视频工具需要系统安装 FFmpeg，feature flag 控制编译
- **大图片 IPC**：大图片 Vec<u8> 通过 IPC 传输可能较慢
- **视频帧数据**：ExtractedFrame.image_data 是大字节数组，建议后端写入临时目录
- **字符画渲染性能**：大量 HTML span 标签可能影响渲染
- **Iced 旧代码**：`.backup/` 目录保留了旧的 Iced GUI 代码，仅供参考
- **视频工具编码器**：需要 FFmpeg 编译时包含 libx264/libx265 等编码器，否则只能使用流复制模式
