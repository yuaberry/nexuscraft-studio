import { getDb } from "@/services/db/client";

type SettingsMap = Record<string, unknown>;

/**
 * Settings are persisted as one row per section, each holding a JSON blob.
 * This keeps the schema stable while sections evolve.
 */
export async function loadAllSettings(): Promise<SettingsMap> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings",
  );
  const result: SettingsMap = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      console.warn(`Invalid JSON in settings key "${row.key}" — ignoring`);
    }
  }
  return result;
}

export async function saveSettingsSection(
  key: string,
  value: unknown,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, datetime('now'))
     ON CONFLICT(key) DO UPDATE
       SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value)],
  );
}
