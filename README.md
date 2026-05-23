修改PowerShell安全策略：`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
启动项目：`npm run tauri dev`
安装LLVM：`winget install LLVM.LLVM --accept-package-agreements --accept-source-agreements`
vcpkg 安装静态库：`C:\vcpkg\vcpkg install ffmpeg:x64-windows-static-md`
FFmpeg静态库编译：`cargo check --manifest-path src-tauri/Cargo.toml --features video-frame`

打包发行：`npx tauri build`
生成完整图标：`npm run tauri icon <your-icon.png>`
