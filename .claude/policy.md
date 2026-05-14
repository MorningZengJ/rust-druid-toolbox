# 开发策略

## 构建与运行

- **构建命令**: `cargo build`
- **运行命令**: `cargo run`
- **测试命令**: `cargo test`
- **平台**: Windows 为主（`#![windows_subsystem = "windows"]`），Iced 本身跨平台
- **构建脚本**: build.rs 使用 embed-resource 嵌入 Windows 图标，需要 app.rc 和 icon.ico 存在

## 代码规范

### 模块组织

- 每个 UI 页面/组件独立目录，mod.rs 包含实现或重新导出
- 复杂页面可拆分为子模块（如 rename/ 拆为 mod.rs/file_list.rs/logic.rs/replace_rules.rs/status_bar.rs/spacing.rs/virtual_list.rs）
- 模型（model/）、主题（themes/）、工具（utils/）、UI（ui/）严格分层
- 公开接口通过 `pub(crate)` 控制可见性，不随意暴露内部模块

### 组件模式

- 新页面实现 `PageWithNav` trait（简单场景）或 `PageComponent` trait（需要完整生命周期管理，如 resize/subscription）
- 消息类型定义在各页面/组件内部，通过 `MapMessage` 适配器向上传递
- 可复用组件放在 `ui/components/`，如 MButton
- 子页面视图可抽取为独立函数（如 `file_list::view()`、`replace_rules::view()`、`status_bar::view()`）

### 布局模式

- **Pane Grid**：使用 Iced 的 `pane_grid` 组件实现可调整大小的面板布局（如 rename 页面的上下分栏）
- **间距常量**：布局间距统一定义在 `spacing.rs` 中（XS=4/SM=8/MD=12/LG=16/XL=24），禁止在 UI 代码中硬编码间距值
- **虚拟滚动**：大数据列表使用 VirtualList 自定义 Widget，仅渲染可见行，避免一次性渲染所有数据

### 主题使用

- 使用 `themes::get_theme()` 获取语义化颜色/样式
- 颜色定义在 `themes/background.rs`、`themes/border.rs`、`themes/text.rs`
- 避免在 UI 代码中硬编码颜色值（现有代码中有部分硬编码，新代码应走主题系统）
- 语义化颜色：toolbar_bg/bottom_bar_bg/panel_bg/splitter_bg/conflict_bg/diff_added_bg/diff_removed_bg 等

### 命名约定

- 结构体：PascalCase（FileInfo, RenameState, AsciiArtState）
- 枚举变体：PascalCase（Message::DirPathChanged, Page::AsciiArt）
- 函数/方法：snake_case（load_files, preview_name, apply_replace_rules）
- 模块文件：snake_case（file_info.rs, ascii_art_engine.rs）

## 依赖管理

- Cargo.lock 已被 .gitignore 忽略（桌面应用通常如此）
- 新增依赖需在 Cargo.toml 注释分类（GUI、Async、Regex、Utils 等）
- 优先使用已有的 regex 和 fancy-regex，不引入额外正则库
- anyhow 已声明但未使用，新代码可使用它进行错误处理

## 文件操作安全

- 重命名操作前应有预览（现有实现已有 apply_replace_rules 预览）
- `std::fs::rename()` 的错误不应静默忽略（现有实现已正确收集到 RenameResult.errors）
- 文件列表通过 `fs::read_dir` 获取，错误时返回空列表

## UI 开发

- Iced 使用 Elm Architecture：Model → View → Update 循环
- 异步操作使用 `Task::perform()` 配合 tokio 运行时
- 长时间操作使用 `tokio::task::spawn_blocking()` 避免阻塞 UI（如字符画转换）
- 参数调节使用防抖模式（500ms 延迟，abortable task）
- 窗口默认 800x600，最小 600x400
- 左侧导航标签栏固定宽度 90px，右侧内容区自适应
- 自定义 Widget 需实现 `iced::advanced::widget::Widget` trait（如 AsciiArtPreview、VirtualList）
- 虚拟滚动：VirtualState 管理滚动偏移，VirtualList 仅渲染 visible_range 范围内的行
- 冲突检测：重命名预览时自动检测文件名冲突，冲突行使用 warning 颜色高亮
- 撤销系统：规则修改自动保存历史状态，支持撤销操作

## 测试策略

- 已有测试：`src/ui/rename/logic.rs` 包含 8 个单元测试
- 新增功能应考虑添加单元测试，特别是：
  - `RenameState::get_filtered_files()` 的过滤逻辑
  - `logic::apply_replace_rules()` 的替换预览逻辑
  - `AsciiArtEngine` 的图片处理和颜色转换逻辑
  - `CommonUtils` 的路径处理函数
  - `FileUtils::format_size()` 的格式化逻辑
  - `RenameState::detect_conflicts()` 的冲突检测逻辑

## Git 规范

- 主分支：main（远程），master（本地当前分支）
- 提交信息使用英文，简洁描述变更内容
- 远程仓库：git@github.com:MorningZengJ/rust-druid-toolbox.git

## 禁止事项

- 禁止在 UI 代码中硬编码颜色，必须通过主题系统
- 禁止在 UI 代码中硬编码间距值，必须使用 spacing.rs 中的常量
- 禁止静默忽略文件系统错误（`let _ =` 模式）
- 禁止引入与现有功能重复的依赖
- 禁止修改 build.rs 的图标嵌入逻辑除非有充分理由
- 禁止一次性渲染所有文件数据，大数据列表必须使用虚拟滚动
