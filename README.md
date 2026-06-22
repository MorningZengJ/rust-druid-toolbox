<div align="center">

# MToolbox

**A lightweight Windows desktop toolbox built with Tauri v2**

[![Version](https://img.shields.io/github/v/release/MorningZengJ/mtoolbox)](https://github.com/MorningZengJ/mtoolbox/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/MorningZengJ/mtoolbox/total)](https://github.com/MorningZengJ/mtoolbox/releases)

English | [中文](docs/i18n/README_CN.md)

</div>

---

## Features

- **Batch File Rename** - Filter files, define replacement rules, preview changes, and execute renames with conflict detection
- **ASCII Art Generator** - Convert images to ASCII art with customizable parameters (width, charset, contrast, color modes)
- **Video Tools** - Merge videos, image sequence to video, format conversion, and frame extraction with FFmpeg
- **Auto Update** - Built-in update mechanism with signature verification

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Mantine UI v9, Zustand v5 |
| Backend | Rust (Edition 2021), Tauri v2 |
| Build | Vite 6, Cargo |
| Video | FFmpeg (optional, feature-gated) |

## Installation

### Download Pre-built Binary

Download the latest `.exe` installer from [Releases](https://github.com/MorningZengJ/mtoolbox/releases).

### Build from Source

**Prerequisites:**

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [LLVM](https://llvm.org/) (required for FFmpeg static linking)
- [vcpkg](https://github.com/microsoft/vcpkg) with FFmpeg static libraries
- [Tauri CLI](https://v2.tauri.app/) (`cargo install tauri-cli --version "^2" --locked`)

**Setup:**

```bash
# 1. Install LLVM
winget install LLVM.LLVM --accept-package-agreements --accept-source-agreements

# 2. Install FFmpeg static libraries via vcpkg
C:\vcpkg\vcpkg install ffmpeg:x64-windows-static-md

# 3. Clone the repository
git clone https://github.com/MorningZengJ/mtoolbox.git
cd mtoolbox

# 4. Install Tauri CLI (one-time)
cargo install tauri-cli --version "^2" --locked

# 5. Install frontend dependencies
cd frontend && npm install && cd ..

# 6. Run in development mode
cargo tauri dev
```

**Build for Production:**

```bash
# Full build with bundling (NSIS installer on Windows)
cargo tauri build

# Build without video features (no FFmpeg dependency)
cargo build --manifest-path src-tauri/Cargo.toml --no-default-features --release

# Build with video features (requires FFmpeg)
cargo build --manifest-path src-tauri/Cargo.toml --release
```

## Project Structure

```
mtoolbox/
├── frontend/                  # React frontend
│   └── src/
│       ├── pages/             # Feature pages (rename, ascii-art, video-tool, settings)
│       ├── stores/            # Zustand state management
│       ├── components/        # Shared components
│       └── types/             # TypeScript type definitions
├── src-tauri/                 # Rust backend
│   └── src/
│       ├── commands/          # Tauri IPC commands
│       ├── model/             # Data models
│       └── utils/             # Business logic & engines
└── assets/                    # Static assets
```

## Development

```bash
# Run development server
cargo tauri dev

# Frontend build check
cd frontend && npm run build

# Rust compilation check
cargo check --manifest-path src-tauri/Cargo.toml

# Run Rust tests
cargo test --manifest-path src-tauri/Cargo.toml

# Check with video features
cargo check --manifest-path src-tauri/Cargo.toml --features video-frame
```

## Publishing a Release

```bash
# 1. Update version in tauri.conf.json and Cargo.toml

# 2. Build with signing
$env:TAURI_SIGNING_PRIVATE_KEY = "path\to\your\key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
cargo tauri build

# 3. Get signature
Get-Content src-tauri\target\release\bundle\nsis\MToolbox_x.x.x_x64-setup.exe.sig

# 4. Update updater.json (version, signature, URL)

# 5. Create GitHub Release
gh release create vx.x.x --title "MToolbox vx.x.x" --notes "Release notes" \
  src-tauri/target/release/bundle/nsis/*.exe \
  src-tauri/target/release/bundle/nsis/*.exe.sig
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- Author: MorningZeng
- Email: zengchennihon@gmail.com
- GitHub: [@MorningZengJ](https://github.com/MorningZengJ)
