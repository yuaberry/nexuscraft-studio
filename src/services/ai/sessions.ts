import { getDb } from "@/services/db/client";

export interface AiSessionRecord {
  id: string;
  project_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiMessageRecord {
  id: number;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tokens: number | null;
  created_at: string;
}

export async function createSession(
  projectId: string,
  title: string,
): Promise<AiSessionRecord> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO ai_sessions (id, project_id, title, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, projectId, title, now, now],
  );
  return {
    id,
    project_id: projectId,
    title,
    created_at: now,
    updated_at: now,
  };
}

export async function getLatestSession(
  projectId: string,
): Promise<AiSessionRecord | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM ai_sessions WHERE project_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [projectId],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: String(r.id),
    project_id: (r.project_id as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export async function appendMessage(
  sessionId: string,
  role: AiMessageRecord["role"],
  content: string,
): Promise<AiMessageRecord> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.execute(
    `INSERT INTO ai_messages (session_id, role, content, created_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, role, content, now],
  );
  await db.execute(
    "UPDATE ai_sessions SET updated_at = $2 WHERE id = $1",
    [sessionId, now],
  );
  return {
    id: Number(result.lastInsertId ?? 0),
    session_id: sessionId,
    role,
    content,
    tokens: null,
    created_at: now,
  };
}

export async function listMessages(
  sessionId: string,
): Promise<AiMessageRecord[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM ai_messages WHERE session_id = $1
     ORDER BY id ASC`,
    [sessionId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    session_id: String(r.session_id),
    role: r.role as AiMessageRecord["role"],
    content: String(r.content),
    tokens: (r.tokens as number | null) ?? null,
    created_at: String(r.created_at),
  }));
}
