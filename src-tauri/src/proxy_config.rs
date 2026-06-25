use serde::{Deserialize, Serialize};
use tauri::Manager;

// ── Data models ──

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ProxyMode {
    Direct,
    System,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ProxyProtocol {
    Http,
    Socks5,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManualProxyConfig {
    pub protocol: ProxyProtocol,
    pub host: String,
    pub port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyConfig {
    pub mode: ProxyMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manual: Option<ManualProxyConfig>,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            mode: ProxyMode::System,
            manual: None,
        }
    }
}

/// 当前进程环境变量的快照，供前端查询显示
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyState {
    pub http_proxy: Option<String>,
    pub https_proxy: Option<String>,
    pub all_proxy: Option<String>,
    pub no_proxy: Option<String>,
}

// ── Proxy URL construction ──

impl ManualProxyConfig {
    /// 构建代理 URL，包含可选认证凭据（特殊字符百分号编码）
    fn to_proxy_url(&self) -> String {
        let scheme = match self.protocol {
            ProxyProtocol::Http => "http",
            ProxyProtocol::Socks5 => "socks5",
        };

        let host = self.host.trim();

        if let (Some(user), Some(pass)) = (&self.username, &self.password) {
            let encoded_user = percent_encode(user);
            let encoded_pass = percent_encode(pass);
            format!("{}://{}:{}@{}:{}", scheme, encoded_user, encoded_pass, host, self.port)
        } else if let Some(user) = &self.username {
            let encoded_user = percent_encode(user);
            format!("{}://{}@{}:{}", scheme, encoded_user, host, self.port)
        } else {
            format!("{}://{}:{}", scheme, host, self.port)
        }
    }
}

/// 对代理 URL 中可能破坏解析的特殊字符进行百分号编码
fn percent_encode(input: &str) -> String {
    input
        .chars()
        .map(|c| match c {
            '@' => "%40".to_string(),
            ':' => "%3A".to_string(),
            '%' => "%25".to_string(),
            other => other.to_string(),
        })
        .collect()
}

// ── Environment variable management (process-local only) ──

const PROXY_VARS: &[&str] = &["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"];

fn remove_proxy_vars() {
    for var in PROXY_VARS {
        std::env::remove_var(var);
    }
}

fn set_proxy_vars(url: &str) {
    std::env::set_var("HTTP_PROXY", url);
    std::env::set_var("HTTPS_PROXY", url);
    std::env::set_var("ALL_PROXY", url);
    // 手动模式下不设置 NO_PROXY，所有请求都走代理
    std::env::remove_var("NO_PROXY");
}

// ── WinHTTP FFI (Windows only, process-scoped) ──

/// WinHTTP 代理配置结构体
#[cfg(windows)]
#[repr(C)]
struct WinHttpProxyInfo {
    dw_access_type: u32,
    lpsz_proxy: *const u16,
    lpsz_proxy_bypass: *const u16,
}

// WinHTTP 访问类型常量
#[cfg(windows)]
const WINHTTP_ACCESS_TYPE_NO_PROXY: u32 = 1; // 直连，不使用代理
#[cfg(windows)]
const WINHTTP_ACCESS_TYPE_DEFAULT_PROXY: u32 = 0; // 使用系统默认代理

#[cfg(windows)]
#[link(name = "winhttp")]
extern "system" {
    fn WinHttpSetDefaultProxyConfiguration(p_proxy_info: *const WinHttpProxyInfo) -> i32;
}

/// 设置当前进程的 WinHTTP 代理为直连模式（不进注册表）
#[cfg(windows)]
fn winhttp_set_no_proxy() {
    let proxy_info = WinHttpProxyInfo {
        dw_access_type: WINHTTP_ACCESS_TYPE_NO_PROXY,
        lpsz_proxy: std::ptr::null(),
        lpsz_proxy_bypass: std::ptr::null(),
    };
    let result = unsafe { WinHttpSetDefaultProxyConfiguration(&proxy_info) };
    if result == 0 {
        eprintln!("[proxy] WinHttpSetDefaultProxyConfiguration(NO_PROXY) failed");
    }
}

/// 重置当前进程的 WinHTTP 代理为系统默认
#[cfg(windows)]
fn winhttp_reset_default() {
    let proxy_info = WinHttpProxyInfo {
        dw_access_type: WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
        lpsz_proxy: std::ptr::null(),
        lpsz_proxy_bypass: std::ptr::null(),
    };
    let result = unsafe { WinHttpSetDefaultProxyConfiguration(&proxy_info) };
    if result == 0 {
        eprintln!("[proxy] WinHttpSetDefaultProxyConfiguration(DEFAULT) failed");
    }
}

// Non-Windows stubs
#[cfg(not(windows))]
fn winhttp_set_no_proxy() { /* no-op */ }
#[cfg(not(windows))]
fn winhttp_reset_default() { /* no-op */ }

// ── Core apply function ──

/// 根据配置设置当前进程的代理环境（仅修改进程内存）
pub fn apply_proxy(config: &ProxyConfig) {
    match config.mode {
        ProxyMode::Direct => {
            // 1. 进程级禁用 WinHTTP 代理
            winhttp_set_no_proxy();
            // 2. 清除所有代理环境变量
            remove_proxy_vars();
            eprintln!("[proxy] Mode: Direct — all proxies bypassed");
        }
        ProxyMode::System => {
            // 1. 进程级恢复 WinHTTP 系统默认
            winhttp_reset_default();
            // 2. 清除所有代理环境变量，让 WinHTTP 接管
            remove_proxy_vars();
            eprintln!("[proxy] Mode: System — using system proxy settings");
        }
        ProxyMode::Manual => {
            if let Some(manual) = &config.manual {
                // 1. 先禁用 WinHTTP 层，避免双重代理
                winhttp_set_no_proxy();
                // 2. 通过环境变量设置手动代理
                let url = manual.to_proxy_url();
                set_proxy_vars(&url);
                eprintln!("[proxy] Mode: Manual — using {}", url);
            } else {
                // Manual 模式但配置缺失，回退到 System
                eprintln!("[proxy] Mode: Manual requested but config missing, falling back to System");
                winhttp_reset_default();
                remove_proxy_vars();
            }
        }
    }
}

// ── settings.json read/write helpers ──

fn resolve_settings_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map(|dir: std::path::PathBuf| dir.join("settings.json"))
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))
}

/// 从 settings.json 读取代理配置（不应用，只返回数据）
/// 文件不存在或无 proxy 键时返回默认配置（System 模式）
pub fn load_config(app_handle: &tauri::AppHandle) -> Result<ProxyConfig, String> {
    let settings_path = resolve_settings_path(app_handle)?;

    let content = match std::fs::read_to_string(&settings_path) {
        Ok(c) => c,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Ok(ProxyConfig::default());
        }
        Err(e) => {
            return Err(format!("Failed to read settings.json: {}", e));
        }
    };

    let parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse settings.json: {}", e))?;

    match parsed.get("proxy") {
        Some(v) => serde_json::from_value(v.clone())
            .map_err(|e| format!("Failed to deserialize proxy config: {}", e)),
        None => Ok(ProxyConfig::default()),
    }
}

/// 将代理配置保存到 settings.json（合并写入，不影响其他键）
pub fn save_config(app_handle: &tauri::AppHandle, config: &ProxyConfig) -> Result<(), String> {
    let settings_path = resolve_settings_path(app_handle)?;

    // 读取现有的 settings.json（如果存在）
    let mut root: serde_json::Value = std::fs::read_to_string(&settings_path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or(serde_json::Value::Object(serde_json::Map::new()));

    // 更新 "proxy" 键
    let proxy_value = serde_json::to_value(config).map_err(|e| format!("Serialization error: {}", e))?;
    if let Some(obj) = root.as_object_mut() {
        obj.insert("proxy".to_string(), proxy_value);
    }

    // 回写文件
    let json = serde_json::to_string_pretty(&root).map_err(|e| format!("Serialization error: {}", e))?;
    std::fs::write(&settings_path, &json).map_err(|e| format!("Failed to write settings.json: {}", e))?;

    Ok(())
}

// ── Startup loader ──

/// 从 settings.json 加载代理配置并应用（启动时调用）
pub fn load_and_apply_proxy(app_handle: &tauri::AppHandle) {
    match load_config(app_handle) {
        Ok(config) => {
            apply_proxy(&config);
        }
        Err(e) => {
            eprintln!("[proxy] Failed to load proxy config: {}", e);
        }
    }
}
