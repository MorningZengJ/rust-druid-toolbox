# 字符画功能重构计划

## Context

当前字符画功能存在以下问题：
- 左侧栏包含图片预览和"打开图片"按钮，布局不合理
- 右侧栏使用 `dangerouslySetInnerHTML` 渲染 HTML `<span>` 标签，性能差且不直观
- 导出功能未实现（仅复制到剪贴板）
- 图片加载需通过按钮打开文件对话框，不支持拖拽和粘贴

用户希望重构为：
- 左侧仅保留参数控制面板（含渲染模式选择）
- 右侧栏添加 Tab（原图 / 字符画），支持双击选择图片、拖拽图片、Ctrl+V 粘贴图片
- 渲染模式可选：PNG（快速）/ SVG（矢量）/ Canvas（灵活）
- 导出支持多种格式（PNG / SVG / TXT / HTML）

## 实现方案

### 1. Rust 后端：新增图片生成能力

**修改文件：** `src-tauri/src/model/ascii_art_state.rs`

新增渲染模式枚举和更新输出结构体：
```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum RenderMode {
    Png,    // 快速，Rust 生成 PNG 图片
    Svg,    // 矢量，无损缩放
    Canvas, // 灵活，返回字符+颜色数据供前端 Canvas 绘制
}

pub struct AsciiArtOutput {
    pub plain_text: String,
    pub ansi_text: String,
    pub image_data: Vec<u8>,           // PNG 模式：PNG 字节
    pub svg_data: String,              // SVG 模式：SVG XML 字符串
    pub char_colors: Vec<CharColor>,   // Canvas 模式：字符+颜色网格
}

pub struct CharColor {
    pub char: char,
    pub r: u8, pub g: u8, pub b: u8,
}
```

**修改文件：** `src-tauri/src/utils/ascii_art_engine.rs`

根据 `render_mode` 参数分发到不同生成方法：
- `generate_png`：使用 `image` crate 渲染为 PNG 字节（每字符 8x12 像素色块）
- `generate_svg`：生成 SVG XML（每个字符作为 `<text>` 元素，带 fill 颜色）
- `generate_canvas_data`：返回 `Vec<CharColor>` 网格数据

**宽度范围调整：**
- `AsciiArtParams.width` 范围从 20~300 改为 300~2000
- Rust 端 `resize_image` 函数无需修改（已支持任意宽度）
- 高度计算公式：`height = width * (orig_h / orig_w) * char_aspect_ratio`

**新增导出命令：** `src-tauri/src/commands/ascii_art.rs`
- `export_ascii_art(params, image_bytes, format, path)` - 支持 png/svg/txt/html 四种格式
- 导出格式与渲染模式独立：无论预览用什么模式，导出时可选择任意格式
- PNG：调用 generate_png 生成图片写入文件
- SVG：调用 generate_svg 生成 SVG 写入文件
- TXT：写入 plain_text
- HTML：生成完整的 HTML 文档（类似现有 wrap_html_document 逻辑）

### 2. 前端：重构页面布局

**修改文件：** `frontend/src/pages/ascii-art/AsciiArtPage.tsx`

**左侧栏（参数面板）：**
- 移除图片预览和"打开图片"按钮
- 宽度滑块范围改为 300~2000（步长 10），默认值 800
- 保留所有参数控件（宽度/字符集/对比度/亮度/饱和度/宽高比/反色/颜色模式/背景）
- 新增"渲染模式"选择器（PNG / SVG / Canvas），带说明文字：
  - PNG：快速，适合大图
  - SVG：矢量，缩放不失真
  - Canvas：灵活，支持交互
- 左侧面板添加垂直滚动条，仅在内容超出时显示（`overflow-y: auto`）

**右侧栏（显示区域）：**
- 顶部工具栏：Tab 切换（原图 / 字符画）+ 导出按钮（下拉菜单选格式）+ 复制按钮
- 显示区域无滚动条（`overflow: hidden`），内容通过 transform 缩放和平移
- 鼠标滚轮缩放：`onWheel` 事件，`deltaY < 0` 放大，`deltaY > 0` 缩小，缩放中心为鼠标位置
- 右键拖拽平移：`onMouseDown` (button=2) 开始拖拽，`onMouseMove` 更新 panX/panY，`onMouseUp` 结束
- Tab 1 "原图"：显示用户选择的原图（blob URL），支持双击选择、拖拽、Ctrl+V 粘贴
- Tab 2 "字符画"：根据渲染模式显示：
  - PNG 模式：`<img src={blobUrl}>` 显示 Rust 返回的 PNG 图片
  - SVG 模式：`<img src="data:image/svg+xml,...">` 显示 SVG
  - Canvas 模式：`<canvas>` 元素，逐字符绘制（每字符一个色块，颜色取自 charColors）

### 3. 前端：图片加载方式重构

**修改文件：** `frontend/src/stores/asciiArtStore.ts`

移除 `loadImage()`（原文件对话框方式），新增三种加载方式：

- `loadImageFromFile()` - 双击原图区域时调用，打开文件对话框
- `loadImageFromDrop(file: File)` - 拖拽文件时调用
- `loadImageFromPaste(imageData: ArrayBuffer)` - Ctrl+V 粘贴时调用

三种方式统一走 `loadImageFromBytes(bytes)` → `convert()` 流程。

**新增导出 action：**
- `exportOutput(format: 'png' | 'svg' | 'txt' | 'html')` - 调用 Rust 命令写入文件

**更新 `AsciiArtParams`：**
- 新增 `renderMode: RenderMode` 字段（默认 "png"）

**500ms 防抖机制：**
- `setParams()` 中参数变更时不立即调用 `convert()`
- 使用 `setTimeout` 延迟 500ms 才执行 `convert()`
- 每次参数变更时 `clearTimeout` 重置计时器
- 连续快速调节滑块时，只在停止调节 500ms 后才触发一次转换
- 加载图片（双击/拖拽/粘贴）立即触发转换，不走防抖

### 4. 前端：右侧栏交互

**双击选择图片：**
- 在"原图" Tab 的显示区域绑定 `onDoubleClick` 事件
- 调用 `@tauri-apps/plugin-dialog` 的 `open()` 打开文件选择器

**拖拽图片：**
- 绑定 `onDragOver` + `onDrop` 事件
- 读取 `dataTransfer.files[0]`，转为 ArrayBuffer 后调用 `loadImageFromDrop`

**Ctrl+V 粘贴：**
- 在页面级别绑定 `onPaste` 事件
- 从 `clipboardData.items` 中查找 `image/*` 类型
- 读取为 ArrayBuffer 后调用 `loadImageFromPaste`

**鼠标滚轮缩放：**
- 绑定 `onWheel` 事件到显示区域
- `deltaY < 0` 放大（zoom * 1.1），`deltaY > 0` 缩小（zoom / 1.1）
- 缩放范围限制 [0.1, 10]
- 缩放中心为鼠标位置（调整 panX/panY 保持鼠标下内容不动）

**右键拖拽平移：**
- `onMouseDown` (button=2)：记录起始坐标，设置 dragging=true
- `onMouseMove`：计算偏移量，更新 panX/panY
- `onMouseUp` (button=2)：设置 dragging=false
- `onContextMenu`：`preventDefault()` 禁用右键菜单

## 修改文件列表

| 文件 | 操作 | 说明 |
|------|------|------|
| `src-tauri/src/model/ascii_art_state.rs` | 修改 | 新增 RenderMode/CharColor，更新 AsciiArtOutput |
| `src-tauri/src/utils/ascii_art_engine.rs` | 修改 | 新增 generate_png/svg/canvas_data 方法 |
| `src-tauri/src/commands/ascii_art.rs` | 修改 | 新增 export_ascii_art 命令 |
| `src-tauri/src/lib.rs` | 修改 | 注册新命令 |
| `frontend/src/types/index.ts` | 修改 | 新增 RenderMode/CharColor，更新 AsciiArtOutput |
| `frontend/src/stores/asciiArtStore.ts` | 修改 | 重构图片加载和导出逻辑 |
| `frontend/src/pages/ascii-art/AsciiArtPage.tsx` | 重写 | 新布局 + Tab + 渲染模式选择 + 交互 |

## 验证方式

1. `cargo check --manifest-path src-tauri/Cargo.toml` - Rust 编译通过
2. `cd frontend && npm run build` - 前端编译通过
3. `npm run tauri dev` 手动验证：
   - 双击右侧原图区域可选择图片
   - 拖拽图片到原图区域可加载
   - Ctrl+V 粘贴剪贴板中的图片可加载
   - 切换 Tab 显示原图 / 字符画
   - 切换渲染模式（PNG/SVG/Canvas）正确显示
   - 宽度滑块范围 300~2000，快速调节时有 500ms 防抖
   - 鼠标滚轮可缩放显示区域
   - 右键拖拽可平移显示区域
   - 左侧面板内容超出时显示滚动条
   - 导出 PNG/SVG/TXT/HTML 各格式正常
