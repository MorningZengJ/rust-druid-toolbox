# MToolbox

**基于 Tauri v2 的轻量级 Windows 桌面工具箱**

[![Version](https://img.shields.io/github/v/release/MorningZengJ/rust-druid-toolbox)](https://github.com/MorningZengJ/rust-druid-toolbox/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/MorningZengJ/rust-druid-toolbox/total)](https://github.com/MorningZengJ/rust-druid-toolbox/releases)

[English](README.md) | 中文

---

## 功能特性

- **批量文件重命名** - 过滤文件、定义替换规则、预览变更、执行重命名，支持冲突检测
- **字符画生成器** - 将图片转换为 ASCII 字符画，支持自定义参数（宽度、字符集、对比度、颜色模式）
- **视频工具** - 视频合并、图片序列转视频、格式转换、视频抽帧，基于 FFmpeg
- **自动更新** - 内置更新机制，支持签名验证

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、TypeScript、Mantine UI v9、Zustand v5 |
| 后端 | Rust (Edition 2021)、Tauri v2 |
| 构建 | Vite 6、Cargo |
| 视频 | FFmpeg（可选，feature flag 控制） |

## 安装方式

### 下载预编译版本

从 [Releases](https://github.com/MorningZengJ/rust-druid-toolbox/releases) 页面下载最新的 `.exe` 安装包。

### 从源码构建

**前置要求：**

- [Node.js](https://nodejs.org/)（v18+）
- [Rust](https://www.rust-lang.org/tools/install)（stable）
- [LLVM](https://llvm.org/)（FFmpeg 静态编译需要）
- [vcpkg](https://github.com/microsoft/vcpkg) 及 FFmpeg 静态库

**搭建步骤：**

```bash
# 1. 安装 LLVM
winget install LLVM.LLVM --accept-package-agreements --accept-source-agreements

# 2. 通过 vcpkg 安装 FFmpeg 静态库
C:\vcpkg\vcpkg install ffmpeg:x64-windows-static-md

# 3. 克隆仓库
git clone https://github.com/MorningZengJ/rust-druid-toolbox.git
cd rust-druid-toolbox

# 4. 安装前端依赖
cd frontend && npm install && cd ..

# 5. 开发模式运行
npm run tauri dev
```

**生产构建：**

```bash
# 不含视频功能（无需 FFmpeg）
cargo build --manifest-path src-tauri/Cargo.toml --no-default-features --release

# 含视频功能（需要 FFmpeg）
cargo build --manifest-path src-tauri/Cargo.toml --release
```

## 项目结构

```
rust-druid-toolbox/
├── frontend/                  # React 前端
│   └── src/
│       ├── pages/             # 功能页面（重命名、字符画、视频工具、设置）
│       ├── stores/            # Zustand 状态管理
│       ├── components/        # 共享组件
│       └── types/             # TypeScript 类型定义
├── src-tauri/                 # Rust 后端
│   └── src/
│       ├── commands/          # Tauri IPC 命令
│       ├── model/             # 数据模型
│       └── utils/             # 业务逻辑与引擎
└── assets/                    # 静态资源
```

## 开发指南

```bash
# 运行开发服务器
npm run tauri dev

# 前端构建检查
cd frontend && npm run build

# Rust 编译检查
cargo check --manifest-path src-tauri/Cargo.toml

# 运行 Rust 测试
cargo test --manifest-path src-tauri/Cargo.toml

# 检查视频功能编译
cargo check --manifest-path src-tauri/Cargo.toml --features video-frame
```

## 发布流程

```bash
# 1. 更新 tauri.conf.json 和 Cargo.toml 中的版本号

# 2. 带签名构建
$env:TAURI_SIGNING_PRIVATE_KEY = "路径\到\你的\密钥"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npm run tauri build

# 3. 获取签名
Get-Content target\release\bundle\nsis\MToolbox_x.x.x_x64-setup.exe.sig

# 4. 更新 updater.json（版本、签名、URL）

# 5. 创建 GitHub Release
gh release create vx.x.x --title "MToolbox vx.x.x" --notes "更新说明" \
  target/release/bundle/nsis/*.exe \
  target/release/bundle/nsis/*.exe.sig
```

## 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件。

## 联系方式

- 作者：MorningZeng
- 邮箱：zengchennihon@gmail.com
- GitHub：[@MorningZengJ](https://github.com/MorningZengJ)
