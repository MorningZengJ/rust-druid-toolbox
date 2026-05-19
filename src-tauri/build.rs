fn main() {
    // FFmpeg static linking on Windows requires COM/DirectShow/MediaFoundation libs
    #[cfg(target_os = "windows")]
    {
        println!("cargo:rustc-link-lib=dylib=strmiids");
        println!("cargo:rustc-link-lib=dylib=uuid");
        println!("cargo:rustc-link-lib=dylib=ole32");
        println!("cargo:rustc-link-lib=dylib=oleaut32");
        println!("cargo:rustc-link-lib=dylib=wmcodecdspuuid");
        println!("cargo:rustc-link-lib=dylib=mfuuid");
        println!("cargo:rustc-link-lib=dylib=msdmo");
        println!("cargo:rustc-link-lib=dylib=evr");
        println!("cargo:rustc-link-lib=dylib=mf");
        println!("cargo:rustc-link-lib=dylib=mfplat");
        println!("cargo:rustc-link-lib=dylib=mfplay");
        println!("cargo:rustc-link-lib=dylib=mfreadwrite");
        println!("cargo:rustc-link-lib=dylib=shlwapi");
        println!("cargo:rustc-link-lib=dylib=secur32");
        println!("cargo:rustc-link-lib=dylib=ws2_32");
        println!("cargo:rustc-link-lib=dylib=bcrypt");
        println!("cargo:rustc-link-lib=dylib=user32");
        println!("cargo:rustc-link-lib=dylib=gdi32");
        println!("cargo:rustc-link-lib=dylib=advapi32");
    }

    tauri_build::build()
}
