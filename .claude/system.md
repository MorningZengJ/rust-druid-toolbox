# 系统概述

## 项目身份

- **目录名**: druid-toolbox（历史遗留）
- **crate 名**: tauri-toolbox
- **产品名**: MToolbox
- **版本**: 0.1.2（Cargo.toml / tauri.conf.json 一致）
- **作者**: MorningZeng (zengchennihon@gmail.com)
- **远程仓库**: git@github.com:MorningZengJ/rust-druid-toolbox.git
- **架构**: Tauri v2 + React 19 + TypeScript + Vite + Mantine UI v9
- **后端**: Rust (edition 2021)，Tauri IPC 命令
- **前端**: React 19 + TypeScript + Mantine UI v9
- **状态管理**: Zustand v5
- **国际化**: i18next + react-i18next
- **构建前端端口**: 5555（strictPort）
- **路径别名**: `@/` → `frontend/src/`
- **换行符**: LF 为主（部分 Windows 工具链文件可能 CRLF，修改时保留文件原有风格）

## 用途

Windows 桌面工具箱应用，中文默认界面。包含四个主要功能页面：

1. **批量文件重命名**：选择目录、过滤文件、定义替换规则、预览并执行重命名
2. **字符画生成**：将图片转换为 ASCII 字符画，支持多种颜色模式和参数调节
3. **视频工具**：视频合并、图片序列转视频、格式转换（视频/音频）、视频抽帧，支持流复制和重编码两阶段策略
4. **设置**：主题切换（6 色主题 + 自定义主色）、色彩模式（light/dark/system）、18 种语言切换、更新检查与安装

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
    main.tsx                     # 入口：窗口状态恢复 → ThemeProvider → App (48 行)
    App.tsx                      # 主布局：左侧 72px 导航栏 + 右侧内容区 + 底部状态栏 (392 行)
    globals.css                  # 设计令牌 CSS 变量 + 字体引入 + 自定义滚动条 + 动画关键帧 (200 行)
    mantine-theme.ts             # Mantine 主题定义（8 色彩色板 + 自定义主色生成）(234 行)
    i18n/
      index.ts                   # i18next 初始化，18 种语言，6 个 namespace (63 行)
      types.ts                   # Language/Namespace 类型 + RTL 语言列表 (52 行)
      rtl.ts                     # RTL 方向应用函数 (13 行)
      locales/                   # 18 × 6 个 JSON + 18 个 index.ts 入口
        {locale}/
          index.ts               # 合并 6 个 JSON namespace 导出
          common.json
          rename.json
          asciiArt.json
          videoTool.json
          settings.json
          errors.json
    lib/
      store.ts                   # 全局共享 settingsStore 单例 (LazyStore) (5 行)
      configValidator.ts         # settings.json 字段校验（窗口/主题/更新设置）(85 行)
      renameLogic.ts             # 客户端重命名预览逻辑（镜像 Rust 后端）(30 行)
      asciiArtApi.ts             # ASCII art 导出工具函数（PNG 写入）(36 行)
    types/
      index.ts                   # TypeScript 类型定义（匹配 Rust serde 结构）(288 行)
    hooks/
      useTheme.ts                # 主题管理 hook + 色彩主题列表 (42 行)
      useWindowState.ts          # 窗口位置/尺寸持久化（Tauri store）(53 行)
    stores/
      themeStore.ts              # 主题状态 Zustand store（持久化到 settingsStore）(67 行)
      i18nStore.ts               # 语言状态 Zustand store（persist 中间件）(33 行)
      updateStore.ts             # 更新状态 Zustand store（Tauri updater）(133 行)
      renameStore.ts             # 重命名页 Zustand store（含 applyFilters 辅助函数）(433 行)
      asciiArtStore.ts           # 字符画页 Zustand store (262 行)
      videoToolStore.ts          # 重导出 useVideoToolStore（从 videoTool/ 目录）
      videoTool/                 # 视频工具页 Zustand store（slice 模式）
        index.ts                 # 主 store：shared 状态 + slice 组合 (152 行)
        types.ts                 # VideoToolState 类型定义 (123 行)
        mergeSlice.ts            # 合并功能 slice (71 行)
        imagesSlice.ts           # 图片转视频 slice (103 行)
        convertSlice.ts          # 格式转换 slice (173 行)
        extractSlice.ts          # 抽帧 slice (190 行)
    components/
      ThemeProvider.tsx           # MantineProvider + CSS 变量同步（设计令牌运行时）(124 行)
      FileIcon.tsx               # 文件类型图标组件
      ui/
        resizable.tsx            # 包装 react-resizable-panels
    pages/
      rename/
        RenamePage.tsx           # 页面入口 (76 行)
        FilePreview.tsx          # 文件预览表格，@tanstack/react-table (487 行)
        Toolbar.tsx              # 工具栏 (93 行)
        FilterSection.tsx        # 过滤区域 (112 行)
        QuickFilters.tsx         # 快捷筛选 (69 行)
        RuleCard.tsx             # 规则卡片 (145 行)
        RuleList.tsx             # 规则列表 (72 行)
        StatusBar.tsx            # 状态栏 (82 行)
      ascii-art/
        AsciiArtPage.tsx         # 字符画页面入口（支持拖拽/粘贴）(118 行)
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
          ConvertFormatOptions.tsx     # 格式转换选项 (129 行)
          ConvertProgressPanel.tsx     # 转换进度面板 (187 行)
          ExtractParamsPanel.tsx       # 抽帧参数面板 (234 行)
          FileRow.tsx                  # 文件行组件 (67 行)
          FrameViewer.tsx              # 帧查看器 (180 行)
      settings/
        SettingsPage.tsx         # 设置页（外观/主题/自定义色/语言/更新）(298 行)
        UpdateSection.tsx        # 更新功能组件 (280 行)
    utils/
      formatTime.ts              # 时间格式化工具 (~10 行)

src-tauri/                       # Tauri 后端（Rust）
  src/
    main.rs                      # Windows subsystem 入口 (6 行)
    lib.rs                       # Tauri Builder，注册插件和所有命令（condition-gated 双分支）(94 行)
    commands/
      mod.rs                     # 模块声明 (7 行)
      rename.rs                  # 9 个 Tauri 命令 (93 行)
      ascii_art.rs               # 6 个 Tauri 命令 (180 行)
      video_frame.rs             # 5 个命令 (108 行，#[cfg(feature = "video-frame")])
      video_tool.rs              # 6 个命令 (111 行，#[cfg(feature = "video-frame")])
      video_utils.rs             # 2 个命令（list_images_in_folder/list_media_files_in_folder, 无条件 gate）(161 行)
    model/
      mod.rs                     # 模块声明 (9 行)
      file_info.rs               # FileInfo (15 行)
      replace_info.rs            # ReplaceInfo (26 行)
      rename_result.rs           # RenameResult + RenameError (16 行)
      rule_template.rs           # RuleTemplate 枚举 6 变体 (33 行)
      ascii_art_state.rs         # AsciiArtParams/AsciiArtOutput 等 (115 行)
      video_frame_state.rs       # VideoInfo/ExtractedFrame/ExtractParams 等 (68 行, #[cfg(feature = "video-frame")])
      video_tool_state.rs        # MergeVideosParams/ImagesToVideoParams/ConvertFormatParams 等 (144 行, #[cfg(feature = "video-frame")])
    utils/
      mod.rs                     # 模块声明 (9 行)
      common_utils.rs            # parent_path()/join_path() (19 行)
      font_renderer.rs           # 字体渲染（ASCII art PNG）(93 行)
      file_utils.rs              # list_files()/format_size() (111 行)
      rename_logic.rs            # apply_replace_rules()/validate_regex()，8 个单元测试 (98 行)
      video_frame_engine.rs      # check_ffmpeg/probe_video/extract_frames (361 行, #[cfg(feature = "video-frame")])
      ascii_art_engine/
        mod.rs                   # convert_from_image() (73 行)
        grid.rs                  # 字符网格生成 (104 行)
        image_preprocess.rs      # 图片预处理 (56 行)
        renderers.rs             # 输出渲染器：PNG/SVG/Canvas/HTML (244 行)
      video_tool_engine/         # 全部 #[cfg(feature = "video-frame")]
        mod.rs                   # 空结构体 + 子模块声明 (9 行)
        common.rs                # 共享工具函数：probe/codec 检测/分辨率/日志 (380 行)
        merge.rs                 # merge_videos() 流复制 (381 行)
        merge_reencode.rs        # merge_videos() 重编码 (537 行)
        convert.rs               # convert_format() 流复制 (365 行)
        convert_video.rs         # convert_format() 重编码 (492 行)
        cover.rs                 # 封面提取 (186 行)
        images_to_video.rs       # images_to_video() (270 行)
  Cargo.toml
  tauri.conf.json                # 窗口 800x600，最小 600x400
  build.rs                       # tauri_build::build() + Windows 系统库链接
```

## 核心架构

### IPC 通信

- Rust 后端通过 `#[tauri::command]` 暴露函数（默认 features 下 28 个命令，其中 11 个 feature-gated；不含 video-frame 则为 17 个）
- 前端通过 `@tauri-apps/api` 的 `invoke()` 调用 Rust 命令
- 所有跨 IPC 数据结构必须 derive `serde::Serialize` + `serde::Deserialize`
- 使用 `#[serde(rename_all = "camelCase")]` 实现 Rust snake_case ↔ JS camelCase 自动转换
- 异步命令使用 `tokio::task::spawn_blocking` 包裹 CPU 密集操作
- 进度更新通过 Tauri 事件系统：`app_handle.emit("event", data)` → `listen("event", callback)`
- 事件命名规范：`ascii-art://progress`、`video-tool://progress`、`video-tool://log`、`load-files-progress`

### 状态管理

- 前端使用 Zustand store 管理页面状态
- 每个页面独立 store：renameStore / asciiArtStore / videoToolStore
- videoToolStore 使用 slice 模式拆分（mergeSlice / imagesSlice / convertSlice / extractSlice）
- 主题状态：themeStore（持久化到 settingsStore / LazyStore）
- 语言偏好：i18nStore（Zustand persist 中间件，localStorage key: `i18n-storage`）
- 更新状态：updateStore（版本/状态/进度）
- 规则撤销：renameStore 内维护 ruleHistory 栈

### 设计令牌系统

- `globals.css` 定义 CSS 变量（表面层、文字、边框、阴影、字体、主色调）
- `ThemeProvider` 中的 `CssVariableSync` 组件在运行时从 Mantine 主题更新 `--accent-*`/`--surface-*`/`--text-*`/`--border-*`/`--shadow-*`/`--status-*` 变量
- 组件优先使用 CSS 变量替代反复写颜色值
- 暗色主题额外叠加 SVG 噪点纹理（opacity 0.018）

### 字体系统

- 显示/等宽字体：`JetBrains Mono`（@fontsource/jetbrains-mono）
- 正文字体：`DM Sans Variable`（@fontsource-variable/dm-sans）
- 后备字体：`Noto Sans SC`、`Segoe UI`

### 导航系统

- 左侧固定 72px 导航栏：Logo + 3 功能页图标 + 分隔线 + 主题切换 + 设置图标
- content area：display 切换（非路由），150ms fade+translateY 动画
- 底部状态栏：28px 高，当前页描述 + 版本号（当前硬编码 "v0.1.0"）

### i18n 国际化

- 框架：i18next + react-i18next + i18next-browser-languagedetector
- 18 种语言：zh-CN/en-US/ja-JP/ko-KR/zh-TW/de-DE/fr-FR/es-ES/pt-BR/ru-RU/ar-SA/hi-IN/th-TH/vi-VN/it-IT/nl-NL/pl-PL/tr-TR
- 6 个 namespace：common、rename、asciiArt、videoTool、settings、errors
- 回退语言：zh-CN
- 语言检测顺序：localStorage → navigator.language
- RTL 支持：阿拉伯语（ar-SA）为 RTL 方向，通过 `applyDirection()` 切换 `document.dir`
- 存储：Zustand persist 到 localStorage

### 重命名流程

1. 用户选择目录 → `invoke("list_files")` 加载文件列表
2. 分阶段加载：`list_files_quick`（无目录大小）→ `list_files_with_size`（后台计算目录大小），通过 `load-files-progress` 事件报告进度
3. 过滤：关键字过滤（纯文本/正则）+ 快捷筛选（全部/文件夹/文件/扩展名）
4. 添加替换规则（content/target/enable/isRegex），支持模板
5. 客户端预览：`renameLogic.applyReplaceRules()` 实时计算新文件名 + @tanstack/react-table 渲染
6. 冲突检测：`invoke("detect_conflicts")`
7. 确认 → `invoke("execute_renames")`，返回 RenameResult，执行后自动 reload

### 字符画流程

1. 打开图片：文件选择器 / 拖拽 / 粘贴
2. `invoke("load_image_from_file")` 或 `save_temp_image_and_convert`（粘贴/拖拽数据先写临时文件）
3. 参数调节自动触发 debounced conversion（500ms）
4. `invoke("convert_ascii_art_from_path")` 异步转换（spawn_blocking），事件 `ascii-art://progress`
5. 输出 plainText/htmlText/ansiText，支持 Canvas / HTML 渲染
6. 缩放（CSS/Canvas transform）、复制到剪贴板、导出 PNG/SVG/TXT/HTML

### 视频工具流程

1. `invoke("check_ffmpeg")` + `invoke("check_video_encoders")` + `invoke("check_audio_encoders")`
2. **视频合并**：选择视频 → `invoke("merge_videos")`，流复制优先 + 自动降级重编码
3. **图片转视频**：选择文件夹 → `invoke("list_images_in_folder")` → `invoke("images_to_video")`
4. **格式转换**：`invoke("convert_format")` 或 `invoke("batch_convert_format")`，两阶段策略
5. **视频抽帧**：`invoke("probe_video")` → `invoke("extract_frames")` + 文件监控（notify crate）
6. 事件 `video-tool://progress` / `video-tool://log`
7. 视频功能通过 `#[cfg(feature = "video-frame")]` 条件编译（默认启用）

### 设置页

- 外观设置：3 种色彩模式（light/dark/system）按钮组
- 色彩主题：6 种预设（default/blue/green/purple/orange/rose），圆形选择器
- 自定义主色：hex 输入框 + Apply/Clear 按钮
- 语言设置：Select 下拉框，18 种语言
- 更新检查：版本显示 + 检查更新 + 下载安装 + 自动检查开关

### 自动更新系统

- 插件：tauri-plugin-updater + tauri-plugin-process
- 更新配置终点：GitHub raw `updater.json`
- 公钥验证：ed25519 签名
- 流程：updateStore.init() → checkForUpdate() → downloadAndInstall() → relaunch()
- 设置页 `UpdateSection.tsx` 展示状态和进度

### 共享持久化

- `lib/store.ts`：全局单例 `settingsStore = new LazyStore("settings.json")`
- 用途：窗口状态、主题偏好、更新设置
- `lib/configValidator.ts`：读取配置时校验类型/范围，不盲信文件内容
- 窗口状态校验：最小尺寸 600×400、NaN/Infinity 防御、负数位置保留但 center

## 依赖关系

### Rust 后端（Cargo.toml）

| 依赖 | 版本 | 用途 |
|------|------|------|
| tauri | 2 (protocol-asset) | 桌面框架 |
| tauri-plugin-dialog | 2 | 文件/文件夹对话框 |
| tauri-plugin-clipboard-manager | 2 | 剪贴板 |
| tauri-plugin-opener | 2 | 打开 URL/文件 |
| tauri-plugin-store | 2 | 持久化键值存储 |
| tauri-plugin-updater | 2 | 自动更新 |
| tauri-plugin-process | 2 | 进程重启 |
| serde + serde_json | 1 | IPC 序列化 |
| tokio | 1 (rt-multi-thread, macros) | 异步运行时 |
| fancy-regex | 0.18 | 正则（前瞻/后顾） |
| image | 0.25 | 图片处理 |
| ab_glyph | 0.2 | 字体渲染（ASCII art PNG） |
| ffmpeg-next | 8 (optional, static) | 视频处理 |
| uuid | 1 (v4) | 替换规则 ID |
| anyhow | 1 | 错误处理 |
| notify | 7 | 文件监控（抽帧） |

### 前端（package.json）

| 依赖 | 版本 | 用途 |
|------|------|------|
| react / react-dom | ^19.2.6 | UI 框架 |
| @tauri-apps/api | ^2.11.0 | Tauri IPC |
| @tauri-apps/plugin-dialog | ^2.7.1 | 对话框 |
| @tauri-apps/plugin-clipboard-manager | ^2.3.2 | 剪贴板 |
| @tauri-apps/plugin-opener | ^2.0.0 | 打开 URL/文件 |
| @tauri-apps/plugin-store | ^2 | 持久化存储 |
| @tauri-apps/plugin-updater | ^2.10.1 | 自动更新 |
| @tauri-apps/plugin-process | ^2.3.1 | 进程重启 |
| @mantine/core | ^9.2.1 | UI 组件库 |
| @mantine/hooks | ^9.2.1 | Mantine hooks |
| @mantine/modals | ^9.2.1 | 模态框管理 |
| @mantine/notifications | ^9.2.1 | 通知 |
| zustand | ^5.0.13 | 状态管理 |
| @tanstack/react-table | ^8.21.3 | 表格 |
| react-virtuoso | ^4.18.7 | 虚拟滚动 |
| lucide-react | ^1.16.0 | 图标 |
| react-resizable-panels | ^4.11.1 | 可调整面板 |
| i18next | ^26.3.1 | 国际化核心 |
| react-i18next | ^17.0.8 | React 绑定 |
| i18next-browser-languagedetector | ^8.2.1 | 语言检测 |
| @fontsource-variable/dm-sans | ^5.2.8 | DM Sans 可变字体 |
| @fontsource/jetbrains-mono | ^5.2.8 | JetBrains Mono 等宽字体 |

## 构建与运行

- **Tauri 开发**: `npm run tauri dev`（项目根目录）
- **前端构建**: `cd frontend && npm run build`
- **Tauri 构建**: `npx tauri build`
- **Rust 检查**: `cargo check --manifest-path src-tauri/Cargo.toml`
- **Rust 测试**: `cargo test --manifest-path src-tauri/Cargo.toml`
- **FFmpeg 编译检查**: `cargo check --manifest-path src-tauri/Cargo.toml --features video-frame`（默认已包含）
- **平台**: Windows 为主（`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`）

## 环境要求

- **PowerShell 执行策略**: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- **LLVM**: `winget install LLVM.LLVM --accept-package-agreements --accept-source-agreements`（FFmpeg 编译需要）
- **vcpkg FFmpeg 静态库**: `C:\vcpkg\vcpkg install ffmpeg:x64-windows-static-md`

## 测试

- **Rust**: `src-tauri/src/utils/rename_logic.rs` 包含 8 个单元测试（纯文本替换、正则替换、禁用规则、多规则链、无匹配、空规则、正则验证）
- **前端**: 无测试框架，手动验证关键交互流程
- **测试目录**: `src-tauri/tests/` 存在但当前为空

## 已知风险

- **video_tool_engine/merge_reencode.rs 537 行**：超出 500 行限制
- **video_tool_engine/convert_video.rs 492 行**：接近 500 行限制
- **FilePreview.tsx 487 行**：接近 500 行限制
- **测试覆盖不足**：仅 rename_logic.rs 有单元测试，前端无测试
- **FFmpeg 依赖**：视频工具需要系统安装 FFmpeg 静态库
- **i18n 维护成本**：18 种语言 × 6 namespace = 108 个 JSON 文件，新增文本需同步所有语言
- **版本不一致**：`App.tsx` 状态栏硬编码 "v0.1.0"，而 Cargo.toml / tauri.conf.json 为 0.1.2
- **API 调用模式不统一**：renameStore 和 asciiArtStore 直接调用 `invoke()`，而 `lib/asciiArtApi.ts` 提供了部分封装；策略要求统一封装但未严格遵循
- **大图片 IPC**：大图片 Vec<u8> 通过 IPC 传输可能较慢
- **字符画渲染性能**：大量 HTML span 标签可能影响渲染
- **Iced 旧代码**：`.backup/` 目录保留了旧的 Iced GUI 代码，仅供参考
- **视频工具编码器**：需要 FFmpeg 编译时包含 libx264/libx265 等编码器
