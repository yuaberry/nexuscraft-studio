//! Embedded project templates.
//!
//! Template files are compiled INTO the binary (include_bytes!) — creation
//! never depends on external paths, resource bundling or the filesystem
//! layout of the dev machine. Paths may contain `{{TOKENS}}` which are
//! rendered per-project (both directory names and file names).

/// (template-relative path, raw bytes)
pub struct EmbeddedFile {
    pub path: &'static str,
    pub bytes: &'static [u8],
}

pub const FABRIC_1201_TEMPLATE: &[EmbeddedFile] = &[
    EmbeddedFile {
        path: ".gitignore",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/.gitignore"),
    },
    EmbeddedFile {
        path: ".nexus/ai-memory.md",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/.nexus/ai-memory.md"),
    },
    EmbeddedFile {
        path: ".nexus/project-spec.json",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/.nexus/project-spec.json"),
    },
    EmbeddedFile {
        path: ".nexus/style-bible.md",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/.nexus/style-bible.md"),
    },
    EmbeddedFile {
        path: "build.gradle",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/build.gradle"),
    },
    EmbeddedFile {
        path: "gradle.properties",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/gradle.properties"),
    },
    EmbeddedFile {
        path: "gradle/wrapper/gradle-wrapper.jar",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/gradle/wrapper/gradle-wrapper.jar"),
    },
    EmbeddedFile {
        path: "gradle/wrapper/gradle-wrapper.properties",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/gradle/wrapper/gradle-wrapper.properties"),
    },
    EmbeddedFile {
        path: "gradlew",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/gradlew"),
    },
    EmbeddedFile {
        path: "gradlew.bat",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/gradlew.bat"),
    },
    EmbeddedFile {
        path: "LICENSE",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/LICENSE"),
    },
    EmbeddedFile {
        path: "README.md",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/README.md"),
    },
    EmbeddedFile {
        path: "settings.gradle",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/settings.gradle"),
    },
    EmbeddedFile {
        path: "src/main/java/{{PACKAGE_PATH}}/ModItems.java",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/src/main/java/{{PACKAGE_PATH}}/ModItems.java"),
    },
    EmbeddedFile {
        path: "src/main/java/{{PACKAGE_PATH}}/{{MOD_ID_CLASS}}.java",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/src/main/java/{{PACKAGE_PATH}}/{{MOD_ID_CLASS}}.java"),
    },
    EmbeddedFile {
        path: "src/main/resources/assets/{{MOD_ID}}/icon.png",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/src/main/resources/assets/{{MOD_ID}}/icon.png"),
    },
    EmbeddedFile {
        path: "src/main/resources/assets/{{MOD_ID}}/lang/en_us.json",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/src/main/resources/assets/{{MOD_ID}}/lang/en_us.json"),
    },
    EmbeddedFile {
        path: "src/main/resources/assets/{{MOD_ID}}/models/item/example_item.json",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/src/main/resources/assets/{{MOD_ID}}/models/item/example_item.json"),
    },
    EmbeddedFile {
        path: "src/main/resources/assets/{{MOD_ID}}/textures/item/example_item.png",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/src/main/resources/assets/{{MOD_ID}}/textures/item/example_item.png"),
    },
    EmbeddedFile {
        path: "src/main/resources/fabric.mod.json",
        bytes: include_bytes!("../../templates/fabric-1.20.1-mod/src/main/resources/fabric.mod.json"),
    },
];

/// Template id -> embedded file set. Single entry for now (Fabric 1.20.1);
/// new templates register here and inherit all safety machinery.
pub fn template_files(template_id: &str) -> Result<&'static [EmbeddedFile], String> {
    match template_id {
        "fabric-1.20.1-mod" => Ok(FABRIC_1201_TEMPLATE),
        other => Err(format!("Unknown template \"{other}\"")),
    }
}
