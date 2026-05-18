启动项目：`npm run tauri dev`
vcpkg 安装静态库：`C:\vcpkg\vcpkg install ffmpeg:x64-windows-static-md`
FFmpeg静态库编译：`cargo check --manifest-path src-tauri/Cargo.toml --features video-frame`