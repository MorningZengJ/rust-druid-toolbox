# 开发策略

## 构建与运行

- **构建命令**: `cargo build`
- **运行命令**: `cargo run`
- **平台**: Windows 为主（`#![windows_subsystem = "windows"]`），Iced 本身跨平台
- **构建脚本**: build.rs 使用 embed-resource 嵌入 Windows 图标，需要 app.rc 和 icon.ico 存在

## 代码规范

### 模块组织

- 每个 UI 页面/组件独立目录，mod.rs 包含实现
- 模型（model/）、主题（themes/）、工具（utils/）、UI（ui/）严格分层
- 公开接口通过 `pub(crate)` 控制可见性，不随意暴露内部模块

### 组件模式

- 新页面实现 `PageWithNav` trait（简单场景）或 `PageComponent` trait（需要完整生命周期管理）
- 消息类型定义在各页面/组件内部，通过 `MapMessage` 适配器向上传递
- 可复用组件放在 `ui/components/`，如 MButton

### 主题使用

- 使用 `themes::get_theme()` 获取语义化颜色/样式
- 颜色定义在 `themes/background.rs`、`themes/border.rs`、`themes/text.rs`
- 避免在 UI 代码中硬编码颜色值（现有代码中有部分硬编码，新代码应走主题系统）

### 命名约定

- 结构体：PascalCase（FileInfo, RenameState）
- 枚举变体：PascalCase（Message::DirPathChanged）
- 函数/方法：snake_case（load_files, preview_name）
- 模块文件：snake_case（file_info.rs, common_utils.rs）

## 依赖管理

- Cargo.lock 已被 .gitignore 忽略（桌面应用通常如此）
- 新增依赖需在 Cargo.toml 注释分类（GUI、Async、Regex、Utils 等）
- 优先使用已有的 regex 和 fancy-regex，不引入额外正则库
- anyhow 已声明但未使用，新代码可使用它进行错误处理

## 文件操作安全

- 重命名操作前应有预览（现有实现已有 preview_name）
- `std::fs::rename()` 的错误不应静默忽略（现有代码的问题，修复时应处理）
- 文件列表通过 `fs::read_dir` 获取，错误时返回空列表

## UI 开发

- Iced 使用 Elm Architecture：Model → View → Update 循环
- 异步操作使用 `Task::perform()` 配合 tokio 运行时
- 窗口默认 800x600，最小 600x400
- 左侧导航栏固定宽度 100px，右侧内容区自适应

## 测试策略

- 当前无测试（Source-backed：源码中无任何测试代码）
- 新增功能应考虑添加单元测试，特别是：
  - `RenameState::get_filter_file_list()` 的过滤逻辑
  - `preview_name()` 的替换预览逻辑
  - `CommonUtils` 的路径处理函数
  - `FileUtils::format_size()` 的格式化逻辑

## Git 规范

- 主分支：main（远程），master（本地当前分支）
- 提交信息使用英文，简洁描述变更内容
- 远程仓库：git@github.com:MorningZengJ/rust-druid-toolbox.git

## 禁止事项

- 禁止在 UI 代码中硬编码颜色，必须通过主题系统
- 禁止静默忽略文件系统错误（`let _ =` 模式）
- 禁止引入与现有功能重复的依赖
- 禁止修改 build.rs 的图标嵌入逻辑除非有充分理由
