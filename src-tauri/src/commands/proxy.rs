use tauri::AppHandle;

use crate::proxy_config::{self, ProxyConfig, ProxyState, ProxyTestResult};

/// 获取当前持久化的代理配置
#[tauri::command]
pub fn get_proxy_config(app: AppHandle) -> Result<ProxyConfig, String> {
    proxy_config::load_config(&app)
}

/// 保存并应用代理配置（写入 settings.json + 立即生效）
#[tauri::command]
pub fn set_proxy_config(app: AppHandle, config: ProxyConfig) -> Result<(), String> {
    // 校验
    validate_config(&config)?;

    // 写入 settings.json
    proxy_config::save_config(&app, &config)?;

    // 应用（设置进程环境变量 / WinHTTP）
    proxy_config::apply_proxy(&config);

    Ok(())
}

/// 读取当前进程环境变量快照（供前端显示状态）
#[tauri::command]
pub fn get_current_proxy_state() -> ProxyState {
    ProxyState {
        http_proxy: std::env::var("HTTP_PROXY").ok(),
        https_proxy: std::env::var("HTTPS_PROXY").ok(),
        all_proxy: std::env::var("ALL_PROXY").ok(),
        no_proxy: std::env::var("NO_PROXY").ok(),
    }
}

/// 使用当前代理配置测试与目标 URL 的连接
#[tauri::command]
pub async fn test_proxy_connection(
    app: AppHandle,
    test_url: String,
) -> Result<ProxyTestResult, String> {
    proxy_config::test_connection(&app, &test_url).await
}

// ── Validation ──

fn validate_config(config: &ProxyConfig) -> Result<(), String> {
    if let ProxyConfig {
        mode: proxy_config::ProxyMode::Manual,
        manual: None,
        ..
    } = config
    {
        return Err("Manual mode requires manual proxy configuration".to_string());
    }

    if let Some(manual) = &config.manual {
        if manual.host.trim().is_empty() {
            return Err("Proxy host cannot be empty".to_string());
        }
        if manual.port == 0 {
            return Err("Proxy port must be between 1 and 65535".to_string());
        }
    }

    Ok(())
}
