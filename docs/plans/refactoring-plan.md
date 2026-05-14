# 项目重构计划

## 背景

代码库存在大量重复代码、硬编码值、未清理的死代码、架构层级倒置等问题。本次重构目标是：提取可复用的样式/工具函数、清理死代码、修正架构依赖、统一主题使用。

## 重构分 6 个阶段，按依赖顺序执行

---

### 阶段 1：提取主题样式辅助函数（消除最多重复）

**目标文件**：`src/themes/mod.rs`、`src/themes/text.rs`

新增样式辅助函数，供全项目复用：

```rust
// src/themes/mod.rs 或新文件 src/themes/styles.rs
impl Theme {
    pub fn secondary_text_style(&self) -> text::Style { ... }
    pub fn muted_text_style(&self) -> text::Style { ... }
    pub fn main_text_style(&self) -> text::Style { ... }
    pub fn card_container_style(&self) -> container::Style { ... }
    pub fn quick_filter_btn_style(&self, active: bool) -> button::Style { ... }
}
```

**影响**：
- `src/ui/rename/mod.rs`：替换 ~20 处重复的 text style 闭包和 4 处 filter button style
- `src/ui/rename/file_list.rs`：替换 3 处 text style
- `src/ui/rename/status_bar.rs`：替换 1 处 text style
- `src/ui/ascii_art/mod.rs`：替换 3 处硬编码 container style

---

### 阶段 2：提取工具函数（消除逻辑重复）

#### 2A. HTML 模板包装器
**文件**：`src/utils/ascii_art_engine.rs`

提取 `fn wrap_html_document(bg: &str, body: &str) -> String`，替换 3 处重复的 HTML 模板。

#### 2B. 像素迭代公共函数
**文件**：`src/utils/ascii_art_engine.rs`

提取 `fn iterate_pixels(rgba, width, height, charset, invert, formatter: Fn)` 消除 4 个 generate_* 方法中的重复循环。

#### 2C. 剪贴板复制辅助函数
**文件**：`src/ui/ascii_art/mod.rs`

提取 `fn clipboard_copy_task(content: String, format: ClipboardFormat, success_msg: &str) -> Task<Message>`，替换 3 处重复的 Copy* 处理。

#### 2D. truncated_text 合并
**文件**：`src/ui/components/truncated_text.rs`

将 `truncated_text_with_tooltip` 和 `truncated_text_muted_with_tooltip` 合并为一个参数化函数。

---

### 阶段 3：清理死代码和未使用依赖

#### 3A. 移除未使用的依赖
**文件**：`Cargo.toml`
- 移除 `anyhow = "1"`（从未使用）
- 移除 `regex = "1"`（仅 fancy_regex 被使用）

#### 3B. 移除未使用的 Message 变体
**文件**：`src/ui/rename/mod.rs`
- 移除 `#[allow(dead_code)]` 的 `Message::FileSelected` 和 `Message::FileDoubleClicked`

#### 3C. 清理 `#[allow(dead_code)]`
对每个 `#[allow(dead_code)]` 标注：
- 如果确实未使用 → 删除该代码
- 如果是公共 API 预留 → 保留但加注释说明
- 如果实际有使用 → 移除 allow 标注

涉及文件：
- `src/model/rename_result.rs` — 评估字段是否需要保留
- `src/model/rename_state.rs` — 评估 `set_dir_path`、`is_conflict_row`、`has_more_files`
- `src/ui/navigation/mod.rs` — 评估 `NavigationAction` 变体
- `src/themes/*.rs` — 评估各颜色方法

#### 3D. 移除 core 模块
**文件**：`src/core/mod.rs`、`src/main.rs`
- `ternary_operator!` 和 `ternary_operator_let!` 仅在 `c_button.rs` 使用一次
- 替换为普通 `if/else` 表达式后删除 `core` 模块

#### 3E. 移除 extern crate 语法
**文件**：`build.rs`
- `extern crate embed_resource;` → `use embed_resource;` 或直接删除（Rust 2021 不需要）

---

### 阶段 4：修正架构层级倒置

**问题**：`src/model/rename_state.rs` 导入了 `crate::ui::rename::logic`，model 层依赖了 UI 层。

**方案**：将 `src/ui/rename/logic.rs` 移动到 `src/utils/rename_logic.rs`（或 `src/model/rename_logic.rs`）。

**影响文件**：
- `src/ui/rename/logic.rs` → `src/utils/rename_logic.rs`
- `src/ui/rename/mod.rs` — 更新 import 路径
- `src/model/rename_state.rs` — 更新 import 路径
- `src/utils/mod.rs` — 添加 `pub mod rename_logic;`
- `src/ui/rename/mod.rs` — 移除 `pub mod logic;`

---

### 阶段 5：统一 ASCII Art 模块使用主题系统

**目标文件**：`src/ui/ascii_art/mod.rs`、`src/ui/ascii_art/preview.rs`

将所有硬编码颜色替换为 `get_theme()` 调用：

| 硬编码值 | 替换为 |
|----------|--------|
| `0x2D, 0x2D, 0x30` | `c_theme.card_bg()` |
| `0x3E, 0x3E, 0x42` | `c_theme.border_color()` |
| `0x1E, 0x1E, 0x1E` | `c_theme.nav_bg()` |
| `0x9C, 0xA3, 0xAF` | `c_theme.secondary_text_color()` |
| `0xEF, 0x44, 0x44` | `c_theme.error_color()` |

提取 ASCII Art 中的魔法数字为命名常量：

```rust
const MIN_WIDTH: u32 = 20;
const MAX_WIDTH: u32 = 1000;
const MIN_CONTRAST: f32 = 0.1;
const MAX_CONTRAST: f32 = 3.0;
const DEBOUNCE_MS: u64 = 500;
// ... 等
```

---

### 阶段 6：杂项修复

#### 6A. 侧边栏宽度一致性
**文件**：`src/ui/app.rs`
- `size.width - 100.0` → 使用与 `root_tab.rs` 一致的常量（90.0）

#### 6B. 硬编码 padding 替换
**文件**：`src/ui/home.rs`、`src/ui/rename/mod.rs`
- `.padding(16)` → `.padding(spacing::LG)`

#### 6C. 窗口尺寸常量
**文件**：`src/ui/app.rs`
- `Size::new(800.0, 600.0)` 出现两次，提取为常量

#### 6D. Message::ShowError 语义修正
**文件**：`src/ui/ascii_art/mod.rs`
- 成功消息（如"已复制到剪贴板"）不应使用 `ShowError`，考虑添加 `ShowNotification` 变体或重命名为 `ShowToast`

---

## 验证方案

1. `cargo build` — 确保编译通过
2. `cargo test` — 确保 8 个现有单元测试通过
3. `cargo clippy` — 检查无新 warning
4. 手动检查：确认 `#[allow(dead_code)]` 数量显著减少

## 执行顺序

按阶段 1→2→3→4→5→6 顺序执行，每阶段完成后 `cargo build` 验证。
