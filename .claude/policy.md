# 开发策略

## 构建与运行

- **Tauri 开发**: `npm run tauri dev`（项目根目录）
- **前端构建**: `cd frontend && npm run build`
- **Tauri 构建**: `cd frontend && npm run tauri build`
- **Rust 检查**: `cargo check --manifest-path src-tauri/Cargo.toml`
- **Rust 测试**: `cargo test --manifest-path src-tauri/Cargo.toml`
- **FFmpeg 编译检查**: `cargo check --manifest-path src-tauri/Cargo.toml --features video-frame`
- **平台**: Windows 为主（`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`）

## 代码规范

### 前端（React 19 + TypeScript）

- **组件**: 函数组件 + hooks，文件名 PascalCase（RenamePage.tsx）
- **状态管理**: Zustand store（v5），每个页面独立 store，不使用 React Context
- **样式**: Tailwind CSS v4 + shadcn/ui，不写自定义 CSS
- **类型**: 所有 IPC 数据结构必须在 `types/index.ts` 中定义，匹配 Rust serde 结构
- **路径别名**: `@/` 指向 `frontend/src/`
- **图标**: 使用 lucide-react，不使用自定义 SVG
- **页面切换**: App.tsx 通过 display 属性切换页面（非路由），新增页面需在 App.tsx 中注册

### 后端（Rust + Tauri）

- **模块组织**: commands/（Tauri 命令）、model/（数据模型）、utils/（工具函数）
- **命名约定**: 结构体 PascalCase，函数 snake_case，文件 snake_case
- **IPC 模型**: 所有跨 IPC 结构必须 derive Serialize + Deserialize + `#[serde(rename_all = "camelCase")]`
- **异步命令**: CPU 密集操作使用 `tokio::task::spawn_blocking`
- **错误处理**: Tauri 命令返回 `Result<T, String>` 或直接返回值
- **条件编译**: 视频帧功能通过 `#[cfg(feature = "video-frame")]` 控制，相关模块（commands/video_frame、model/video_frame_state、utils/video_frame_engine）均需 feature gate

### shadcn/ui 组件

- 组件放在 `frontend/src/components/ui/`
- 使用 `npx shadcn@latest add <component>` 添加新组件
- 不修改 shadcn/ui 生成的组件源码
- 自定义组件放在 `frontend/src/components/`（非 ui/ 子目录）

## 文件操作安全

- 重命名操作前必须有预览和确认弹窗
- `std::fs::rename()` 错误收集到 RenameResult.errors，不静默忽略
- 文件列表通过 `fs::read_dir` 获取，错误返回空列表

## 测试策略

- **Rust**: `cargo test`，保留 rename_logic.rs 的 8 个单元测试
- **前端**: 暂无测试框架，手动验证关键交互流程
- **端到端**: `npm run tauri dev` 手动验证所有功能

## Git 规范

- 主分支：main（远程），master（本地当前分支）
- 提交信息使用中文，简洁描述变更内容
- 远程仓库：git@github.com:MorningZengJ/rust-druid-toolbox.git

## 禁止事项

- 禁止在前端写自定义 CSS（使用 Tailwind + shadcn/ui）
- 禁止修改 shadcn/ui 生成的组件源码
- 禁止在 Rust 中使用 `unwrap()`（Tauri 命令中）
- 禁止引入与现有功能重复的依赖
- 禁止静默忽略文件系统错误（如 `let _ = fs::rename(...)`）
- 禁止新增路由库（当前使用 display 切换，无路由需求）
