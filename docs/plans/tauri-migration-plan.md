# Iced → Tauri v2 + React + shadcn/ui 迁移计划

## 技术选型

| 层面 | 选择 | 理由 |
|------|------|------|
| 桌面框架 | Tauri v2 | 轻量、安全、支持移动端、IPC 性能好 |
| 前端框架 | React 18 | shadcn/ui 官方支持，生态最成熟 |
| UI 组件库 | shadcn/ui | 基于 Radix UI + Tailwind CSS，可定制、无运行时 |
| CSS 框架 | Tailwind CSS | shadcn/ui 依赖，原子化 CSS |
| 构建工具 | Vite | Tauri 官方推荐，HMR 快速 |
| 状态管理 | Zustand | 轻量、简洁、TypeScript 友好 |
| 语言 | TypeScript | 类型安全，开发体验好 |

## 项目结构

```
druid-toolbox/
├── frontend/                  # React 前端
│   ├── src/
│   │   ├── components/ui/     # shadcn/ui 组件
│   │   ├── pages/             # 页面组件
│   │   │   ├── rename/
│   │   │   ├── ascii-art/
│   │   │   ├── video-frame/
│   │   │   └── settings/
│   │   ├── hooks/             # 自定义 hooks
│   │   ├── stores/            # Zustand 状态管理
│   │   ├── types/             # TypeScript 类型
│   │   ├── lib/               # 工具函数
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── src-tauri/                  # Tauri 后端 (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/          # Tauri IPC 命令
│   │   │   ├── rename.rs
│   │   │   ├── ascii_art.rs
│   │   │   └── video_frame.rs
│   │   ├── model/             # 数据模型（从 src/model/ 迁移）
│   │   └── utils/             # 工具函数（从 src/utils/ 迁移）
│   ├── Cargo.toml
│   └── tauri.conf.json
├── assets/svg/                 # 图标资源（保留）
└── docs/
```

---

## 阶段一：项目初始化

### 1.1 前端初始化

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npx shadcn@latest init
npx shadcn@latest add button input slider select checkbox dialog \
  resizable scroll-area tabs tooltip alert popover command
```

安装核心依赖：

```bash
npm install @tauri-apps/api @tauri-apps/plugin-dialog @tauri-apps/plugin-clipboard-manager
npm install zustand react-virtuoso lucide-react
npm install -D @types/node
```

### 1.2 Tauri 后端初始化

在项目根目录执行：

```bash
cargo install create-tauri-app
# 或手动创建 src-tauri/ 目录
```

`src-tauri/Cargo.toml` 依赖：

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-clipboard-manager = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
fancy-regex = "0.13"
image = "0.25"
ffmpeg-next = "8"
uuid = { version = "1", features = ["v4"] }
anyhow = "1"
```

### 1.3 验证

`npm run tauri dev` 能启动空白窗口。

---

## 阶段二：Rust 后端迁移

### 2.1 数据模型迁移

从 `src/model/` 迁移到 `src-tauri/src/model/`，所有结构体添加 `serde::Serialize` + `serde::Deserialize`。

**关键变更**：

- `file_info.rs` — 直接添加 serde derives
- `replace_info.rs` — 添加 serde derives
- `rename_result.rs` — 添加 serde derives
- `rule_template.rs` — 添加 serde derives
- `rename_state.rs` — 拆分：只保留 `RenameSession`（数据+业务逻辑），UI 状态移至前端
- `ascii_art_state.rs` — 移除 `original_image: DynamicImage`，创建可序列化的 `AsciiArtParams`
- `video_frame_state.rs` — 移除 UI 状态字段（`is_extracting`、`progress`、`selected_frame`、`error_message`）

### 2.2 工具函数迁移

从 `src/utils/` 迁移到 `src-tauri/src/utils/`，基本无变更：

- `common_utils.rs` — `join_path` 改为返回 `Result`
- `file_utils.rs` — 无变更
- `rename_logic.rs` — 无变更
- `ascii_art_engine.rs` — `convert` 签名改为接收 `&AsciiArtParams` + `image_bytes: &[u8]`
- `video_frame_engine.rs` — 无变更

### 2.3 Tauri 命令层

创建 `src-tauri/src/commands/`，将业务逻辑暴露为 IPC 接口：

**重命名** (`commands/rename.rs`)：
- `list_files(path) -> Vec<FileInfo>`
- `preview_renames(dir_path, files, rules) -> Vec<FilePreview>`
- `detect_conflicts(files, rules) -> Vec<ConflictInfo>`
- `execute_renames(dir_path, files, rules) -> RenameResult`
- `validate_regex(pattern) -> bool`
- `apply_rule_template(template) -> ReplaceInfo`
- `parent_path(path) -> String`

**字符画** (`commands/ascii_art.rs`)：
- `convert_ascii_art(params, image_bytes) -> Result<AsciiArtOutput, String>` — spawn_blocking
- `load_image_from_file(path) -> Result<Vec<u8>, String>`

**视频抽帧** (`commands/video_frame.rs`)：
- `check_ffmpeg() -> bool`
- `probe_video(path) -> Result<VideoInfo, String>`
- `extract_frames(params, app_handle) -> Result<Vec<FrameInfo>, String>` — 进度通过事件推送
- `export_frames(frames, output_dir) -> Result<String, String>`

**进度事件**：`app_handle.emit("video-frame://progress", progress)` / `listen("video-frame://progress", cb)`

### 2.4 验证

- `cargo test` 通过（保留 rename_logic 的 8 个单元测试）
- `cargo build` 编译成功

---

## 阶段三：前端页面迁移

### 3.1 应用布局

- 左侧导航栏 90px：shadcn/ui Button + lucide-react 图标
- 右侧内容区：根据 tab 渲染页面，所有页面保持挂载保留状态
- 暗色/亮色主题：shadcn/ui 内置 `dark` class 切换

### 3.2 重命名页面

组件拆分：
- `RenamePage` — 两栏布局（shadcn/ui `ResizablePanelGroup`）
- `Toolbar` — 目录路径输入、浏览按钮、上级目录、撤销
- `FilterSection` — 过滤条件（可折叠）
- `QuickFilters` — 快捷筛选按钮组
- `RuleList` + `RuleCard` — 替换规则（可折叠卡片）
- `FilePreview` — 文件预览表格（`react-virtuoso` 虚拟滚动）
- `StatusBar` — 冲突警告、执行按钮
- `ConfirmDialog` — shadcn/ui `AlertDialog`

状态管理 (`stores/renameStore.ts`)：
- 数据：`dirPath`、`fileList`、`filterFileList`、`replaceInfos`、`conflicts`、`ruleHistory`、`displayLimit`、`status`
- UI：`filterCollapsed`、`rulesCollapsed`、`selectedFile`、`showConfirm`（React useState）

关键模式映射：
| Iced | React |
|------|-------|
| `Task::perform(list_files)` | `useEffect` + `invoke("list_files")` |
| `detect_conflicts()` 每次规则变更 | `useEffect` 监听依赖 |
| `display_limit` 分页 | `react-virtuoso` 虚拟滚动 |
| `rule_history` undo 栈 | zustand temporal 或自定义 hook |
| `pane_grid` 分栏 | `ResizablePanelGroup` |
| 确认弹窗 overlay | `AlertDialog` |

### 3.3 字符画页面

组件拆分：
- `AsciiArtPage` — 主页面
- `Toolbar` — 打开文件、粘贴
- `AsciiPreview` — 字符画预览（缩放/拖拽）
- `ControlPanel` — 滑块、下拉框
- `OutputActions` — 复制/导出

状态管理 (`stores/asciiArtStore.ts`)：
- `params: AsciiArtParams`、`imageBytes`、`output: AsciiArtOutput`、`isConverting`、`errorMessage`

关键模式映射：
| Iced | React |
|------|-------|
| 500ms debounce | `useDebounce` hook |
| `spawn_blocking(convert)` | `invoke("convert_ascii_art")` |
| `rfd::AsyncFileDialog` | `@tauri-apps/plugin-dialog` |
| `arboard::Clipboard` | `@tauri-apps/plugin-clipboard-manager` |
| `AsciiArtPreview` Widget | CSS `transform` + `dangerouslySetInnerHTML` |
| ANSI 解析 → ColoredChar | 后端返回 html_text，前端直接渲染 |

字符画渲染方案：
- 使用后端返回的 `html_text`（含 `<span style="color:...">` 标签）
- `dangerouslySetInnerHTML` 或沙盒 iframe 渲染
- 缩放：CSS `transform: scale()`
- 拖拽：CSS `transform: translate()`

### 3.4 视频抽帧页面

组件拆分：
- `VideoFramePage` — 主页面
- `VideoSelector` — 视频选择、信息展示
- `ExtractParams` — 提取参数面板
- `FrameGrid` — 帧列表网格
- `FramePreview` — 单帧预览
- `ExportPanel` — 导出操作

关键模式映射：
| Iced | React |
|------|-------|
| `spawn_blocking(extract_frames)` | `invoke("extract_frames")` |
| `progress_cb` 回调 | `listen("video-frame://progress")` |
| `image_data: Vec<u8>` IPC | 后端写入临时目录，前端 `asset://` 访问 |

### 3.5 设置页面

- 主题切换（亮色/暗色）
- shadcn/ui 表单组件

---

## 阶段四：主题与样式

### 4.1 shadcn/ui 主题

在 `globals.css` 中定义 HSL CSS 变量：

```css
:root {
  --background: 0 0% 100%;
  --card: 0 0% 100%;
  --muted: 240 4.8% 95.9%;
  --destructive: 0 84.2% 60.2%;
  --accent: 240 4.8% 95.9%;
  /* 自定义变量 */
  --toolbar: 0 0% 97%;
  --bottom-bar: 0 0% 95%;
  --panel: 0 0% 100%;
  --splitter: 220 13% 91%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --card: 222.2 84% 4.9%;
  /* ... */
}
```

### 4.2 图标迁移

- `assets/svg/` 中的 SVG 可直接作为 React 组件导入
- 或使用 lucide-react 等效图标（推荐，保持一致性）

---

## 阶段五：清理与收尾

### 5.1 移除旧代码

- 删除 `src/` 目录（Iced 代码）
- 删除根目录 `Cargo.toml`、`build.rs`、`app.rc`
- 保留 `assets/svg/`、`icon.ico`、`icon.png`

### 5.2 更新文档

- 更新 `CLAUDE.md`、`.claude/system.md`、`.claude/policy.md`、`.claude/rule.md`
- 添加 `README.md`

---

## 验证方案

| 阶段 | 验证方式 |
|------|---------|
| 阶段一 | `npm run tauri dev` 启动空白窗口 |
| 阶段二 | `cargo test` 通过 + `cargo build` 编译成功 |
| 阶段三 | 每个页面手动测试完整流程 |
| 阶段四 | 亮色/暗色主题切换正常 |
| 阶段五 | `npm run tauri build` 生成 Windows 安装包 |

### 端到端测试流程

1. **重命名**：选择目录 → 加载文件 → 快捷筛选 → 添加规则 → 预览 → 检测冲突 → 确认执行 → 验证结果
2. **字符画**：打开图片 → 调节参数 → 预览效果 → 复制到剪贴板 → 导出文件
3. **视频抽帧**：选择视频 → 查看信息 → 设置参数 → 提取帧 → 预览 → 导出

---

## 风险与注意事项

| 风险 | 应对方案 |
|------|---------|
| FFmpeg 共享库打包 | Tauri 打包时 bundled 或提示用户安装 |
| 大图片 IPC 开销 | 使用 base64 或临时文件传输 |
| 视频帧数据量大 | 后端写入临时目录，前端 asset:// 访问 |
| 字符画渲染性能 | 大量 span 时考虑 Canvas 2D |
| 前后端类型同步 | TypeScript 类型从 Rust 结构体自动生成（`tauri typegen` 或手动维护） |
