//! Project template engine.
//!
//! Templates are embedded in the binary (see `templates_embed.rs`). Token
//! placeholders (`{{LIKE_THIS}}`) are replaced in file/directory names and in
//! text file contents; binaries are written verbatim.

use super::templates_embed;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq)]
pub struct TemplateTokens {
    pub mod_id: String,
    pub mod_id_class: String,
    pub mod_name: String,
    pub slug: String,
    pub package: String,
    pub package_path: String,
    pub entrypoint_class: String,
    pub author: String,
    pub description: String,
    pub license: String,
    pub year: String,
    // Version Adapter Layer (resolved by the version catalog)
    pub mc_version: String,
    pub java_release: u32,
    pub java_enum: String,
    pub java_min: String,
    pub yarn_mappings: String,
    pub loader_version: String,
    pub loader_min: String,
    pub fabric_api_version: String,
    pub mc_depends: String,
    pub mappings_line: String,
}

impl TemplateTokens {
    pub fn pairs(&self) -> Vec<(String, String)> {
        vec![
            ("{{MOD_ID_CLASS}}".to_string(), self.mod_id_class.clone()),
            ("{{ENTRYPOINT_CLASS}}".to_string(), self.entrypoint_class.clone()),
            ("{{PACKAGE_PATH}}".to_string(), self.package_path.clone()),
            ("{{MOD_ID}}".to_string(), self.mod_id.clone()),
            ("{{MOD_NAME}}".to_string(), self.mod_name.clone()),
            ("{{MAVEN_GROUP}}".to_string(), self.package.clone()),
            ("{{PACKAGE}}".to_string(), self.package.clone()),
            ("{{DESCRIPTION}}".to_string(), self.description.clone()),
            ("{{AUTHOR}}".to_string(), self.author.clone()),
            ("{{LICENSE}}".to_string(), self.license.clone()),
            ("{{SLUG}}".to_string(), self.slug.clone()),
            ("{{YEAR}}".to_string(), self.year.clone()),
            ("{{YARN_MAPPINGS}}".to_string(), self.yarn_mappings.clone()),
            ("{{MAPPINGS_LINE}}".to_string(), self.mappings_line.clone()),
            ("{{LOADER_VERSION}}".to_string(), self.loader_version.clone()),
            ("{{LOADER_MIN}}".to_string(), self.loader_min.clone()),
            ("{{FABRIC_API_VERSION}}".to_string(), self.fabric_api_version.clone()),
            ("{{MC_DEPENDS}}".to_string(), self.mc_depends.clone()),
            ("{{MC_VERSION}}".to_string(), self.mc_version.clone()),
            ("{{JAVA_RELEASE}}".to_string(), self.java_release.to_string()),
            ("{{JAVA_ENUM}}".to_string(), self.java_enum.clone()),
            ("{{JAVA_MIN}}".to_string(), self.java_min.clone()),
        ]
    }
}

/// Replaces every `{{TOKEN}}` occurrence in a string.
pub fn render_string(tokens: &TemplateTokens, input: &str) -> String {
    let mut out = input.to_string();
    for (token, value) in tokens.pairs() {
        out = out.replace(&token, &value);
    }
    out
}

/// Extensions that must be written byte-for-byte (never token-rendered).
fn is_binary_path(name: &str) -> bool {
    const BINARY_EXTENSIONS: [&str; 12] = [
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".icns", ".jar", ".zip", ".ttf", ".woff",
        ".woff2", ".bin",
    ];
    let lower = name.to_ascii_lowercase();
    BINARY_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

/// Writes the full embedded template into `to`, rendering tokens in both
/// paths and text contents. Returns the number of files written.
pub fn write_template(
    template_id: &str,
    tokens: &TemplateTokens,
    to: &Path,
) -> Result<usize, String> {
    let files = templates_embed::template_files(template_id)?;
    fs::create_dir_all(to)
        .map_err(|e| format!("Failed to create {}: {e}", to.display()))?;

    let mut count = 0usize;
    for file in files {
        let rendered_path = render_string(tokens, file.path);
        let target = safe_join(to, &rendered_path)?;

        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
        }

        if is_binary_path(&rendered_path) {
            fs::write(&target, file.bytes)
                .map_err(|e| format!("Failed to write {}: {e}", target.display()))?;
        } else {
            let content = std::str::from_utf8(file.bytes).map_err(|_| {
                format!("Template file \"{}\" is not valid UTF-8", file.path)
            })?;
            let rendered = render_string(tokens, content);
            fs::write(&target, rendered)
                .map_err(|e| format!("Failed to write {}: {e}", target.display()))?;

            // The gradle wrapper must stay executable after template rendering
            if rendered_path == "gradlew" {
                make_executable(&target)?;
            }
        }
        count += 1;
    }
    Ok(count)
}

/// Marks a file as executable (Unix). The template's gradlew is text — the
/// exec bit must be restored after rendering.
fn make_executable(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(path)
            .map_err(|e| format!("stat failed for {}: {e}", path.display()))?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms)
            .map_err(|e| format!("chmod failed for {}: {e}", path.display()))?;
    }
    #[cfg(not(unix))]
    let _ = path;
    Ok(())
}

/// Joins a rendered template-relative path onto a destination root while
/// refusing traversal and absolute segments (defense in depth — tokens are
/// app-controlled, but the guard stays anyway).
fn safe_join(root: &Path, rel: &str) -> Result<PathBuf, String> {
    for segment in rel.split(['/', '\\']) {
        if segment == ".." {
            return Err("Template path traversal refused".to_string());
        }
    }
    Ok(root.join(rel))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_tokens() -> TemplateTokens {
        TemplateTokens {
            mod_id: "dark_kingdom".to_string(),
            mod_id_class: "DarkKingdom".to_string(),
            mod_name: "Dark Kingdom".to_string(),
            slug: "dark-kingdom".to_string(),
            package: "com.nexuscraft.darkkingdom".to_string(),
            package_path: "com/nexuscraft/darkkingdom".to_string(),
            entrypoint_class: "com.nexuscraft.darkkingdom.DarkKingdom".to_string(),
            author: "Test Author".to_string(),
            description: "A test mod".to_string(),
            license: "MIT".to_string(),
            year: "2026".to_string(),
            mc_version: "1.20.1".to_string(),
            java_release: 17,
            java_enum: "17".to_string(),
            java_min: ">=17".to_string(),
            yarn_mappings: "1.20.1+build.10".to_string(),
            loader_version: "0.16.9".to_string(),
            loader_min: ">=0.16.0".to_string(),
            fabric_api_version: "0.92.2+1.20.1".to_string(),
            mc_depends: "~1.20.1".to_string(),
            mappings_line: "mappings \"net.fabricmc:yarn:1.20.1+build.10:v2\"".to_string(),
        }
    }

    #[test]
    fn renders_all_tokens() {
        let tokens = sample_tokens();
        let input = "id={{MOD_ID}} class={{MOD_ID_CLASS}} pkg={{PACKAGE}} entry={{ENTRYPOINT_CLASS}} name={{MOD_NAME}}";
        let out = render_string(&tokens, input);
        assert_eq!(
            out,
            "id=dark_kingdom class=DarkKingdom pkg=com.nexuscraft.darkkingdom entry=com.nexuscraft.darkkingdom.DarkKingdom name=Dark Kingdom"
        );
    }

    #[test]
    fn no_leftover_tokens_in_rendered_content() {
        let tokens = sample_tokens();
        let out = render_string(&tokens, "{{MOD_ID}} {{SLUG}} {{YEAR}}");
        assert!(!out.contains("{{"), "leftover tokens in: {out}");
    }

    #[test]
    fn writes_full_fabric_template() {
        let tokens = sample_tokens();
        let base = std::env::temp_dir().join(format!("nexuscraft-tpl-{}", std::process::id()));
        let dst = base.join("dark-kingdom");

        let count = write_template("fabric-1.20.1-mod", &tokens, &dst).unwrap();
        assert!(count >= 16, "expected >= 16 files, wrote {count}");

        // Rendered java entrypoint exists at the package path
        let java = dst.join("src/main/java/com/nexuscraft/darkkingdom/DarkKingdom.java");
        assert!(java.is_file(), "entrypoint must exist at package path");
        let content = fs::read_to_string(&java).unwrap();
        assert!(content.contains("package com.nexuscraft.darkkingdom;"));
        assert!(content.contains("dark_kingdom"));

        // Asset dir renamed by mod id
        assert!(dst.join("src/main/resources/assets/dark_kingdom/lang/en_us.json").is_file());

        // Gradle properties rendered
        let props = fs::read_to_string(dst.join("gradle.properties")).unwrap();
        assert!(props.contains("maven_group=com.nexuscraft.darkkingdom"));
        assert!(props.contains("archives_base_name=dark-kingdom"));
        assert!(props.contains("minecraft_version=1.20.1"));
        assert!(props.contains("yarn_mappings=1.20.1+build.10"));
        assert!(props.contains("loader_version=0.16.9"));
        assert!(props.contains("fabric_version=0.92.2+1.20.1"));

        // build.gradle targets the right Java release + mappings line
        let gradle = fs::read_to_string(dst.join("build.gradle")).unwrap();
        assert!(gradle.contains("it.options.release = 17"));
        assert!(gradle.contains("JavaVersion.VERSION_17"));
        assert!(gradle.contains("mappings \"net.fabricmc:yarn:1.20.1+build.10:v2\""));

        // .nexus project spec embedded + valid JSON with numeric java_release
        let spec_raw = fs::read_to_string(dst.join(".nexus/project-spec.json")).unwrap();
        let spec: serde_json::Value = serde_json::from_str(&spec_raw).unwrap();
        assert_eq!(spec["minecraft_version"], "1.20.1");
        assert_eq!(spec["build_configuration"]["java_release"], 17);

        // fabric.mod.json is valid JSON with rendered id
        let mod_json = fs::read_to_string(dst.join("src/main/resources/fabric.mod.json")).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&mod_json).unwrap();
        assert_eq!(parsed["id"], "dark_kingdom");

        // Wrapper jar copied verbatim (binary)
        let jar = dst.join("gradle/wrapper/gradle-wrapper.jar");
        assert!(jar.is_file());

        // gradlew must remain executable (unix)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = fs::metadata(dst.join("gradlew")).unwrap().permissions().mode();
            assert!(mode & 0o111 != 0, "gradlew must be executable, got mode {mode:o}");
        }

        // No token leftovers anywhere in the tree
        assert_no_tokens(&dst);

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn renders_modern_mc_version_1_21() {
        let mut tokens = sample_tokens();
        tokens.mc_version = "1.21.1".to_string();
        tokens.java_release = 21;
        tokens.java_enum = "21".to_string();
        tokens.java_min = ">=21".to_string();
        tokens.yarn_mappings = "1.21.1+build.3".to_string();
        tokens.loader_version = "0.19.5".to_string();
        tokens.fabric_api_version = "0.116.17+1.21.1".to_string();
        tokens.mc_depends = "~1.21.1".to_string();
        tokens.mappings_line = "mappings loom.officialMojangMappings()".to_string();

        let base = std::env::temp_dir().join(format!("nexuscraft-121-{}", std::process::id()));
        let dst = base.join("modern-mod");
        write_template("fabric-1.20.1-mod", &tokens, &dst).unwrap();

        let gradle = fs::read_to_string(dst.join("build.gradle")).unwrap();
        assert!(gradle.contains("it.options.release = 21"));
        assert!(gradle.contains("JavaVersion.VERSION_21"));
        assert!(gradle.contains("mappings loom.officialMojangMappings()"));

        let mod_json = fs::read_to_string(dst.join("src/main/resources/fabric.mod.json")).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&mod_json).unwrap();
        assert_eq!(parsed["depends"]["minecraft"], "~1.21.1");
        assert_eq!(parsed["depends"]["java"], ">=21");

        assert_no_tokens(&dst);
        let _ = fs::remove_dir_all(&base);
    }

    fn assert_no_tokens(dir: &Path) {
        for entry in fs::read_dir(dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            assert!(!name.contains("{{"), "leftover token in filename: {name}");
            if path.is_dir() {
                assert_no_tokens(&path);
            } else {
                if is_binary_path(&name) {
                    continue;
                }
                let content = fs::read_to_string(&path).unwrap_or_default();
                assert!(
                    !content.contains("{{"),
                    "leftover token inside {}",
                    path.display()
                );
            }
        }
    }
}
