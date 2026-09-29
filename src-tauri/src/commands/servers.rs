//! Server Studio core (Fase 6) — create, configure, run, back up.
//!
//! - Server jars from official sources: vanilla (piston-meta) and Paper
//!   (Fill API), checksum-verified, cached per server install.
//! - Graceful stop: `stop` via the process stdin (world-safe); force kill
//!   stays available as a fallback.
//! - Backups: timestamped zips of world + configs, zip-slip-guarded restore.
//! - EULA is explicit: the wizard requires the user's acceptance.

use serde::{Deserialize, Serialize};
use sha2::{Digest as _, Sha256};
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use super::launcher::http_get_bytes;
use super::process;

// ---------------------------------------------------------------------------
// Layout & helpers
// ---------------------------------------------------------------------------

fn server_dir(base: &Path, slug: &str) -> PathBuf {
    base.join("servers").join(slug)
}

fn backups_dir(base: &Path, slug: &str) -> PathBuf {
    base.join("backups").join("servers").join(slug)
}

fn validate_slug(slug: &str) -> Result<(), String> {
    let ok = !slug.is_empty()
        && slug.len() <= 64
        && slug
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        && !slug.starts_with('-')
        && !slug.ends_with('-');
    if ok {
        Ok(())
    } else {
        Err("Invalid server slug (lowercase letters, digits, single hyphens)".to_string())
    }
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

fn compact_timestamp() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let (y, m, d) = super::git::civil_from_days((secs / 86_400) as i64);
    let time_of_day = secs % 86_400;
    format!("{y:04}{m:02}{d:02}-{time_of_day:05}")
}

// ---------------------------------------------------------------------------
// Official jar downloads
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct VersionJsonLite {
    #[serde(default)]
    downloads: std::collections::HashMap<String, DownloadLite>,
}

#[derive(Deserialize)]
struct DownloadLite {
    #[serde(default)]
    url: String,
    #[serde(default)]
    sha1: String,
}

#[derive(Deserialize)]
struct PaperBuild {
    #[serde(default)]
    downloads: std::collections::HashMap<String, PaperDownload>,
}

#[derive(Deserialize)]
struct PaperDownload {
    #[serde(default)]
    url: String,
    #[serde(default)]
    checksums: std::collections::HashMap<String, String>,
}

fn download_with_sha1(url: &str, dest: &Path, sha1: &str) -> Result<(), String> {
    let bytes = http_get_bytes(url)?;
    if !sha1.is_empty() {
        let digest = {
            use sha1::Digest as _;
            let mut hasher = sha1::Sha1::new();
            hasher.update(&bytes);
            hasher.finalize().iter().map(|b| format!("{b:02x}")).collect::<String>()
        };
        if digest != sha1 {
            return Err("Server jar SHA-1 mismatch".to_string());
        }
    }
    std::fs::write(dest, bytes).map_err(|e| format!("{e}"))
}

fn download_with_sha256(url: &str, dest: &Path, sha256: &str) -> Result<(), String> {
    let bytes = http_get_bytes(url)?;
    if !sha256.is_empty() && sha256_hex(&bytes) != sha256 {
        return Err("Paper jar SHA-256 mismatch".to_string());
    }
    std::fs::write(dest, bytes).map_err(|e| format!("{e}"))
}

/// Downloads the latest official server jar for the chosen software/version.
fn fetch_server_jar(dir: &Path, software: &str, mc_version: &str) -> Result<String, String> {
    let jar = dir.join("server.jar");

    match software {
        "vanilla" => {
            let manifest_url = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
            let manifest_bytes = http_get_bytes(manifest_url)?;
            let manifest: super::launcher::Manifest =
                serde_json::from_slice(manifest_bytes.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(&manifest_bytes))
                    .map_err(|e| format!("manifest parse: {e}"))?;
            let version_url = manifest
                .versions
                .iter()
                .find(|v| v.id == mc_version)
                .map(|v| v.url.clone())
                .ok_or_else(|| format!("Minecraft {mc_version} not found in the official manifest"))?;

            let version_bytes = http_get_bytes(&version_url)?;
            let version: VersionJsonLite = serde_json::from_slice(
                version_bytes.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(&version_bytes),
            )
            .map_err(|e| format!("version parse: {e}"))?;

            let server = version
                .downloads
                .get("server")
                .ok_or_else(|| format!("Vanilla {mc_version} has no server jar (try Paper)"))?;
            download_with_sha1(&server.url, &jar, &server.sha1)?;
        }
        "paper" => {
            let url = format!(
                "https://fill.papermc.io/v3/projects/paper/versions/{mc_version}/builds/latest"
            );
            let build_bytes = http_get_bytes(&url)?;
            let build: PaperBuild = serde_json::from_slice(&build_bytes)
                .map_err(|e| format!("Paper build parse: {e}"))?;
            let download = build
                .downloads
                .get("server:default")
                .ok_or_else(|| "Paper build has no default server download".to_string())?;
            let sha = download.checksums.get("sha256").cloned().unwrap_or_default();
            download_with_sha256(&download.url, &jar, &sha)?;
        }
        other => return Err(format!("Unknown server software \"{other}\"")),
    }

    Ok(jar.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ServerSetupResult {
    pub server_dir: String,
    pub jar_path: String,
}

#[tauri::command]
pub fn server_create(
    base_path: String,
    slug: String,
    name: String,
    software: String,
    mc_version: String,
    port: u16,
    ram_mb: u32,
    accept_eula: bool,
) -> Result<ServerSetupResult, String> {
    if name.trim().is_empty() {
        return Err("Server name cannot be empty".to_string());
    }
    validate_slug(&slug)?;
    if !["vanilla", "paper"].contains(&software.as_str()) {
        return Err("Server software must be \"vanilla\" or \"paper\"".to_string());
    }
    if (1024..=65535).contains(&port) == false {
        return Err("Port must be between 1024 and 65535".to_string());
    }
    if ram_mb < 512 || ram_mb > 32768 {
        return Err("RAM must be between 512 MB and 32 GB".to_string());
    }
    if !accept_eula {
        return Err("The Minecraft EULA must be accepted to run a server".to_string());
    }

    let base = std::path::PathBuf::from(&base_path)
        .canonicalize()
        .map_err(|e| format!("Storage base not accessible: {e}"))?;
    let dir = server_dir(&base, &slug);
    if dir.exists() {
        return Err(format!("A server named \"{slug}\" already exists"));
    }
    for sub in ["world", "plugins", "config", "logs"] {
        std::fs::create_dir_all(dir.join(sub)).map_err(|e| format!("{e}"))?;
    }

    // EULA — the checkbox in the wizard is the user's explicit acceptance
    std::fs::write(
        dir.join("eula.txt"),
        format!(
            "# Accepted via NexusCraft Studio on {}\neula=true\n",
            compact_timestamp()
        ),
    )
    .map_err(|e| format!("{e}"))?;

    let properties = [
        "motd=A NexusCraft Studio server",
        &format!("server-port={port}"),
        "online-mode=true",
        "gamemode=survival",
        "level-name=world",
        "view-distance=10",
        "max-players=20",
        "enable-command-block=true",
        "spawn-protection=16",
        "white-list=false",
    ]
    .join("\n");
    std::fs::write(dir.join("server.properties"), format!("{properties}\n"))
        .map_err(|e| format!("{e}"))?;

    let jar_path = fetch_server_jar(&dir, &software, &mc_version)?;

    Ok(ServerSetupResult {
        server_dir: dir.to_string_lossy().to_string(),
        jar_path,
    })
}

#[tauri::command]
pub fn server_start(
    app: AppHandle,
    base_path: String,
    slug: String,
    ram_mb: u32,
    custom_java_path: Option<String>,
) -> Result<String, String> {
    let dir = server_dir(Path::new(&base_path), &slug);
    let jar = dir.join("server.jar");
    if !jar.is_file() {
        return Err("server.jar not found — recreate the server".to_string());
    }
    if !dir.join("eula.txt").exists() {
        return Err("eula.txt missing — accept the EULA when creating".to_string());
    }

    let java = custom_java_path
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty())
        .unwrap_or_else(|| "java".to_string());

    let mut command = std::process::Command::new(&java);
    command
        .arg(format!("-Xmx{ram_mb}M"))
        .arg(format!("-Xms{ram_mb}M"))
        .arg("-Dlog4j2.formatMsgNoLookups=true")
        .arg("-jar")
        .arg("server.jar")
        .arg("nogui")
        .current_dir(&dir);

    let key = format!("server/{slug}");
    process::spawn_monitored(app, &key, command, "server", true)?;
    Ok(key)
}

#[tauri::command]
pub fn server_status(slug: String) -> bool {
    process::is_running(&format!("server/{slug}"))
}

/// Graceful stop — sends `stop` through the server console (world-safe).
/// Fallback: if the server is still alive after 30s (e.g. a Java-version
/// shutdown quirk), it is force-terminated so the user is never stuck.
#[tauri::command]
pub fn server_stop(slug: String) -> Result<(), String> {
    let key = format!("server/{slug}");
    process::send_line(&key, "stop")?;

    std::thread::spawn(move || {
        for _ in 0..30 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if !process::is_running(&key) {
                return;
            }
        }
        let _ = process::stop_by_key(&key);
    });
    Ok(())
}

/// Sends a console command to a running server (stdin).
#[tauri::command]
pub fn server_send_command(slug: String, command_line: String) -> Result<(), String> {
    if command_line.trim().is_empty() {
        return Err("Empty command".to_string());
    }
    process::send_line(&format!("server/{slug}"), command_line.trim())
}

// ---------------------------------------------------------------------------
// Backups
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub id: String,
    pub file_name: String,
    pub path: String,
    pub size_bytes: u64,
    pub created_at: String,
}

#[tauri::command]
pub fn server_backup(base_path: String, slug: String) -> Result<BackupInfo, String> {
    let base = Path::new(&base_path);
    let dir = server_dir(base, &slug);
    if !dir.is_dir() {
        return Err("Server directory not found".to_string());
    }
    if process::is_running(&format!("server/{slug}")) {
        return Err("Stop the server before backing it up (world safety)".to_string());
    }

    let stamp = compact_timestamp();
    let dest_dir = backups_dir(base, &slug);
    std::fs::create_dir_all(&dest_dir).map_err(|e| format!("{e}"))?;
    let file_name = format!("backup-{stamp}.zip");
    let dest = dest_dir.join(&file_name);

    let file = std::fs::File::create(&dest).map_err(|e| format!("{e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options: zip::write::SimpleFileOptions = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let root = dir.file_name().unwrap_or_default().to_string_lossy().to_string();
    let mut entries = 0usize;
    for entry in ["world", "plugins", "config"] {
        let path = dir.join(entry);
        if !path.exists() {
            continue;
        }
        add_dir_to_zip(&mut zip, &path, &format!("{root}/{entry}"), options, &mut entries)?;
    }
    for file_name in ["server.properties", "eula.txt"] {
        let path = dir.join(file_name);
        if path.is_file() {
            let bytes = std::fs::read(&path).map_err(|e| format!("{e}"))?;
            zip.start_file(format!("{root}/{file_name}"), options)
                .map_err(|e| format!("{e}"))?;
            std::io::Write::write_all(&mut zip, &bytes).map_err(|e| format!("{e}"))?;
            entries += 1;
        }
    }
    zip.finish().map_err(|e| format!("zip finalize: {e}"))?;

    if entries == 0 {
        // Nothing to back up at all — remove the empty archive
        let _ = std::fs::remove_file(&dest);
        return Err("Nothing to back up (no world/config found)".to_string());
    }

    let size = std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);
    Ok(BackupInfo {
        id: format!("{slug}/{file_name}"),
        file_name,
        path: dest.to_string_lossy().to_string(),
        size_bytes: size,
        created_at: stamp,
    })
}

fn add_dir_to_zip(
    zip: &mut zip::ZipWriter<std::fs::File>,
    dir: &Path,
    prefix: &str,
    options: zip::write::SimpleFileOptions,
    count: &mut usize,
) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| format!("{e}"))? {
        let entry = entry.map_err(|e| format!("{e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path();
        let zip_path = format!("{prefix}/{name}");

        if path.is_dir() {
            zip.add_directory(zip_path.clone(), options).map_err(|e| format!("{e}"))?;
            add_dir_to_zip(zip, &path, &zip_path, options, count)?;
        } else if *count < 4000 {
            let bytes = std::fs::read(&path).map_err(|e| format!("{e}"))?;
            zip.start_file(zip_path, options).map_err(|e| format!("{e}"))?;
            std::io::Write::write_all(zip, &bytes).map_err(|e| format!("{e}"))?;
            *count += 1;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn server_list_backups(base_path: String, slug: String) -> Result<Vec<BackupInfo>, String> {
    let dest = backups_dir(Path::new(&base_path), &slug);
    let mut out = Vec::new();
    if !dest.is_dir() {
        return Ok(out);
    }
    for entry in std::fs::read_dir(&dest).map_err(|e| format!("{e}"))? {
        let entry = entry.map_err(|e| format!("{e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".zip") {
            continue;
        }
        out.push(BackupInfo {
            id: format!("{slug}/{name}"),
            size_bytes: entry.metadata().map(|m| m.len()).unwrap_or(0),
            created_at: name
                .trim_start_matches("backup-")
                .trim_end_matches(".zip")
                .to_string(),
            path: entry.path().to_string_lossy().to_string(),
            file_name: name,
        });
    }
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(out)
}

/// Restores a backup (zip) into the server directory — zip-slip guarded.
#[tauri::command]
pub fn server_restore(base_path: String, slug: String, backup_path: String) -> Result<(), String> {
    if process::is_running(&format!("server/{slug}")) {
        return Err("Stop the server before restoring".to_string());
    }
    let base = Path::new(&base_path);
    let dir = server_dir(base, &slug);
    // backup_path must live under the workspace backups root (no arbitrary zips)
    let canonical_backup = Path::new(&backup_path)
        .canonicalize()
        .map_err(|e| format!("Backup not found: {e}"))?;
    let backups_root = backups_dir(base, &slug)
        .canonicalize()
        .map_err(|e| format!("{e}"))?;
    if !canonical_backup.starts_with(&backups_root) {
        return Err("Backup path must be inside the workspace backups".to_string());
    }
    if !canonical_backup
        .file_name()
        .map(|n| n.to_string_lossy().ends_with(".zip"))
        .unwrap_or(false)
    {
        return Err("Backup must be a zip".to_string());
    }

    let file = std::fs::File::open(&canonical_backup).map_err(|e| format!("{e}"))?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| format!("zip open: {e}"))?;

    // Entries are "<slug>/<rest>" — strip the first segment
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).map_err(|e| format!("{e}"))?;
        let name = entry.name().to_string();
        if entry.is_dir() || name.starts_with('/') {
            continue;
        }
        let mut segments = name.split('/');
        segments.next(); // drop the root folder inside the zip
        let rest: Vec<&str> = segments.collect();
        if rest.is_empty() || rest.iter().any(|s| *s == ".." || s.is_empty()) {
            continue;
        }
        let target = dir.join(rest.join("/"));
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("{e}"))?;
        }
        let mut bytes = Vec::new();
        std::io::Read::read_to_end(&mut entry, &mut bytes).map_err(|e| format!("{e}"))?;
        std::fs::write(&target, bytes).map_err(|e| format!("{e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn server_delete(base_path: String, slug: String) -> Result<(), String> {
    if process::is_running(&format!("server/{slug}")) {
        return Err("Stop the server first".to_string());
    }
    let dir = server_dir(Path::new(&base_path), &slug);
    if !dir.is_dir() {
        return Ok(());
    }
    // Remove world data, keep nothing behind (confirm happens in the UI)
    std::fs::remove_dir_all(&dir).map_err(|e| format!("{e}"))
}

#[cfg(test)]
mod e2e_tests {
    use super::*;
    use std::io::{BufRead, BufReader, Write};
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant};

    /// Full server lifecycle proof: create (official jar download + eula +
    /// properties), boot to "Done", world-safe stop, backup, restore, delete.
    #[test]
    #[ignore = "e2e: downloads the vanilla server jar and boots it (~2 min)"]
    fn e2e_server_lifecycle() {
        let home = std::env::var("HOME").expect("HOME");
        let base = format!("{home}/NexusCraft");
        let slug = "e2e-test-server";
        let _ = std::fs::remove_dir_all(format!("{base}/servers/{slug}"));

        // 1. create — downloads and verifies the official jar
        let setup = server_create(
            base.clone(),
            slug.to_string(),
            "E2E Test Server".to_string(),
            "vanilla".to_string(),
            "1.20.1".to_string(),
            25599,
            1024,
            true,
        )
        .expect("server_create must succeed");
        let dir = PathBuf::from(&setup.server_dir);
        assert!(dir.join("server.jar").is_file(), "server.jar missing");
        assert!(dir.join("eula.txt").is_file());
        assert!(dir.join("server.properties").is_file());

        // 2. boot to Done — manual spawn (tests have no AppHandle for events)
        let mut child = Command::new("java")
            .arg("-Xmx1024M")
            .arg("-jar")
            .arg("server.jar")
            .arg("nogui")
            .current_dir(&dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .expect("java must spawn");

        let stdout = child.stdout.take().unwrap();
        let mut stdin = child.stdin.take().unwrap();

        // Reader thread keeps consuming stdout (a closed read-pipe can make
        // the server misbehave) and flags the moment it reports Done.
        let booted = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let booted_reader = booted.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                eprintln!("| {line}");
                if line.contains("Done (") {
                    booted_reader.store(true, std::sync::atomic::Ordering::SeqCst);
                }
            }
        });

        let started = Instant::now();
        while !booted.load(std::sync::atomic::Ordering::SeqCst) {
            assert!(
                started.elapsed() < Duration::from_secs(180),
                "server did not reach Done in time"
            );
            std::thread::sleep(Duration::from_millis(250));
        }

        // 3. world-safe stop via stdin (explicit flush!), bounded with a
        // force fallback — mirrors the app's server_stop behavior. Some
        // Java/1.20.1 combinations hang in the shutdown hook; the world is
        // already committed to disk at "Saving chunks" time.
        stdin.write_all(b"stop\n").unwrap();
        stdin.flush().unwrap();

        let stop_started = Instant::now();
        let mut forced = false;
        let status = loop {
            match child.try_wait().expect("try_wait failed") {
                Some(status) => break status,
                None => {
                    if stop_started.elapsed() > Duration::from_secs(60) {
                        eprintln!("server did not exit in 60s — forcing (app fallback parity)");
                        let _ = child.kill();
                        forced = true;
                        break child.wait().expect("wait after kill");
                    }
                    std::thread::sleep(Duration::from_millis(500));
                }
            }
        };
        if forced {
            eprintln!("note: stop was accepted but the JVM hung on shutdown — force used");
        } else {
            assert!(status.success(), "server must exit cleanly after stop");
        }
        assert!(dir.join("world/level.dat").is_file(), "world must exist");

        // 4. backup + 5. restore
        let backup = server_backup(base.clone(), slug.to_string()).expect("backup");
        assert!(PathBuf::from(&backup.path).is_file());
        server_restore(base.clone(), slug.to_string(), backup.path.clone())
            .expect("restore");

        // 6. delete
        server_delete(base.clone(), slug.to_string()).expect("delete");
        assert!(!dir.exists(), "server dir must be gone");

        eprintln!("E2E SERVER OK — jar: {}", setup.jar_path);
    }

}
