import type { ProjectContext } from "@/services/ai/contextService";
import { buildSystemPrompt } from "@/services/ai/contextService";
import type { ToolExecutor } from "./tools";

/**
 * Agent system prompt: the design context PLUS the operating rules for
 * tools. The spec remains the source of truth; tools make it real.
 */
export function buildAgentSystemPrompt(
  context: ProjectContext,
  tools: ToolExecutor[],
): string {
  const toolLines = tools
    .map((tool) => `- ${tool.schema.name}: ${tool.schema.description}`)
    .join("\n");

  return `${buildSystemPrompt(context)}

TOOL PROTOCOL (you are now operating WITH TOOLS on the real project):
You can call tools to read and modify the project on disk. Every call is
validated by a security guard and audited. Rules:

${toolLines}

OPERATING PRINCIPLES:
1. ALWAYS read a file before editing it — "edit_file" requires an exact match
   of the current content. Never guess file contents.
2. Prefer "edit_file" for small changes; use "write_file" only for new files
   or complete rewrites. Never output partial file contents to write_file.
3. Follow the project's existing structure: Java sources live under
   src/main/java/<package>/, assets under src/main/resources/assets/<mod_id>/
   (lang, models/item, textures/item, …), data under
   src/main/resources/data/<mod_id>/.
4. When adding an item/block: update ModItems.java (or create ModBlocks.java),
   add the model JSON, add lang keys to en_us.json, and update
   .nexus/project-spec.json to keep the spec truthful.
5. A snapshot is created automatically before your first write in each run.
   You may call create_snapshot for extra checkpoints on risky sequences.
6. Do not touch .git, build outputs, gradle wrapper files or the gradle
   cache. Never delete files unless essential — deletes require user
   confirmation.
7. After finishing, summarize: files created/modified and what the user
   should check next. The user sees every tool call you make.
8. If a tool call fails, read the error carefully and self-correct. Do not
   repeat the exact same failing call more than twice.`;
}
