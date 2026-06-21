修改PowerShell安全策略：`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
启动项目：`npm run tauri dev`
安装LLVM：`winget install LLVM.LLVM --accept-package-agreements --accept-source-agreements`
vcpkg 安装静态库：`C:\vcpkg\vcpkg install ffmpeg:x64-windows-static-md`
FFmpeg静态库编译：`cargo check --manifest-path src-tauri/Cargo.toml --features video-frame`

生成完整图标：`npm run tauri icon <your-icon.png>`

# 生成密钥对
`npm run tauri signer generate -- -w ~/.tauri/mtoolbox.key`
私钥：`C:\Users\zengc\.tauri\mtoolbox.key`
# 构建时设置环境变量
```bash
$env:TAURI_SIGNING_PRIVATE_KEY="<私钥内容>"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
```
# 1. 构建（生成安装包 + .sig 文件）
```bash
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\Users\zengc\.tauri\mtoolbox.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npm run tauri build
```

# 2. 构建产物在 src-tauri/target/release/bundle/ 下：
#    nsis/MToolbox_0.1.2_x64-setup.exe
#    nsis/MToolbox_0.1.2_x64-setup.exe.sig

# 3. 读取 .sig 文件内容
```bash
Get-Content src-tauri/target/release/bundle/nsis/MToolbox_0.1.2_x64-setup.exe.sig
```

打包发行：`npx tauri build`
