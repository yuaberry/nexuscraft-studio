import { getDb } from "@/services/db/client";

/**
 * Audit trail for every VOXEL Agent tool call — policy layer 2 (AD-3).
 * One row per execution: ok / denied / error, with the exact args.
 */

export type ToolCallStatus = "ok" | "denied" | "error";

export async function logToolCall(entry: {
  sessionId: string | null;
  tool: string;
  args: Record<string, unknown>;
  status: ToolCallStatus;
  resultSummary: string;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO ai_tool_calls (session_id, tool, args, status, result_summary)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.sessionId,
        entry.tool,
        JSON.stringify(entry.args).slice(0, 20000),
        entry.status,
        entry.resultSummary.slice(0, 2000),
      ],
    );
  } catch (error) {
    // Audit must never break the agent loop — but the failure is visible in logs
    console.warn("Failed to write ai_tool_calls audit row:", error);
  }
}
