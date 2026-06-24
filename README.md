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

# Install frontend dependencies reproducibly
cd frontend && npm ci

# Frontend quality checks
cd frontend
npm run lint
npm run typecheck
npm run check:i18n
npm run check:i18n-usage
npm run build

# Full frontend quality gate
cd frontend && npm run quality

# Version consistency check
node scripts/check-version-consistency.cjs

# Rust baseline without FFmpeg dependency
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml --no-default-features
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features

# Rust check with default video features (requires FFmpeg static libraries)
cargo check --manifest-path src-tauri/Cargo.toml --features video-frame
cargo test --manifest-path src-tauri/Cargo.toml
```

Notes:

- `video-frame` is enabled by default and requires LLVM/vcpkg FFmpeg static libraries.
- i18n completeness reports existing empty translations as warnings; missing keys, type mismatches, and interpolation mismatches are treated as errors.
- `src-tauri/tauri.conf.json` `bundle.targets` must remain unchanged.

## Publishing a Release

```bash
# 1. Update and verify version in all release files:
#    - frontend/package.json
#    - src-tauri/Cargo.toml
#    - src-tauri/tauri.conf.json
#    - updater.json
node scripts/check-version-consistency.cjs

# 2. Run quality checks before building
cd frontend && npm ci && npm run quality && cd ..
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml --features video-frame
cargo test --manifest-path src-tauri/Cargo.toml

# 3. Build with signing
$env:TAURI_SIGNING_PRIVATE_KEY = "path\to\your\key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
cargo tauri build

# 4. Get signature
Get-Content src-tauri\target\release\bundle\nsis\MToolbox_x.x.x_x64-setup.exe.sig

# 5. Update updater.json (version, signature, URL) and re-run version check
node scripts/check-version-consistency.cjs

# 6. Create GitHub Release
gh release create vx.x.x --title "MToolbox vx.x.x" --notes "Release notes" \
  src-tauri/target/release/bundle/nsis/*.exe \
  src-tauri/target/release/bundle/nsis/*.exe.sig
```

Release notes:

- Do not modify `src-tauri/tauri.conf.json` `bundle.targets`; packaging target changes must be handled outside this config key.
- Use `npm ci` for reproducible frontend installs.
- Keep `updater.json` version, URLs, and signatures aligned with the release artifact names.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- Author: MorningZeng
- Email: zengchennihon@gmail.com
- GitHub: [@MorningZengJ](https://github.com/MorningZengJ)
