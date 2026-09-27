//! Project creation — the only place the app writes outside an existing
//! project tree. Validates input strictly, renders a whitelisted template
//! and initializes a git repository for snapshot support.

use super::templates::{self, TemplateTokens};
use crate::commands::git;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectPayload {
    pub storage_base: String,
    pub slug: String,
    pub name: String,
    pub template: String,
    pub mod_id: String,
    pub mod_id_class: String,
    pub package: String,
    pub description: String,
    pub license: String,
    pub author: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectResult {
    pub project_path: String,
    pub files_created: usize,
}

fn valid_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.len() <= 64
        && slug
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        && !slug.starts_with('-')
        && !slug.ends_with('-')
        && !slug.contains("--")
}

fn valid_package(package: &str) -> bool {
    !package.is_empty()
        && package.split('.').all(|part| {
            !part.is_empty()
                && part
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
        })
}

#[tauri::command]
pub fn create_project(payload: CreateProjectPayload) -> Result<CreateProjectResult, String> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }
    if !valid_slug(&payload.slug) {
        return Err(
            "Invalid slug: use lowercase letters, digits and single hyphens (max 64 chars)"
                .to_string(),
        );
    }
    if !valid_package(&payload.package) {
        return Err(
            "Invalid Java package: segments of lowercase letters/digits/underscores, e.g. com.nexuscraft.example"
                .to_string(),
        );
    }
    if !payload.mod_id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_') {
        return Err("Invalid mod id: lowercase letters, digits and underscores only".to_string());
    }

    // Resolve and lock the workspace root
    let base = PathBuf::from(&payload.storage_base)
        .canonicalize()
        .map_err(|e| format!("Storage location is not accessible: {e}"))?;

    let projects_root = base.join("projects");
    fs_ensure_dir(&projects_root)?;

    let project_dir = projects_root.join(&payload.slug);
    if project_dir.exists() {
        return Err(format!(
            "A project named \"{}\" already exists at {}",
            payload.slug,
            project_dir.display()
        ));
    }

    // Template — embedded in the binary, rendered per project
    let package_path = payload.package.replace('.', "/");
    let year = git::current_year();

    let tokens = TemplateTokens {
        mod_id: payload.mod_id.clone(),
        mod_id_class: payload.mod_id_class.clone(),
        mod_name: name.to_string(),
        slug: payload.slug.clone(),
        package: payload.package.clone(),
        package_path,
        entrypoint_class: format!("{}.{}", payload.package, payload.mod_id_class),
        author: if payload.author.trim().is_empty() {
            "Anonymous".to_string()
        } else {
            payload.author.trim().to_string()
        },
        description: if payload.description.trim().is_empty() {
            format!("{name} — a Minecraft mod")
        } else {
            payload.description.trim().to_string()
        },
        license: payload.license,
        year,
    };

    let files = templates::write_template(&payload.template, &tokens, &project_dir)?;

    // Initialize the project's git repository (snapshot backbone, AD-7).
    // Errors propagate — a project without git is not a valid project.
    let author = if payload.author.trim().is_empty() {
        "NexusCraft Studio".to_string()
    } else {
        payload.author.trim().to_string()
    };
    git::init_project_repo(&project_dir, &author)?;

    Ok(CreateProjectResult {
        project_path: project_dir.to_string_lossy().to_string(),
        files_created: files,
    })
}

fn fs_ensure_dir(path: &std::path::Path) -> Result<(), String> {
    std::fs::create_dir_all(path)
        .map_err(|e| format!("Failed to create {}: {e}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload(slug: &str) -> CreateProjectPayload {
        CreateProjectPayload {
            storage_base: String::new(), // filled per-test
            slug: slug.to_string(),
            name: "Dark Kingdom".to_string(),
            template: "fabric-1.20.1-mod".to_string(),
            mod_id: "dark_kingdom".to_string(),
            mod_id_class: "DarkKingdom".to_string(),
            package: "com.nexuscraft.darkkingdom".to_string(),
            description: "A dark medieval RPG mod".to_string(),
            license: "MIT".to_string(),
            author: "Test Author".to_string(),
        }
    }

    #[test]
    fn rejects_invalid_slugs_and_packages() {
        let mut p = payload("valid-slug");
        p.storage_base = std::env::temp_dir().to_string_lossy().to_string();
        p.slug = "Invalid Slug".to_string();
        assert!(create_project(p).is_err());

        let mut p = payload("valid-slug");
        p.storage_base = std::env::temp_dir().to_string_lossy().to_string();
        p.package = "Invalid.Package".to_string();
        assert!(create_project(p).is_err());
    }

    #[test]
    fn creates_project_with_git_and_template() {
        let base = std::env::temp_dir().join(format!("nexuscraft-proj-{}", std::process::id()));
        std::fs::create_dir_all(&base).unwrap();

        let mut p = payload("dark-kingdom");
        p.storage_base = base.to_string_lossy().to_string();

        let result = create_project(p).unwrap();
        let project_dir = std::path::PathBuf::from(&result.project_path);
        assert!(project_dir.join("build.gradle").is_file());
        assert!(project_dir
            .join("src/main/java/com/nexuscraft/darkkingdom/DarkKingdom.java")
            .is_file());
        assert!(project_dir.join(".git").is_dir(), "git repo must exist");
        assert!(result.files_created >= 16);

        // Duplicate slug must be refused
        let mut dup = payload("dark-kingdom");
        dup.storage_base = base.to_string_lossy().to_string();
        assert!(create_project(dup).is_err());

        let _ = std::fs::remove_dir_all(&base);
    }
}
