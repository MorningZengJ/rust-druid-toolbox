# 系统概述

## 项目身份

- **名称**: druid-toolbox（历史命名，实际使用 Iced 框架，非 Druid）
- **版本**: 0.1.0
- **语言**: Rust (edition 2021)
- **GUI 框架**: Iced 0.14（Elm Architecture 模式）
- **作者**: MorningZeng (zengchennihon@gmail.com)
- **仓库**: git@github.com:MorningZengJ/rust-druid-toolbox.git

## 用途

Windows 桌面批量文件重命名工具，中文界面。支持：
- 选择目录并列出文件
- 按关键字或正则表达式过滤文件
- 定义多条查找/替换规则（纯文本或正则）批量重命名
- 执行前实时预览重命名结果
- 浏览上级目录

## 模块边界

```
src/
  main.rs              → 入口，#![windows_subsystem = "windows"]，调用 ui::run()
  core/mod.rs          → 三元运算符宏定义
  model/               → 数据模型
    file_info.rs       → FileInfo 结构体（文件元数据）
    rename_state.rs    → RenameState（重命名页状态，过滤逻辑）
    replace_info.rs    → ReplaceInfo（单条替换规则）
  themes/              → 主题系统
    mod.rs             → Theme 枚举 (Light/Dark)，get_theme() 工厂函数
    background.rs      → 背景色定义
    border.rs          → 边框样式定义
    text.rs            → 文本颜色定义
  ui/                  → UI 层
    mod.rs             → PageWithNav trait，run() 函数
    app.rs             → 顶层 Iced 应用（App, Message, 窗口配置 800x600）
    home.rs            → 首页，左侧标签栏 + 右侧内容区
    components/        → 可复用组件
      c_button.rs      → MButton 组件（PrimaryNav/ContentBtn/Primary/Success 四种变体）
    navigation/        → 导航系统
      mod.rs           → PageComponent trait, MapMessage 适配器, NavigationAction 枚举
      route_page.rs    → RoutePage 枚举 (Home, Settings)
      stack_navigator.rs → StackNavigator（push/pop/replace/pop_to_root）
    rename/mod.rs      → 重命名页面（核心功能，444 行）
    settings/mod.rs    → 设置页（占位符）
    tabs/root_tab.rs   → 左侧导航标签栏
  utils/               → 工具函数
    common_utils.rs    → CommonUtils: parent_path(), join_path()
    file_utils.rs      → FileUtils: list_files(), format_size()
```

## 核心架构

### 导航系统（自定义栈式导航）

- `PageComponent<Message>` trait：标准组件接口（init/update/view/resize/subscription）
- `StackNavigator<Message, RoutePage>`：页面栈管理
- `MapMessage` 适配器：父子组件消息类型转换，通过 `PageComponentExt::map_msg()` 使用
- `PageWithNav` trait：简化版组件接口（reload/update/view），Rename 页面使用

### 消息流

1. `App::boot()` 初始化 StackNavigator，起始路由为 Home
2. 用户交互 → `Message` → `App::update()` → 路由分发
3. 子组件消息通过 `MapMessage` 适配后向上传递
4. `NavigationAction` (Push/Pop/Replace/PopToRoot) 驱动页面切换

### 重命名流程

1. 用户选择/输入目录路径 → `FileUtils::list_files()` 异步加载文件列表
2. 可选过滤（纯文本包含或正则匹配）
3. 用户添加多条替换规则（每条含 content/target/enable/is_regex）
4. 预览：`preview_name()` 对文件名逐条应用启用的规则
5. 执行：遍历 `filter_file_list`，对每个文件应用所有启用规则后调用 `std::fs::rename()`

## 依赖关系

| 依赖 | 用途 |
|------|------|
| iced 0.14 | GUI 框架（tokio/image/svg/advanced features） |
| rfd 0.16 | 原生文件夹选择对话框 |
| tokio 1 | 异步运行时（rt-multi-thread/macros） |
| regex 1 | 正则表达式 |
| fancy-regex 0.13 | 支持前瞻/后顾的正则 |
| uuid 1 | 替换规则唯一 ID（v4） |
| anyhow 1 | 错误处理（已声明但源码中未实际使用） |
| embed-resource 2.5.0 | 构建依赖，编译 Windows .rc 文件嵌入图标 |

## 构建产物

- `build.rs`：使用 embed-resource 编译 `app.rc` 嵌入 `icon.ico` 为 Windows 应用图标
- `app.rc`：`IDI_ICON1 ICON "icon.ico"`
- 输出：Windows 可执行文件（target/ 目录）

## 已知风险

- **无测试**：源码中无任何 `#[test]` 或 `#[cfg(test)]`
- **无 CI/CD**：无 GitHub Actions、Makefile 或其他自动化构建配置
- **anyhow 未使用**：Cargo.toml 声明了 anyhow 依赖但源码中未实际使用
- **重命名无错误处理**：`ExecuteRename` 中 `std::fs::rename()` 的错误被静默忽略（`let _ =`）
- **硬编码颜色**：rename/mod.rs 中部分颜色值直接硬编码（如 `0x2A, 0x2A, 0x2E`），未走主题系统
- **项目名称误导**：包名 druid-toolbox 实际使用 Iced 框架
