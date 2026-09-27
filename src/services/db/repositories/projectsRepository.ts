import { getDb } from "@/services/db/client";
import type { ProjectRecord } from "@/types";

function rowToProject(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    type: row.type as ProjectRecord["type"],
    minecraft_version: String(row.minecraft_version),
    loader: row.loader as ProjectRecord["loader"],
    description: (row.description as string | null) ?? null,
    license: String(row.license ?? "MIT"),
    path: String(row.path),
    repository_url: (row.repository_url as string | null) ?? null,
    status: String(row.status ?? "active"),
    last_build_status: (row.last_build_status as string | null) ?? null,
    last_build_at: (row.last_build_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM projects ORDER BY updated_at DESC",
  );
  return rows.map(rowToProject);
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM projects WHERE id = $1",
    [id],
  );
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function insertProject(
  project: ProjectRecord,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO projects
      (id, name, slug, type, minecraft_version, loader, description, license,
       path, repository_url, status, created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      project.id,
      project.name,
      project.slug,
      project.type,
      project.minecraft_version,
      project.loader,
      project.description,
      project.license,
      project.path,
      project.repository_url,
      project.status,
      project.created_at,
      project.updated_at,
    ],
  );
}

export async function touchProject(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE projects SET updated_at = datetime('now') WHERE id = $1",
    [id],
  );
}

export async function removeProject(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM projects WHERE id = $1", [id]);
}

export async function updateProjectBuildStatus(
  id: string,
  status: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE projects
       SET last_build_status = $2, last_build_at = datetime('now'), updated_at = datetime('now')
     WHERE id = $1`,
    [id, status],
  );
}
