import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

/**
 * Singleton SQLite connection.
 * The database file lives in the OS app-config dir and is created/migrated
 * by the Rust plugin on first load (see src-tauri/migrations).
 */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:nexuscraft.db");
  }
  return dbPromise;
}
