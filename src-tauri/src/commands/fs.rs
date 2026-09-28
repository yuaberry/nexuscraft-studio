//! Sandboxed project filesystem operations.
//!
//! Every command takes the storage `base_path` plus a **relative** path and
//! resolves the target inside the base — `..` components, absolute targets and
//! symlink escapes are rejected. This is the same guard the Nexus Agent will
//! inherit in Phase 3.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_TEXT_FILE_BYTES: u64 = 2 * 1024 * 1024; // 2 MB
const IGNORED_TOP_DIRS: [&str; 4] = [".git", "build", ".gradle", "run"];

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReadFileResult {
    pub content: String,
}

/// Validates a relative path against a base directory and returns the
/// canonicalized absolute target. `allow_missing` permits non-existent
/// targets (writes/creates) by canonicalizing the existing parent.
pub fn validated_path(base: &str, rel: &str, allow_missing: bool) -> Result<PathBuf, String> {
    let rel_clean = rel.trim().trim_start_matches('/');
    if rel_clean.is_empty() {
        return Err("Empty relative path".to_string());
    }
    if rel_clean.split(['/', '\\']).any(|c| c == "..") {
        return Err("Path traversal is not allowed".to_string());
    }

    let base_canon = fs::canonicalize(base)
        .map_err(|e| format!("Base path is not accessible: {e}"))?;

    let target = base_canon.join(rel_clean);
    if target.exists() {
        let canon = fs::canonicalize(&target)
            .map_err(|e| format!("Failed to resolve target: {e}"))?;
        if !canon.starts_with(&base_canon) {
            return Err("Path escapes the workspace".to_string());
        }
        return Ok(canon);
    }

    if !allow_missing {
        return Err(format!("Path does not exist: {rel_clean}"));
    }

    // Missing target: validate via its (existing) parent
    let parent = target
        .parent()
        .ok_or_else(|| "Invalid target path".to_string())?
        .to_path_buf();
    let parent_canon = fs::canonicalize(&parent)
        .map_err(|_| format!("Parent directory does not exist: {rel_clean}"))?;
    if !parent_canon.starts_with(&base_canon) {
        return Err("Path escapes the workspace".to_string());
    }
    let name = target
        .file_name()
        .ok_or_else(|| "Target must not end with a separator".to_string())?;
    Ok(parent_canon.join(name))
}

fn validate_rel_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name == "." || name == ".." {
        return Err("Invalid name".to_string());
    }
    if name.contains('/') || name.contains('\\') {
        return Err("Name must not contain path separators".to_string());
    }
    Ok(())
}

fn walk(dir: &Path, prefix: &str, out: &mut Vec<FileEntry>) -> Result<(), String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read {}: {e}", dir.display()))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Dir entry error: {e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        let rel = if prefix.is_empty() { name.clone() } else { format!("{prefix}/{name}") };
        let meta = entry.metadata().map_err(|e| format!("Stat error: {e}"))?;

        if meta.is_dir() {
            out.push(FileEntry {
                path: rel.clone(),
                is_dir: true,
                size_bytes: 0,
            });
            walk(&entry.path(), &rel, out)?;
        } else {
            out.push(FileEntry {
                path: rel,
                is_dir: false,
                size_bytes: meta.len(),
            });
        }
    }
    Ok(())
}

/// Lists all files of a project, skipping VCS/build artifacts at the root.
#[tauri::command]
pub fn list_project_files(base_path: String, project_rel: String) -> Result<Vec<FileEntry>, String> {
    let project = validated_path(&base_path, &project_rel, false)?;
    if !project.is_dir() {
        return Err("Project directory not found".to_string());
    }

    let mut out = Vec::new();
    let entries = fs::read_dir(&project)
        .map_err(|e| format!("Failed to read project root: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Dir entry error: {e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        let meta = entry.metadata().map_err(|e| format!("Stat error: {e}"))?;

        if meta.is_dir() {
            if IGNORED_TOP_DIRS.contains(&name.as_str()) {
                continue;
            }
            out.push(FileEntry {
                path: name.clone(),
                is_dir: true,
                size_bytes: 0,
            });
            walk(&entry.path(), &name, &mut out)?;
        } else {
            out.push(FileEntry {
                path: name,
                is_dir: false,
                size_bytes: meta.len(),
            });
        }
    }

    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

/// Reads a UTF-8 text file. Binary or oversized files are refused with a
/// clear error instead of corrupting the editor buffer.
#[tauri::command]
pub fn read_project_file(
    base_path: String,
    rel: String,
) -> Result<ReadFileResult, String> {
    let target = validated_path(&base_path, &rel, false)?;
    if !target.is_file() {
        return Err("Not a file".to_string());
    }

    let meta = fs::metadata(&target).map_err(|e| format!("Stat failed: {e}"))?;
    if meta.len() > MAX_TEXT_FILE_BYTES {
        return Err(format!(
            "File is too large to open in the editor ({} KB > 2048 KB)",
            meta.len() / 1024
        ));
    }

    let bytes = fs::read(&target).map_err(|e| format!("Failed to read file: {e}"))?;
    if bytes.contains(&0u8) {
        return Err("This looks like a binary file — the editor only opens text files".to_string());
    }
    let content = String::from_utf8(bytes)
        .map_err(|_| "File is not valid UTF-8 text".to_string())?;
    Ok(ReadFileResult { content })
}

#[tauri::command]
pub fn write_project_file(base_path: String, rel: String, content: String) -> Result<(), String> {
    let target = validated_path(&base_path, &rel, true)?;
    fs::write(&target, content).map_err(|e| format!("Failed to write file: {e}"))
}

#[tauri::command]
pub fn create_project_directory(base_path: String, rel: String) -> Result<(), String> {
    let target = validated_path(&base_path, &rel, true)?;
    fs::create_dir_all(&target).map_err(|e| format!("Failed to create directory: {e}"))
}

#[tauri::command]
pub fn delete_project_entry(base_path: String, rel: String) -> Result<(), String> {
    let target = validated_path(&base_path, &rel, false)?;

    // Refuse to delete the project root itself via relative empty-ish paths
    let base_canon = fs::canonicalize(&base_path)
        .map_err(|e| format!("Base path error: {e}"))?;
    if target == base_canon {
        return Err("Refusing to delete the workspace root".to_string());
    }

    if target.is_dir() {
        fs::remove_dir_all(&target).map_err(|e| format!("Failed to delete directory: {e}"))
    } else {
        fs::remove_file(&target).map_err(|e| format!("Failed to delete file: {e}"))
    }
}

#[tauri::command]
pub fn rename_project_entry(
    base_path: String,
    rel: String,
    new_name: String,
) -> Result<(), String> {
    validate_rel_name(new_name.trim())?;
    let target = validated_path(&base_path, &rel, false)?;

    let new_name = new_name.trim();
    let parent = target
        .parent()
        .ok_or_else(|| "Invalid source path".to_string())?
        .to_path_buf();
    let destination = parent.join(new_name);
    if destination.exists() {
        return Err(format!("\"{new_name}\" already exists"));
    }
    fs::rename(&target, &destination)
        .map_err(|e| format!("Failed to rename: {e}"))
}

// ---------------------------------------------------------------------------
// Reference Board support (Fase 2) — binary-safe reads and user-initiated
// imports. Same path-guard rules as the rest of the module.
// ---------------------------------------------------------------------------

const MAX_BINARY_FILE_BYTES: u64 = 10 * 1024 * 1024; // 10 MB
const MAX_IMPORT_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileBase64 {
    pub data: String,
    pub media_type: String,
    pub size_bytes: u64,
}

fn media_type_for(name: &str) -> String {
    let lower = name.to_ascii_lowercase();
    if lower.ends_with(".png") {
        "image/png".to_string()
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg".to_string()
    } else if lower.ends_with(".webp") {
        "image/webp".to_string()
    } else if lower.ends_with(".gif") {
        "image/gif".to_string()
    } else {
        "application/octet-stream".to_string()
    }
}

fn base64_encode(data: &[u8]) -> String {
    // Minimal, dependency-free base64 (standard alphabet, padded)
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b = [chunk[0], *chunk.get(1).unwrap_or(&0), *chunk.get(2).unwrap_or(&0)];
        let triple = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        out.push(TABLE[(triple >> 18) as usize & 63] as char);
        out.push(TABLE[(triple >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 {
            TABLE[(triple >> 6) as usize & 63] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[triple as usize & 63] as char
        } else {
            '='
        });
    }
    out
}

/// Reads a binary file inside a project as base64 (for the AI vision layer).
#[tauri::command]
pub fn read_project_file_base64(
    base_path: String,
    rel: String,
) -> Result<FileBase64, String> {
    let target = validated_path(&base_path, &rel, false)?;
    if !target.is_file() {
        return Err("Not a file".to_string());
    }
    let meta = fs::metadata(&target).map_err(|e| format!("Stat failed: {e}"))?;
    if meta.len() > MAX_BINARY_FILE_BYTES {
        return Err("Reference image is too large (max 10 MB)".to_string());
    }

    let name = target
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let bytes = fs::read(&target).map_err(|e| format!("Failed to read file: {e}"))?;
    Ok(FileBase64 {
        data: base64_encode(&bytes),
        media_type: media_type_for(&name),
        size_bytes: bytes.len() as u64,
    })
}

/// Copies a user-chosen file (from a native dialog) into the project tree.
/// The destination goes through the full path guard; the source is read-only.
#[tauri::command]
pub fn import_project_file(
    base_path: String,
    project_rel: String,
    dest_rel: String,
    source_path: String,
) -> Result<(), String> {
    let source = PathBuf::from(source_path.trim());
    if !source.is_absolute() {
        return Err("Source path must be absolute".to_string());
    }
    let meta = fs::metadata(&source)
        .map_err(|e| format!("Source file is not accessible: {e}"))?;
    if !meta.is_file() {
        return Err("Source must be a file".to_string());
    }
    if meta.len() > MAX_IMPORT_BYTES {
        return Err("File is too large to import (max 10 MB)".to_string());
    }

    // Destination: validated relative to the storage base, inside the project
    let dest_full_rel = format!("{project_rel}/{dest_rel}");
    let target = validated_path(&base_path, &dest_full_rel, true)?;

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
    }

    fs::copy(&source, &target)
        .map(|_| ())
        .map_err(|e| {
            format!(
                "Failed to import into {}: {e}",
                target.display()
            )
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_encoding_matches_standard() {
        assert_eq!(base64_encode(b"hello"), "aGVsbG8=");
        assert_eq!(base64_encode(b"hell"), "aGVsbA==");
        assert_eq!(base64_encode(b"he"), "aGU=");
        assert_eq!(base64_encode(b"h"), "aA==");
        // RFC 4648 test vector
        assert_eq!(base64_encode(b"foobar"), "Zm9vYmFy");
    }

    #[test]
    fn rejects_traversal_in_validated_path() {
        let base = std::env::temp_dir().join(format!("nexuscraft-guard-{}", std::process::id()));
        fs::create_dir_all(&base).unwrap();
        let err = validated_path(
            base.to_string_lossy().as_ref(),
            "projects/x/../../etc/passwd",
            false,
        );
        assert!(err.is_err());
        let _ = fs::remove_dir_all(&base);
    }
}
