//! NexusCraft Studio — Rust core.
//!
//! Security authority of the application: every filesystem, process and
//! secret operation goes through commands declared here. The frontend
//! never touches the system directly.

mod commands;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

pub fn run() {
    let migrations = vec![
        // v1 — initial schema (18 tables)
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:nexuscraft.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::environment::detect_environment,
            commands::storage::get_default_storage_base,
            commands::storage::ensure_storage_dirs,
            commands::storage::get_app_paths,
            commands::storage::open_in_file_manager,
            commands::secrets::secrets_set,
            commands::secrets::secrets_get,
            commands::secrets::secrets_has,
            commands::secrets::secrets_delete,
            commands::secrets::secrets_clear_all,
            commands::secrets::secrets_backend_info,
            commands::projects::create_project,
            commands::fs::list_project_files,
            commands::fs::read_project_file,
            commands::fs::write_project_file,
            commands::fs::create_project_directory,
            commands::fs::delete_project_entry,
            commands::fs::rename_project_entry,
            commands::git::project_create_snapshot,
            commands::git::project_list_snapshots,
            commands::git::project_snapshot_restore,
            commands::git::project_git_status,
        ])
        .setup(|app| {
            // Ensure the app-config dir exists before the SQL plugin tries to
            // open the database (SQLite needs an existing parent directory).
            let config_dir = app.path().app_config_dir()?;
            std::fs::create_dir_all(&config_dir)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running NexusCraft Studio");
}
