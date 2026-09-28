import type { ProjectRecord } from "@/types";
import { listProjectFiles, readProjectFile } from "@/services/projects/projectsService";
import { useSettingsStore } from "@/stores/settingsStore";

async function getStorageBase(): Promise<string> {
  const base = useSettingsStore.getState().settings.storage.basePath;
  if (!base) throw new Error("Storage location not configured (Settings → Storage)");
  return base;
}

/**
 * Context Assembly — everything the AI needs to know about the project
 * before a single token is generated (project-spec as source of truth,
 * bibles from the Consistency Engine, and the file tree shape).
 */

export interface ProjectContext {
  project: ProjectRecord;
  projectSpec: string | null;
  projectSpecParsed: Record<string, unknown> | null;
  styleBible: string | null;
  aiMemory: string | null;
  fileTreePreview: string;
  referenceCount: number;
}

export async function loadProjectContext(
  project: ProjectRecord,
): Promise<ProjectContext> {
  const basePath = await getStorageBase();
  const rel = `projects/${project.slug}`;

  const [spec, styleBible, aiMemory, files] = await Promise.all([
    readProjectFile(basePath, `${rel}/.nexus/project-spec.json`).catch(() => null),
    readProjectFile(basePath, `${rel}/.nexus/style-bible.md`).catch(() => null),
    readProjectFile(basePath, `${rel}/.nexus/ai-memory.md`).catch(() => null),
    listProjectFiles(basePath, rel).catch(() => []),
  ]);

  let projectSpecParsed: Record<string, unknown> | null = null;
  if (spec) {
    try {
      projectSpecParsed = JSON.parse(spec) as Record<string, unknown>;
    } catch {
      projectSpecParsed = null;
    }
  }

  // Compact tree preview (files only, capped)
  const treePreview = files
    .filter((f) => !f.is_dir)
    .slice(0, 60)
    .map((f) => f.path)
    .join("\n");

  const referenceCount = files.filter(
    (f) => !f.is_dir && f.path.startsWith(".nexus/references/"),
  ).length;

  return {
    project,
    projectSpec: spec,
    projectSpecParsed,
    styleBible,
    aiMemory,
    fileTreePreview: treePreview,
    referenceCount,
  };
}

export function buildSystemPrompt(context: ProjectContext): string {
  const { project } = context;
  return `You are the NexusCraft Studio AI — a senior Minecraft Fabric mod engineer and game designer. You operate on a REAL project on the user's machine (not a mockup).

PROJECT: ${project.name} (slug: ${project.slug})
- Minecraft: ${project.minecraft_version} · Loader: ${project.loader} · License: ${project.license}
- Java package: derive from the project files.

SOURCE OF TRUTH — .nexus/project-spec.json:
${context.projectSpec ?? "(not found — generate one with the user's first request)"}

STYLE BIBLE (aesthetic rules every asset must follow):
${context.styleBible ?? "(not found)"}

AI MEMORY (decisions and constraints so far):
${context.aiMemory ?? "(empty)"}

PROJECT FILES:
${context.fileTreePreview || "(empty)"}

RULES:
1. The project-spec.json above is the single source of truth. Keep every suggestion consistent with it. When the user asks for new features, first describe the impact on the spec.
2. When proposing changes to the specification, ALWAYS output the COMPLETE updated spec as a fenced \`\`\`json block starting with { — never partial fragments.
3. Be concrete and implementation-aware: registries (Registries.ITEM / Registries.BLOCK), models, lang keys, recipes and loot tables must match Minecraft ${project.minecraft_version} Fabric idioms.
4. When files need to be created or edited, show the exact file path and complete file content in fenced blocks. Phase 3 (Nexus Agent) will apply them; in this phase the user applies them via the editor.
5. Keep answers focused. Ask at most one clarifying question, and only when truly necessary.
6. Never break the Style Bible. If a request conflicts with it, say so.`;
}
