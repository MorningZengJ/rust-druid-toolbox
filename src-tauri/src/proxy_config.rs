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
    /// 上次使用的代理测试地址
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_test_url: Option<String>,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            mode: ProxyMode::System,
            manual: None,
            last_test_url: None,
        }
    }
}

/// 代理连接测试结果
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyTestResult {
    /// 测试是否成功（HTTP 状态码 2xx）
    pub success: bool,
    /// HTTP 响应状态码
    pub status_code: Option<u16>,
    /// 请求延迟（毫秒）
    pub latency_ms: u64,
    /// 错误描述信息（失败时）
    pub error: Option<String>,
    /// 错误分类：timeout | dns | connection_refused | auth_failed | tls_error | http_error | unknown
    pub error_kind: Option<String>,
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
    pub(crate) fn to_proxy_url(&self) -> String {
        let scheme = match self.protocol {
            ProxyProtocol::Http => "http",
            ProxyProtocol::Socks5 => "socks5",
        };

        let host = self.host.trim();

        if let (Some(user), Some(pass)) = (&self.username, &self.password) {
            let encoded_user = percent_encode(user);
            let encoded_pass = percent_encode(pass);
            format!(
                "{}://{}:{}@{}:{}",
                scheme, encoded_user, encoded_pass, host, self.port
            )
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
fn winhttp_set_no_proxy() { /* no-op */
}
#[cfg(not(windows))]
fn winhttp_reset_default() { /* no-op */
}

// ── Read system proxy for connection test (Windows only) ──

/// 代理配置结构体 — WinHttpGetIEProxyConfigForCurrentUser 使用
#[cfg(windows)]
#[repr(C)]
struct WinHttpCurrentUserIEProxyConfig {
    f_auto_detect: i32,
    lpsz_auto_config_url: *const u16,
    lpsz_proxy: *const u16,
    lpsz_proxy_bypass: *const u16,
}

#[cfg(windows)]
#[link(name = "winhttp")]
extern "system" {
    fn WinHttpGetIEProxyConfigForCurrentUser(
        p_proxy_config: *mut WinHttpCurrentUserIEProxyConfig,
    ) -> i32;
}

#[cfg(windows)]
#[link(name = "kernel32")]
extern "system" {
    fn GlobalFree(h_mem: *const std::ffi::c_void);
}

/// 读取 Windows IE 代理设置，返回可用于 reqwest 的 http 代理 URL
#[cfg(windows)]
fn read_ie_proxy_url() -> Option<String> {
    unsafe {
        let mut config = WinHttpCurrentUserIEProxyConfig {
            f_auto_detect: 0,
            lpsz_auto_config_url: std::ptr::null(),
            lpsz_proxy: std::ptr::null(),
            lpsz_proxy_bypass: std::ptr::null(),
        };
        if WinHttpGetIEProxyConfigForCurrentUser(&mut config) == 0 {
            return None;
        }
        let result = if !config.lpsz_proxy.is_null() {
            let s = wide_ptr_to_string(config.lpsz_proxy);
            let proxy = parse_ie_proxy_server(&s);
            eprintln!("[proxy] read IE proxy: raw={:?} → parsed={:?}", s, proxy);
            proxy
        } else {
            None
        };
        // 释放 WinHTTP 分配的内存
        if !config.lpsz_auto_config_url.is_null() {
            GlobalFree(config.lpsz_auto_config_url as _);
        }
        if !config.lpsz_proxy.is_null() {
            GlobalFree(config.lpsz_proxy as _);
        }
        if !config.lpsz_proxy_bypass.is_null() {
            GlobalFree(config.lpsz_proxy_bypass as _);
        }
        result
    }
}

#[cfg(windows)]
unsafe fn wide_ptr_to_string(ptr: *const u16) -> String {
    let len = (0..).take_while(|&i| unsafe { *ptr.add(i) != 0 }).count();
    String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len))
}

/// 解析 IE 代理字符串。
/// 格式可能是：
///   - `"proxy:8080"` — 所有协议共用
///   - `"http=proxy:80;https=proxy:443"` — 分协议指定
#[cfg(windows)]
fn parse_ie_proxy_server(proxy_str: &str) -> Option<String> {
    // 查找 http= 或 https= 前缀
    for protocol in &["http=", "https="] {
        if let Some(pos) = proxy_str.find(protocol) {
            let start = pos + protocol.len();
            let end = proxy_str[start..]
                .find(|c: char| c == ' ' || c == ';')
                .map(|p| start + p)
                .unwrap_or(proxy_str.len());
            let server = proxy_str[start..end].trim();
            if !server.is_empty() {
                return Some(format!("http://{}", server));
            }
        }
    }
    // 没有协议前缀，整个字符串就是代理地址
    let server = proxy_str.trim();
    if server.is_empty() {
        None
    } else {
        Some(format!("http://{}", server))
    }
}

#[cfg(not(windows))]
fn read_ie_proxy_url() -> Option<String> {
    None // 非 Windows：由 reqwest 通过环境变量自行检测
}

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
                eprintln!(
                    "[proxy] Mode: Manual requested but config missing, falling back to System"
                );
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

    let parsed: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))?;

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
    let proxy_value =
        serde_json::to_value(config).map_err(|e| format!("Serialization error: {}", e))?;
    if let Some(obj) = root.as_object_mut() {
        obj.insert("proxy".to_string(), proxy_value);
    }

    // 回写文件
    let json =
        serde_json::to_string_pretty(&root).map_err(|e| format!("Serialization error: {}", e))?;
    std::fs::write(&settings_path, &json)
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;

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

/// 根据当前保存的代理配置返回有效代理 URL（供 updater 等组件使用）
/// - Direct 模式 → None
/// - System 模式 → Windows 上读取 IE 代理，非 Windows 返回 None
/// - Manual 模式 → 返回手动配置的代理 URL
pub fn get_effective_proxy_url(app_handle: &tauri::AppHandle) -> Result<Option<String>, String> {
    let config = load_config(app_handle)?;
    Ok(match config.mode {
        ProxyMode::Direct => None,
        ProxyMode::System => {
            #[cfg(windows)]
            {
                read_ie_proxy_url()
            }
            #[cfg(not(windows))]
            {
                None
            }
        }
        ProxyMode::Manual => config.manual.as_ref().map(|m| m.to_proxy_url()),
    })
}

// ── Proxy connection test ──

/// 使用当前保存的代理配置向指定 URL 发起 HTTP GET 请求，返回测试结果
pub async fn test_connection(
    app_handle: &tauri::AppHandle,
    test_url: &str,
) -> Result<ProxyTestResult, String> {
    eprintln!("[proxy] test_connection: testing URL={}", test_url);
    let config = load_config(app_handle)?;
    let start = std::time::Instant::now();

    let client_builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(3));

    let client = match &config.mode {
        ProxyMode::Manual => {
            let manual = config
                .manual
                .as_ref()
                .ok_or_else(|| "Manual mode configuration is missing".to_string())?;
            let proxy_url = manual.to_proxy_url();
            let proxy =
                reqwest::Proxy::all(&proxy_url).map_err(|e| format!("Invalid proxy URL: {}", e))?;
            client_builder
                .proxy(proxy)
                .build()
                .map_err(|e| format!("Failed to build proxy client: {}", e))?
        }
        ProxyMode::Direct => {
            // 直连，不使用任何代理
            client_builder
                .no_proxy()
                .build()
                .map_err(|e| format!("Failed to build direct client: {}", e))?
        }
        ProxyMode::System => {
            // 尝试读取 Windows 系统代理，找不到则直连
            #[cfg(windows)]
            {
                if let Some(proxy_url) = read_ie_proxy_url() {
                    let proxy = reqwest::Proxy::all(&proxy_url)
                        .map_err(|e| format!("Invalid system proxy URL: {}", e))?;
                    client_builder
                        .proxy(proxy)
                        .build()
                        .map_err(|e| format!("Failed to build system proxy client: {}", e))?
                } else {
                    client_builder
                        .build()
                        .map_err(|e| format!("Failed to build system client: {}", e))?
                }
            }
            #[cfg(not(windows))]
            {
                // 非 Windows：依赖环境变量，不干预
                client_builder
                    .build()
                    .map_err(|e| format!("Failed to build system client: {}", e))?
            }
        }
    };

    let response = client.get(test_url).send().await;
    let latency_ms = start.elapsed().as_millis() as u64;

    match response {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let success = resp.status().is_success();
            Ok(ProxyTestResult {
                success,
                status_code: Some(status),
                latency_ms,
                error: if success {
                    None
                } else {
                    Some(format!("Server returned HTTP {}", status))
                },
                error_kind: if success {
                    None
                } else {
                    Some("http_error".to_string())
                },
            })
        }
        Err(e) => {
            let (kind, msg) = classify_reqwest_error(&e);
            Ok(ProxyTestResult {
                success: false,
                status_code: None,
                latency_ms,
                error: Some(msg),
                error_kind: Some(kind),
            })
        }
    }
}

/// 将 reqwest 错误分类为友好类型
fn classify_reqwest_error(e: &reqwest::Error) -> (String, String) {
    if e.is_timeout() {
        (
            "timeout".to_string(),
            "Connection timed out after 10 seconds".to_string(),
        )
    } else if e.is_connect() {
        let msg = e.to_string().to_lowercase();
        if msg.contains("dns") || msg.contains("resolve") || msg.contains("no such host") {
            ("dns".to_string(), format!("DNS resolution failed: {}", e))
        } else {
            (
                "connection_refused".to_string(),
                format!("Cannot connect: {}", e),
            )
        }
    } else {
        let msg = e.to_string();
        let msg_lower = msg.to_lowercase();
        if msg_lower.contains("407") || msg_lower.contains("proxy authentication required") {
            (
                "auth_failed".to_string(),
                format!("Proxy authentication failed: {}", e),
            )
        } else if msg_lower.contains("tls")
            || msg_lower.contains("certificate")
            || msg_lower.contains("ssl")
        {
            ("tls_error".to_string(), format!("TLS error: {}", e))
        } else {
            ("unknown".to_string(), msg)
        }
    }
}
