import type { AiSettings, ProjectRecord } from "@/types";
import { getProviderMeta } from "@/services/ai/providers";
import type { ProjectContext } from "@/services/ai/contextService";
import { secretsGet, AI_API_KEY_ID } from "@/services/secrets/secretsService";
import { createSnapshot } from "@/services/projects/projectsService";
import { agentTurn, appendToolResult, type ToolSchema } from "./toolCallFormat";
import { buildTools, type ToolContext, type ToolExecutor } from "./tools";
import { logToolCall } from "./audit";
import { buildAgentSystemPrompt } from "./promptBuilder";

/**
 * Nexus Agent Orchestrator — the tool-calling loop.
 *
 * Budgets (loop protection, AD-3):
 *  - MAX_STEPS: tool-calling iterations per run
 *  - MAX_WRITES: total write/edit/delete operations per run
 *
 * Policy:
 *  - Rust path guard on every call (layer 1)
 *  - Full audit trail to ai_tool_calls (layer 2)
 *  - UI confirmation for destructive tools (layer 3)
 *  - Automatic snapshot before the first write of a run (AD-7)
 */

const MAX_STEPS = 8;
const MAX_WRITES = 30;

export type AgentEvent =
  | { type: "thinking" }
  | {
      type: "tool_start";
      callId: string;
      tool: string;
      summary: string;
      requiresConfirmation: boolean;
    }
  | { type: "tool_result"; callId: string; tool: string; ok: boolean; output: string }
  | { type: "text"; text: string }
  | { type: "snapshot"; label: string };

export interface AgentRunResult {
  text: string;
  toolCalls: number;
  writes: number;
  aborted: boolean;
}

export interface RunAgentOptions {
  settings: AiSettings;
  project: ProjectRecord;
  context: ProjectContext;
  basePath: string;
  sessionId: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userText: string;
  onEvent: (event: AgentEvent) => void;
  confirm: (tool: string, summary: string) => Promise<boolean>;
  /** Cooperative cancellation — checked between steps and tools. */
  shouldAbort?: () => boolean;
}

const WRITE_TOOLS = new Set(["write_file", "edit_file", "delete_file", "rename_file"]);

export async function runAgent(options: RunAgentOptions): Promise<AgentRunResult> {
  const {
    settings,
    project,
    context,
    basePath,
    sessionId,
    history,
    userText,
    onEvent,
    confirm,
    shouldAbort,
  } = options;

  const meta = getProviderMeta(settings.provider);
  const apiKey = meta.requiresKey ? await secretsGet(AI_API_KEY_ID) : null;

  const tools: ToolExecutor[] = buildTools();
  const schemas: ToolSchema[] = tools.map((tool) => tool.schema);
  const toolByName = new Map(tools.map((tool) => [tool.schema.name, tool]));

  const ctx: ToolContext = {
    basePath,
    project,
    projectRel: `projects/${project.slug}`,
  };

  const system = buildAgentSystemPrompt(context, tools);
  const messages: unknown[] = [
    { role: "system", content: system },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userText },
  ];

  let totalCalls = 0;
  let writes = 0;
  let snapshotTaken = false;

  const takeSnapshot = async () => {
    if (snapshotTaken) return;
    try {
      const snapshot = await createSnapshot(
        basePath,
        ctx.projectRel,
        "agent auto-checkpoint",
      );
      onEvent({ type: "snapshot", label: snapshot.label });
    } catch (error) {
      console.warn("Pre-run snapshot failed:", error);
    }
    snapshotTaken = true;
  };

  for (let step = 0; step < MAX_STEPS; step++) {
    if (shouldAbort?.()) {
      const text = "Run stopped by the user.";
      onEvent({ type: "text", text });
      return { text, toolCalls: totalCalls, writes, aborted: true };
    }
    onEvent({ type: "thinking" });

    const turn = await agentTurn(settings, apiKey, messages, schemas);

    if (turn.toolCalls.length === 0) {
      const text = turn.text.trim();
      if (text) onEvent({ type: "text", text });
      return { text, toolCalls: totalCalls, writes, aborted: false };
    }

    messages.push(turn.rawAssistant);

    // Group results for provider-specific batching (Anthropic requires them
    // in a single user message).
    const results: Array<{ id: string; content: string }> = [];

    for (const call of turn.toolCalls) {
      if (shouldAbort?.()) break;
      totalCalls += 1;
      const tool = toolByName.get(call.name);

      if (!tool) {
        const output = `Unknown tool "${call.name}". Available: ${tools
          .map((t) => t.schema.name)
          .join(", ")}.`;
        results.push({ id: call.id, content: output });
        await logToolCall({
          sessionId,
          tool: call.name,
          args: call.args,
          status: "error",
          resultSummary: output,
        });
        onEvent({
          type: "tool_result",
          callId: call.id,
          tool: call.name,
          ok: false,
          output,
        });
        continue;
      }

      const summary = tool.summarize(call.args);
      onEvent({
        type: "tool_start",
        callId: call.id,
        tool: call.name,
        summary,
        requiresConfirmation: tool.requiresConfirmation === true,
      });

      // Policy layer 3 — destructive confirmation
      if (tool.requiresConfirmation) {
        const approved = await confirm(call.name, summary);
        if (!approved) {
          const output = "Denied by the user — operation cancelled.";
          results.push({ id: call.id, content: output });
          await logToolCall({ sessionId, tool: call.name, args: call.args, status: "denied", resultSummary: output });
          onEvent({ type: "tool_result", callId: call.id, tool: call.name, ok: false, output });
          continue;
        }
      }

      // Write budget + pre-first-write snapshot
      if (WRITE_TOOLS.has(call.name)) {
        if (writes >= MAX_WRITES) {
          const output = `Write budget exhausted (${MAX_WRITES} operations) — stopping writes for this run.`;
          results.push({ id: call.id, content: output });
          await logToolCall({ sessionId, tool: call.name, args: call.args, status: "denied", resultSummary: output });
          onEvent({ type: "tool_result", callId: call.id, tool: call.name, ok: false, output });
          continue;
        }
        await takeSnapshot();
        writes += 1;
      }

      try {
        const output = await tool.execute(call.args, ctx);
        results.push({ id: call.id, content: output });
        await logToolCall({ sessionId, tool: call.name, args: call.args, status: "ok", resultSummary: output });
        onEvent({ type: "tool_result", callId: call.id, tool: call.name, ok: true, output });
      } catch (error) {
        const output = error instanceof Error ? error.message : String(error);
        results.push({ id: call.id, content: `ERROR: ${output}` });
        await logToolCall({ sessionId, tool: call.name, args: call.args, status: "error", resultSummary: output });
        onEvent({ type: "tool_result", callId: call.id, tool: call.name, ok: false, output });
      }
    }

    messages.push(...appendToolResult(turn.provider, turn.rawAssistant, results));
  }

  const text =
    "The run hit the step budget — check the file tree and continue with a new request if needed.";
  onEvent({ type: "text", text });
  return { text, toolCalls: totalCalls, writes, aborted: true };
}
