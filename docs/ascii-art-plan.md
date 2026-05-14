# 字符画功能企划书

## 一、功能概述

将图片转换为字符画，支持单色和彩色两种模式，提供丰富的参数调节，支持预览、导出和复制到剪贴板。

---

## 二、核心功能

### 2.1 输入方式
- **本地文件**：支持 JPG、PNG、BMP、GIF、WEBP 等常见格式
- **剪贴板**：直接粘贴剪贴板中的图片（Ctrl+V）

### 2.2 输出模式

#### 单色模式
- 使用灰度字符集表示图片亮度
- 默认字符集（从暗到亮）：` .:-=+*#%@`
- 可选字符集：
  - 简单：`.:-=+*#%@`
  - 标准：` .,:;i1tfLCG08@`
  - 复杂：`@%#*+=-:. `
  - 自定义：用户输入

#### 彩色模式
- **ANSI 终端颜色**：使用 ANSI 256 色或 24 位真彩色转义码
- **HTML 颜色**：使用 `<span style="color:#RRGGBB">` 标签
- **纯文本彩色**：使用 Unicode 方块字符（█▓▒░）组合

### 2.3 参数调节

| 参数 | 范围 | 默认值 | 说明 |
|------|------|--------|------|
| 输出宽度 | 20-500 字符 | 80 | 字符画宽度，高度自动计算 |
| 字符集 | 预设/自定义 | 标准 | 选择亮度映射字符集 |
| 对比度 | 0.1-3.0 | 1.0 | 调整图片对比度 |
| 亮度 | -1.0~1.0 | 0.0 | 调整图片亮度 |
| 饱和度 | 0.0-2.0 | 1.0 | 彩色模式下的饱和度 |
| 反转亮度 | 开/关 | 关 | 反转字符映射方向 |
| 背景色 | 黑/白/透明 | 黑 | 彩色模式的背景色 |
| 字符宽高比 | 0.5-2.0 | 0.5 | 补偿字符宽高比差异 |

### 2.4 输出方式
- **应用内预览**：实时显示字符画效果，支持缩放
- **导出文本文件**：保存为 .txt（单色）或 .html（彩色）
- **复制到剪贴板**：一键复制，支持纯文本和 HTML 格式

---

## 三、UI 设计

### 3.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  [工具栏]  [打开图片] [粘贴剪贴板] [导出] [复制]           │
├───────────────────────┬─────────────────────────────────────┤
│                       │                                     │
│    原图预览区         │         字符画预览区                │
│    (可缩放)           │         (可滚动)                    │
│                       │                                     │
├───────────────────────┴─────────────────────────────────────┤
│  [参数调节面板]                                              │
│  宽度: [====80====]  字符集: [标准 ▼]                       │
│  对比度: [====1.0====]  亮度: [====0.0====]                 │
│  饱和度: [====1.0====]  [☐ 反转] [☐ 彩色模式]              │
│  背景色: [黑 ▼]  宽高比: [====0.5====]                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 交互流程

1. **打开图片**：点击按钮或拖拽图片到窗口
2. **调节参数**：拖动滑块实时预览效果
3. **切换模式**：勾选"彩色模式"切换显示
4. **导出/复制**：选择输出格式并执行

---

## 四、技术实现

### 4.1 模块架构

```
src/
  model/
    ascii_art_state.rs    // 字符画状态和参数
  ui/
    ascii_art/
      mod.rs              // 字符画页面主模块
      image_panel.rs      // 原图预览面板
      preview_panel.rs    // 字符画预览面板
      controls.rs         // 参数控制面板
  utils/
    ascii_art_engine.rs   // 字符画转换引擎
    image_processor.rs    // 图片处理工具
```

### 4.2 核心算法

#### 图片缩放
```rust
// 考虑字符宽高比（字符通常是高度大于宽度）
let aspect_ratio = 0.5; // 字符宽高比
let new_width = target_width;
let new_height = (original_height as f64 / original_width as f64 
                  * target_width as f64 
                  * aspect_ratio) as u32;
```

#### 亮度计算
```rust
// 使用感知亮度公式
fn perceived_brightness(r: u8, g: u8, b: u8) -> f64 {
    (0.299 * r as f64 + 0.587 * g as f64 + 0.114 * b as f64) / 255.0
}
```

#### 字符映射
```rust
fn brightness_to_char(brightness: f64, charset: &[char]) -> char {
    let index = (brightness * (charset.len() - 1) as f64).round() as usize;
    charset[index.min(charset.len() - 1)]
}
```

#### ANSI 颜色码生成
```rust
fn ansi_color(r: u8, g: u8, b: u8) -> String {
    format!("\x1b[38;2;{};{};{}m", r, g, b)
}
```

#### HTML 颜色标签生成
```rust
fn html_color(r: u8, g: u8, b: u8, ch: char) -> String {
    format!("<span style=\"color:#{:02X}{:02X}{:02X}\">{}</span>", r, g, b, ch)
}
```

### 4.3 数据结构

```rust
#[derive(Debug, Clone)]
pub struct AsciiArtState {
    // 图片数据
    pub original_image: Option<DynamicImage>,
    pub processed_image: Option<RgbaImage>,
    
    // 参数
    pub width: u32,              // 输出宽度
    pub charset: CharsetPreset,  // 字符集预设
    pub custom_charset: String,  // 自定义字符集
    pub contrast: f64,           // 对比度
    pub brightness: f64,         // 亮度
    pub saturation: f64,         // 饱和度
    pub invert: bool,            // 反转亮度
    pub color_mode: ColorMode,   // 颜色模式
    pub background: Background,  // 背景色
    pub char_aspect_ratio: f64,  // 字符宽高比
    
    // 输出
    pub ascii_text: String,      // 纯文本字符画
    pub colored_text: String,    // 彩色字符画（HTML）
    pub ansi_text: String,       // ANSI 彩色字符画
}

#[derive(Debug, Clone)]
pub enum CharsetPreset {
    Simple,    // .:-=+*#%@
    Standard,  // " .,:;i1tfLCG08@"
    Complex,   // @%#*+=-:. 
    Custom,    // 用户自定义
}

#[derive(Debug, Clone)]
pub enum ColorMode {
    Monochrome,  // 单色
    Ansi256,     // ANSI 256 色
    TrueColor,   // 24 位真彩色
    Html,        // HTML 颜色标签
}

#[derive(Debug, Clone)]
pub enum Background {
    Black,
    White,
    Transparent,
}
```

### 4.4 消息定义

```rust
#[derive(Debug, Clone)]
pub enum Message {
    // 图片输入
    OpenFile,
    PasteFromClipboard,
    ImageLoaded(Result<Vec<u8>, String>),
    
    // 参数调节
    WidthChanged(u32),
    CharsetChanged(CharsetPreset),
    CustomCharsetChanged(String),
    ContrastChanged(f64),
    BrightnessChanged(f64),
    SaturationChanged(f64),
    InvertToggled(bool),
    ColorModeChanged(ColorMode),
    BackgroundChanged(Background),
    AspectRatioChanged(f64),
    
    // 输出操作
    ExportText,
    ExportHtml,
    CopyText,
    CopyHtml,
    CopyAnsi,
    
    // 内部
    ConvertComplete(AsciiArtResult),
}
```

---

## 五、依赖项

```toml
[dependencies]
# 现有依赖保持不变
# 新增：
arboard = "3"          # 剪贴板操作（支持图片和文本）
```

---

## 六、开发计划

### 第一阶段：基础框架（2-3天）
- [ ] 创建 `ascii_art_state.rs` 数据模型
- [ ] 创建 `ascii_art_engine.rs` 转换引擎
- [ ] 实现基础的单色字符画转换
- [ ] 创建 UI 页面框架

### 第二阶段：参数调节（1-2天）
- [ ] 实现所有参数滑块和控件
- [ ] 实现实时预览更新
- [ ] 实现图片缩放和预览

### 第三阶段：彩色模式（1-2天）
- [ ] 实现 ANSI 颜色输出
- [ ] 实现 HTML 颜色输出
- [ ] 实现背景色选择

### 第四阶段：输入输出（1天）
- [ ] 实现本地文件打开
- [ ] 实现剪贴板粘贴
- [ ] 实现导出 TXT/HTML
- [ ] 实现复制到剪贴板

### 第五阶段：优化完善（1天）
- [ ] 性能优化（大图片异步处理）
- [ ] UI 细节调整
- [ ] 测试和修复

**预计总工时：6-9天**

---

## 七、效果预览

### 单色字符画示例
```
                 ....:::::;;;;;;:::::....
             ..::;;;iiitttfffLLLffftttii;;;::..
          ..::;itffLCGG0088888800GGCLLfti;::..
        ..:;tfLCG088@@@@@@@@@@@@@@880GCLft;:..
       ..:ifLC08@@@@@@@@@@@@@@@@@@@@@@80CLfi:..
      ..:itfCG0@@@@@@@@@@@@@@@@@@@@@@@@0GCfti:..
      .:;tfL0@@@@@@@@@@@@@@@@@@@@@@@@@@@0Lft;:.
      .:;tfL0@@@@@@@@@@@@@@@@@@@@@@@@@@@0Lft;:.
      ..:itfCG0@@@@@@@@@@@@@@@@@@@@@@@@0GCfti:..
       ..:ifLC08@@@@@@@@@@@@@@@@@@@@@@80CLfi:..
        ..:;tfLCG088@@@@@@@@@@@@@@880GCLft;:..
          ..::;itffLCGG0088888800GGCLLfti;::..
             ..::;;;iiitttfffLLLffftttii;;;::..
                 ....:::::;;;;;;:::::....
```

### 彩色字符画示例（HTML）
```html
<span style="color:#FF6B6B">█</span><span style="color:#4ECDC4">▓</span><span style="color:#45B7D1">▒</span>
```

---

## 八、扩展功能（未来可选）

1. **动画 GIF 支持**：逐帧转换为字符画动画
2. **视频转字符画**：支持视频文件转换
3. **实时摄像头**：摄像头画面实时转字符画
4. **字符画编辑**：手动编辑字符画内容
5. **批量转换**：批量处理多个图片文件
6. **自定义字符映射表**：完全自定义字符与亮度的映射关系

---

## 九、技术难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| 大图片性能 | 异步处理 + 进度条，限制最大输入尺寸 |
| 字符宽高比 | 提供宽高比参数，自动计算缩放比例 |
| 颜色准确性 | 使用感知亮度公式，支持 gamma 校正 |
| 剪贴板兼容 | 使用 arboard 库，支持跨平台 |
| 彩色显示 | 同时支持 ANSI、HTML、Unicode 方块字符 |

---

## 十、总结

字符画功能将为 Toolbox 添加一个有趣且实用的创意工具。通过丰富的参数调节和多种输出方式，用户可以轻松创建各种风格的字符画作品。模块化的设计也便于未来扩展更多功能。
