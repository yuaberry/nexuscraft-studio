//! Build process execution (AD-8) — the only place the app spawns long-running
//! external processes. Hard rules:
//!  - Executable is always the project's own gradle wrapper (fixed path,
//!    fixed args from a small allowlist). No shell, no user-controlled argv.
//!  - GRADLE_USER_HOME is the shared workspace cache (faster builds).
//!  - stdout/stderr stream to the frontend via Tauri events, line by line.

use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::fs;

/// Gradle tasks the app is allowed to run. Anything else is refused.
const BUILD_TASKS: [&str; 3] = ["build", "clean", "jar"];

fn registry() -> &'static Mutex<HashMap<String, Child>> {
    static REGISTRY: OnceLock<Mutex<HashMap<String, Child>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BuildLogEvent {
    pub project: String,
    pub stream: String,
    pub line: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BuildExitEvent {
    pub project: String,
    pub code: Option<i32>,
    pub success: bool,
}

/// Starts a gradle wrapper task for a project. Returns the run id
/// (= project rel path). One concurrent build per project.
#[tauri::command]
pub fn start_build(
    app: AppHandle,
    base_path: String,
    project_rel: String,
    task: String,
    custom_java_path: Option<String>,
) -> Result<String, String> {
    if !BUILD_TASKS.contains(&task.as_str()) {
        return Err(format!("Task \"{task}\" is not allowed (allowed: {BUILD_TASKS:?})"));
    }

    let project_dir = fs::validated_path(&base_path, &project_rel, false)?;
    if !project_dir.is_dir() {
        return Err("Project directory not found".to_string());
    }

    {
        let reg = registry().lock().unwrap();
        if reg.contains_key(&project_rel) {
            return Err("A build is already running for this project".to_string());
        }
    }

    let wrapper_name = if cfg!(windows) { "gradlew.bat" } else { "gradlew" };
    let gradlew = project_dir.join(wrapper_name);
    if !gradlew.is_file() {
        return Err("gradlew wrapper not found in the project".to_string());
    }

    // Shared cache inside the workspace (created if missing)
    let gradle_home = std::path::PathBuf::from(&base_path).join(".gradle-cache");
    std::fs::create_dir_all(&gradle_home)
        .map_err(|e| format!("Could not create Gradle cache: {e}"))?;

    let mut command = if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(&gradlew);
        c
    } else {
        Command::new(&gradlew)
    };

    command
        .arg(&task)
        .arg("--console=plain")
        .current_dir(&project_dir)
        .env("GRADLE_USER_HOME", &gradle_home)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // Optional custom Java (Settings → Java). Derive JAVA_HOME from a
    // "<...>/bin/java" path; pass through as-is otherwise.
    if let Some(java) = custom_java_path.as_deref() {
        let java = java.trim();
        if !java.is_empty() {
            if let Some(home) = java
                .strip_suffix("/bin/java")
                .or_else(|| java.strip_suffix("\\bin\\java.exe"))
                .or_else(|| java.strip_suffix("\\bin\\java"))
            {
                command.env("JAVA_HOME", home);
            }
        }
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to launch gradlew: {e} (is Java installed?)"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Gradle opened without stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Gradle opened without stderr".to_string())?;

    registry()
        .lock()
        .unwrap()
        .insert(project_rel.clone(), child);

    // Reader threads: pipe lines to the frontend as they arrive
    let app_out = app.clone();
    let proj_out = project_rel.clone();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = app_out.emit(
                "build:log",
                BuildLogEvent {
                    project: proj_out.clone(),
                    stream: "stdout".into(),
                    line,
                },
            );
        }
    });

    let app_err = app.clone();
    let proj_err = project_rel.clone();
    std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            let _ = app_err.emit(
                "build:log",
                BuildLogEvent {
                    project: proj_err.clone(),
                    stream: "stderr".into(),
                    line,
                },
            );
        }
    });

    // Watcher: polls the child without holding the lock, emits the exit event
    let app_wait = app;
    let proj_wait = project_rel.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(250));

        let finished = {
            let mut reg = registry().lock().unwrap();
            match reg.get_mut(&proj_wait) {
                None => return, // stop_build already cleaned up or app shutdown
                Some(child) => match child.try_wait() {
                    Ok(Some(status)) => {
                        reg.remove(&proj_wait);
                        Some(status)
                    }
                    Ok(None) => None,
                    Err(_) => {
                        reg.remove(&proj_wait);
                        None
                    }
                },
            }
        };

        if let Some(status) = finished {
            let _ = app_wait.emit(
                "build:exit",
                BuildExitEvent {
                    project: proj_wait.clone(),
                    code: status.code(),
                    success: status.success(),
                },
            );
            return;
        }
    });

    Ok(project_rel)
}

/// Stops a running build (kill — the watcher thread emits the exit event).
#[tauri::command]
pub fn stop_build(project_rel: String) -> Result<(), String> {
    let mut reg = registry().lock().unwrap();
    match reg.get_mut(&project_rel) {
        Some(child) => {
            // Killing an already-dead child returns Err — harmless here
            let _ = child.kill();
            Ok(())
        }
        None => Err("No running build for this project".to_string()),
    }
}
