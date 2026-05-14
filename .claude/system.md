# 系统概述

## 项目身份

- **名称**: druid-toolbox（历史命名，实际使用 Iced 框架，非 Druid）
- **版本**: 0.1.0
- **语言**: Rust (edition 2021)
- **GUI 框架**: Iced 0.14（Elm Architecture 模式）
- **作者**: MorningZeng (zengchennihon@gmail.com)
- **仓库**: git@github.com:MorningZengJ/rust-druid-toolbox.git

## 用途

Windows 桌面工具箱应用，中文界面。包含两个主要功能模块：

1. **批量文件重命名**：选择目录、过滤文件、定义替换规则、预览并执行重命名
2. **字符画生成**：将图片转换为 ASCII 字符画，支持多种颜色模式和参数调节

## 模块边界

```
src/
  main.rs              → 入口，#![windows_subsystem = "windows"]，调用 ui::run()
  core/mod.rs          → ternary_operator! / ternary_operator_let! 宏
  model/               → 数据模型
    file_info.rs       → FileInfo 结构体（文件元数据：name/path/parent_path/is_dir/extension/size/created_time/modified_time）
    rename_state.rs    → RenameState（重命名页状态）、FilterItem（过滤条件）、ConflictInfo（冲突信息）
    replace_info.rs    → ReplaceInfo（单条替换规则：id/content/target/enable/is_regex/is_error）
    rename_result.rs   → RenameResult（重命名结果：total/success/errors）、RenameError
    rule_template.rs   → RuleTemplate 枚举（AddPrefixNumber/AddSuffixNumber/SpaceToUnderscore/ToLowercase/RemoveDigitsBeforeExt/Custom），含 to_replace_info() 和 display_name()
    ascii_art_state.rs → AsciiArtState（字符画状态）、CharsetPreset、ColorMode、Background 枚举
  themes/              → 主题系统
    mod.rs             → Theme 枚举 (Light/Dark)，get_theme() 工厂函数
    background.rs      → 背景色定义（nav_bg/main_bg/card_bg/header_bg/border_color/table_header_bg/selected_row_bg/status_success_bg/status_error_bg/accent_color/success_color/warning_color/error_color/diff_added_bg/diff_removed_bg/conflict_bg/toolbar_bg/bottom_bar_bg/panel_bg/splitter_bg/splitter_hover_bg）
    border.rs          → 边框样式定义
    text.rs            → 文本颜色定义（main_text_color/secondary_text_color/muted_text_color/diff_added_text_color/diff_removed_text_color）
  ui/                  → UI 层
    mod.rs             → PageWithNav trait，run() 函数
    app.rs             → 顶层 Iced 应用（App, Message, 窗口配置 800x600，最小 600x400）
    home.rs            → 首页，左侧标签栏 + 右侧内容区，包含 Rename/AsciiArt 两个子页面
    components/        → 可复用组件
      c_button.rs      → MButton 组件（PrimaryNav/ContentBtn/Primary/Success 四种变体），支持 svg_btn/svg_text_btn/text_btn
      mod.rs           → comeback_view() 辅助函数
    navigation/        → 导航系统
      mod.rs           → PageComponent trait, MapMessage 适配器, PageComponentExt trait, NavigationAction 枚举 (Push/Replace/Pop/PopToRoot)
      route_page.rs    → RoutePage 枚举 (Home, Settings)
      stack_navigator.rs → StackNavigator（push/pop/replace/pop_to_root）
    rename/            → 重命名页面（拆分为子模块）
      mod.rs           → Rename 组件（PageWithNav trait），Message 枚举，Pane Grid 布局（Rules/Preview 两面板）
      file_list.rs     → 文件列表视图（含预览列、diff 高亮、选择、双击交互、虚拟滚动、加载更多）
      logic.rs         → apply_replace_rules() 替换逻辑、validate_regex() 验证，含单元测试
      replace_rules.rs → 替换规则列表视图（含正则/启用切换、可折叠卡片）
      status_bar.rs    → 重命名结果状态栏（冲突警告、成功/失败提示）
      spacing.rs       → 布局常量（XS/SM/MD/LG/XL/TOOLBAR_H/BOTTOM_BAR_H/LEFT_PANEL_RATIO/LEFT_PANEL_MIN/PANE_RESIZE_LEEWAY/CARD_RADIUS/ROW_H/DISPLAY_LIMIT）
      virtual_list.rs  → VirtualList 自定义 Widget（虚拟滚动列表，仅渲染可见行）和 VirtualState
    ascii_art/         → 字符画页面
      mod.rs           → AsciiArt 组件（PageWithNav trait），Message 枚举，参数控制面板
      preview.rs       → AsciiArtPreview 自定义 Widget（支持缩放/拖拽/居中），ColoredChar/PreviewState/ColorSpan
    settings/mod.rs    → 设置页（占位符，仅显示文本）
    tabs/
      root_tab.rs      → 左侧导航标签栏（Page 枚举：Rename/AsciiArt/Settings）
      mod.rs           → 模块声明
  utils/               → 工具函数
    common_utils.rs    → CommonUtils: parent_path(), join_path()
    file_utils.rs      → FileUtils: list_files(), format_size()
    ascii_art_engine.rs → AsciiArtEngine: convert() 主入口，支持 Monochrome/Ansi256/TrueColor/Html 四种输出模式，含 resize/adjust/charset/亮度映射/ANSI-256色转换/HTML转义等

docs/
  ascii-art-plan.md    → 字符画功能企划书（设计文档，非代码）
```

## 核心架构

### 导航系统（自定义栈式导航）

- `PageComponent<Message>` trait：标准组件接口（init/update/view/resize/subscription）
- `StackNavigator<Message, RoutePage>`：页面栈管理
- `MapMessage` 适配器：父子组件消息类型转换，通过 `PageComponentExt::map_msg()` 使用
- `PageWithNav` trait：简化版组件接口（reload/update/view），Rename 和 AsciiArt 页面使用

### 消息流

1. `App::boot()` 初始化 StackNavigator，起始路由为 Home
2. 用户交互 → `Message` → `App::update()` → 路由分发
3. Home 页面通过标签栏切换 Rename/AsciiArt 子页面
4. 子组件消息通过 `MapMessage` 适配后向上传递
5. `NavigationAction` (Push/Pop/Replace/PopToRoot) 驱动页面切换

### 重命名流程

1. 用户选择/输入目录路径 → `FileUtils::list_files()` 异步加载文件列表
2. 可选过滤（多条过滤条件，支持纯文本包含或正则匹配，可折叠）
3. 用户添加多条替换规则（每条含 content/target/enable/is_regex），支持模板快速添加，规则卡片可折叠
4. 预览：`logic::apply_replace_rules()` 对文件名逐条应用启用的规则，文件列表实时显示预览，差异部分高亮显示
5. 冲突检测：`RenameState::detect_conflicts()` 检测重命名后文件名冲突，冲突行高亮显示
6. 撤销系统：规则修改自动保存历史，支持撤销操作（最多 50 步）
7. 确认弹窗 → 执行：遍历 `filter_file_list`，对每个文件应用所有启用规则后调用 `std::fs::rename()`，返回 RenameResult

### 文件列表

- **虚拟滚动**：VirtualList 自定义 Widget，仅渲染可见行，通过 VirtualState 管理滚动偏移和可见范围
- **分页加载**：默认显示 500 条（DISPLAY_LIMIT），超出时显示"加载更多"按钮
- **diff 高亮**：重命名预览列使用 diff_segments() 计算共同前缀/后缀，高亮差异部分
- **交互**：单击选中文件，双击目录进入、双击文件用系统默认程序打开

### 布局系统

- **Pane Grid**：重命名页面使用 Iced 的 pane_grid 组件，上半部分为规则面板，下半部分为文件预览面板，支持拖拽调整大小
- **间距常量**：spacing.rs 定义统一的布局常量（XS=4/SM=8/MD=12/LG=16/XL=24），各组件引用这些常量而非硬编码
- **主题颜色**：toolbar_bg/bottom_bar_bg/panel_bg/splitter_bg/conflict_bg/diff_added_bg/diff_removed_bg 等语义化颜色

### 字符画流程

1. 用户打开图片文件或从剪贴板粘贴 → 解码为 DynamicImage
2. 调节参数（宽度/字符集/对比度/亮度/饱和度/颜色模式/背景色/宽高比），带 500ms 防抖
3. `AsciiArtEngine::convert()` 异步转换（通过 `tokio::task::spawn_blocking`）
4. 输出三种格式：plain_text / html_text / ansi_text
5. AsciiArtPreview 自定义 Widget 渲染彩色字符画，支持鼠标滚轮缩放和拖拽平移
6. 支持复制到剪贴板（纯文本/HTML/ANSI），导出功能待实现

## 依赖关系

| 依赖 | 用途 |
|------|------|
| iced 0.14 | GUI 框架（tokio/image/svg/advanced features） |
| rfd 0.16 | 原生文件夹/文件选择对话框 |
| tokio 1 | 异步运行时（rt-multi-thread/macros） |
| regex 1 | 正则表达式 |
| fancy-regex 0.13 | 支持前瞻/后顾的正则（用于重命名规则验证和应用） |
| image 0.25 | 图片处理（字符画：解码/缩放/像素操作） |
| arboard 3 | 剪贴板操作（字符画：读取图片/写入文本和 HTML） |
| uuid 1 | 替换规则唯一 ID（v4） |
| anyhow 1 | 错误处理（已声明但源码中未实际使用） |
| embed-resource 2.5.0 | 构建依赖，编译 Windows .rc 文件嵌入图标 |

## 构建产物

- `build.rs`：使用 embed-resource 编译 `app.rc` 嵌入 `icon.ico` 为 Windows 应用图标
- `app.rc`：`IDI_ICON1 ICON "icon.ico"`
- 输出：Windows 可执行文件（target/ 目录）
- `assets/svg/`：UI 图标资源（folder_open/border_color/image/settings/delete_outline/arrow_circle_up/playlist_add/playlist_add_check/share/tune/video_file 等）

## 测试

- `src/ui/rename/logic.rs` 包含 8 个单元测试：纯文本替换、正则替换、禁用规则、多规则链式替换、无匹配、空规则、正则验证有效/无效
- 其他模块无测试

## 已知风险

- **测试覆盖不足**：仅 logic.rs 有单元测试，其他模块无测试
- **无 CI/CD**：无 GitHub Actions、Makefile 或其他自动化构建配置
- **anyhow 未使用**：Cargo.toml 声明了 anyhow 依赖但源码中未实际使用
- **硬编码颜色**：ascii_art/mod.rs 和 ascii_art/preview.rs 中部分颜色值直接硬编码（如 `0x2A, 0x2A, 0x2E`），未走主题系统
- **项目名称误导**：包名 druid-toolbox 实际使用 Iced 框架
- **unsafe 代码**：preview.rs 中 `center_in_viewport` 使用 `unsafe` 通过共享引用修改 `needs_center`（Cell 模式），存在 Soundness 风险
- **导出功能未完成**：字符画的 ExportText/ExportHtml 消息处理中返回 "导出功能待实现" 错误提示
- **settings 页为空壳**：Settings 页面仅显示占位文本
- **AGENTS.md 引用错误路径**：AGENTS.md 引用 `.Codex/` 路径而非 `.claude/`，与实际目录不一致
