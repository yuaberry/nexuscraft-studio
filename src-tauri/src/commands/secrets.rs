//! Secret storage — the credential perimeter.
//!
//! Strategy: use the OS credential manager (GNOME Keyring / Windows
//! Credential Manager / macOS Keychain) via the `keyring` crate. If the
//! OS keyring is unavailable (headless sessions, missing dbus service),
//! fall back to a permission-restricted JSON file inside the app config
//! directory (chmod 600 on Unix). The active backend is always reported
//! to the UI — never silently downgraded.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};

use serde::Serialize;

const KEYRING_SERVICE: &str = "voxel";
const PROBE_KEY: &str = "__backend_probe__";

#[derive(Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum SecretBackend {
    OsKeyring,
    LocalFile,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecretsOpResult {
    pub success: bool,
    pub backend: SecretBackend,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecretBackendInfo {
    pub backend: SecretBackend,
    pub available: bool,
}

fn keyring_available() -> bool {
    static AVAILABLE: OnceLock<bool> = OnceLock::new();
    *AVAILABLE.get_or_init(|| {
        let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, PROBE_KEY) else {
            return false;
        };
        let probe_ok = entry
            .set_password("probe")
            .and_then(|_| entry.get_password())
            .map(|v| v == "probe")
            .unwrap_or(false);
        let _ = entry.delete_credential();
        probe_ok
    })
}

fn fallback_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Could not resolve config dir: {e}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create config dir: {e}"))?;
    Ok(dir.join("secrets.json"))
}

fn load_fallback(app: &AppHandle) -> Result<HashMap<String, String>, String> {
    let path = fallback_file_path(app)?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("Could not read secrets file: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("Secrets file is corrupted: {e}"))
}

fn save_fallback(app: &AppHandle, secrets: &HashMap<String, String>) -> Result<(), String> {
    let path = fallback_file_path(app)?;
    let raw = serde_json::to_string_pretty(secrets)
        .map_err(|e| format!("Could not encode secrets: {e}"))?;
    std::fs::write(&path, raw).map_err(|e| format!("Could not write secrets file: {e}"))?;

    // Restrict to the current user (best-effort, Unix only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

fn keyring_entry(key: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, key).map_err(|e| format!("Keyring error: {e}"))
}

#[tauri::command]
pub fn secrets_set(app: AppHandle, key: String, value: String) -> Result<SecretsOpResult, String> {
    if key.is_empty() || key == PROBE_KEY {
        return Err("Invalid secret key".to_string());
    }

    if keyring_available() {
        keyring_entry(&key)?.set_password(&value).map_err(|e| format!("Keyring error: {e}"))?;
        return Ok(SecretsOpResult {
            success: true,
            backend: SecretBackend::OsKeyring,
        });
    }

    let mut secrets = load_fallback(&app)?;
    secrets.insert(key, value);
    save_fallback(&app, &secrets)?;
    Ok(SecretsOpResult {
        success: true,
        backend: SecretBackend::LocalFile,
    })
}

#[tauri::command]
pub fn secrets_get(app: AppHandle, key: String) -> Result<Option<String>, String> {
    if keyring_available() {
        match keyring_entry(&key)?.get_password() {
            Ok(value) => return Ok(Some(value)),
            Err(keyring::Error::NoEntry) => return Ok(None),
            Err(e) => return Err(format!("Keyring error: {e}")),
        }
    }

    let secrets = load_fallback(&app)?;
    Ok(secrets.get(&key).cloned())
}

#[tauri::command]
pub fn secrets_has(app: AppHandle, key: String) -> Result<bool, String> {
    Ok(secrets_get(app, key)?.is_some())
}

#[tauri::command]
pub fn secrets_delete(app: AppHandle, key: String) -> Result<SecretsOpResult, String> {
    if keyring_available() {
        match keyring_entry(&key)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => {}
            Err(e) => return Err(format!("Keyring error: {e}")),
        }
        return Ok(SecretsOpResult {
            success: true,
            backend: SecretBackend::OsKeyring,
        });
    }

    let mut secrets = load_fallback(&app)?;
    secrets.remove(&key);
    save_fallback(&app, &secrets)?;
    Ok(SecretsOpResult {
        success: true,
        backend: SecretBackend::LocalFile,
    })
}

#[tauri::command]
pub fn secrets_clear_all(app: AppHandle) -> Result<SecretsOpResult, String> {
    let backend = if keyring_available() {
        // The keyring API has no "list" operation — clear the keys we own
        // by convention. Known keys are enumerated here explicitly.
        for key in ["ai_api_key", "github_token"] {
            if let Ok(entry) = keyring_entry(key) {
                let _ = entry.delete_credential();
            }
        }
        SecretBackend::OsKeyring
    } else {
        SecretBackend::LocalFile
    };

    if backend == SecretBackend::LocalFile {
        save_fallback(&app, &HashMap::new())?;
    }

    Ok(SecretsOpResult {
        success: true,
        backend,
    })
}

#[tauri::command]
pub fn secrets_backend_info() -> Result<SecretBackendInfo, String> {
    let available = keyring_available();
    Ok(SecretBackendInfo {
        backend: if available {
            SecretBackend::OsKeyring
        } else {
            SecretBackend::LocalFile
        },
        available,
    })
}
