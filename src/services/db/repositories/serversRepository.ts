import { getDb } from "@/services/db/client";
import type { ServerRecord } from "@/types";

function rowToServer(row: Record<string, unknown>): ServerRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    software: row.software as ServerRecord["software"],
    minecraft_version: String(row.minecraft_version),
    path: String(row.path),
    port: Number(row.port ?? 25565),
    ram_mb: Number(row.ram_mb ?? 2048),
    status: String(row.status ?? "stopped"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listServers(): Promise<ServerRecord[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM servers ORDER BY created_at DESC",
  );
  return rows.map(rowToServer);
}

export async function insertServer(server: ServerRecord): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO servers
      (id, name, slug, software, minecraft_version, path, port, ram_mb, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      server.id,
      server.name,
      server.slug,
      server.software,
      server.minecraft_version,
      server.path,
      server.port,
      server.ram_mb,
      server.status,
      server.created_at,
      server.updated_at,
    ],
  );
}

export async function updateServerStatus(
  slug: string,
  status: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE servers SET status = $2, updated_at = datetime('now') WHERE slug = $1",
    [slug, status],
  );
}

export async function removeServer(slug: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM servers WHERE slug = $1", [slug]);
}

export async function recordBackup(entry: {
  id: string;
  slug: string;
  path: string;
  sizeBytes: number;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO backups (id, kind, path, size_bytes, created_at)
       VALUES ($1, 'server', $2, $3, datetime('now'))`,
      [entry.id, entry.path, entry.sizeBytes],
    );
  } catch (error) {
    console.warn("backup row insert failed:", error);
  }
}
