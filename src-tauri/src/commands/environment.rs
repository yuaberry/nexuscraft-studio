//! Environment detection — runs fixed, well-known system commands only.
//! No user-controlled input ever reaches these invocations.

use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JavaInfo {
    pub found: bool,
    pub version_string: Option<String>,
    pub major_version: Option<u32>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    pub found: bool,
    pub version: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentInfo {
    pub os: String,
    pub arch: String,
    pub java: JavaInfo,
    pub git: GitInfo,
}

/// Extracts the major Java version from strings like
/// `openjdk version "21.0.12"` or `java version "1.8.0_392"`.
fn parse_java_major(first_line: &str) -> Option<u32> {
    let start = first_line.find('"')? + 1;
    let end = first_line[start..].find('"')? + start;
    let raw = &first_line[start..end];

    let mut parts = raw.split('.');
    let first = parts.next()?;
    let major = if first == "1" {
        // Legacy scheme: 1.8.0 => Java 8
        parts.next()?.split('_').next()?.to_string()
    } else {
        first.to_string()
    };

    major.parse::<u32>().ok()
}

fn detect_java() -> JavaInfo {
    match Command::new("java").arg("-version").output() {
        Ok(output) => {
            // `java -version` prints to stderr on all major distributions
            let text = String::from_utf8_lossy(&output.stderr);
            let text = if text.trim().is_empty() {
                String::from_utf8_lossy(&output.stdout).to_string()
            } else {
                text.to_string()
            };

            let first_line = text.lines().next().unwrap_or_default().to_string();
            if first_line.is_empty() {
                return JavaInfo {
                    found: false,
                    version_string: None,
                    major_version: None,
                };
            }

            let major = parse_java_major(&first_line);
            JavaInfo {
                found: true,
                version_string: Some(first_line),
                major_version: major,
            }
        }
        Err(_) => JavaInfo {
            found: false,
            version_string: None,
            major_version: None,
        },
    }
}

fn detect_git() -> GitInfo {
    match Command::new("git").arg("--version").output() {
        Ok(output) => {
            let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if output.status.success() && !text.is_empty() {
                GitInfo {
                    found: true,
                    version: Some(text),
                }
            } else {
                GitInfo {
                    found: false,
                    version: None,
                }
            }
        }
        Err(_) => GitInfo {
            found: false,
            version: None,
        },
    }
}

#[tauri::command]
pub fn detect_environment() -> EnvironmentInfo {
    EnvironmentInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        java: detect_java(),
        git: detect_git(),
    }
}
