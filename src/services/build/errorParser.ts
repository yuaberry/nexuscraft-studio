/**
 * Error Center (Fase 4) — turns raw Gradle/javac output into structured,
 * categorized errors that the UI renders and the agent can fix.
 */

export type BuildErrorCategory =
  | "java"
  | "dependency"
  | "configuration"
  | "unknown";

export interface BuildError {
  category: BuildErrorCategory;
  message: string;
  file: string | null;
  line: number | null;
  raw: string;
}

const JAVAC_ERROR = /^.*?([\w./\\-]+\.java):(\d+): (?:error|warning): (.+)$/;
const GRADLE_RESOLUTION =
  /(?:Could not resolve|Could not find)\s+([^:\s]+(?::[^:\s]+)*)/;

/** Parses build log lines into categorized errors (deduplicated, capped). */
export function parseBuildErrors(logs: Array<{ line: string }>): BuildError[] {
  const errors: BuildError[] = [];
  const seen = new Set<string>();

  for (const { line } of logs) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // javac compile errors — the actionable gold for Auto-Fix
    const javaMatch = JAVAC_ERROR.exec(trimmed);
    if (javaMatch && trimmed.includes("error:")) {
      const [, file, lineNo, message] = javaMatch;
      const key = `${file}:${lineNo}:${message}`;
      if (!seen.has(key)) {
        seen.add(key);
        errors.push({
          category: "java",
          message,
          file: file.replace(/^.*?src[/\\]/, "src/"),
          line: Number(lineNo),
          raw: trimmed,
        });
      }
      continue;
    }

    // Gradle dependency resolution failures
    if (/(Could not resolve|Could not find)/.test(trimmed)) {
      const match = GRADLE_RESOLUTION.exec(trimmed);
      const dep = match?.[1] ?? trimmed.slice(0, 120);
      const key = `dep:${dep}`;
      if (!seen.has(key)) {
        seen.add(key);
        errors.push({
          category: "dependency",
          message: `Dependency problem: ${dep}`,
          file: null,
          line: null,
          raw: trimmed,
        });
      }
      continue;
    }

    // Configuration/DSL problems (groovy compile of build scripts)
    if (
      /(?:build file|settings file|build\.gradle|settings\.gradle).*(?:error|failed)/i.test(
        trimmed,
      ) ||
      /Could not get unknown property/i.test(trimmed)
    ) {
      const key = `cfg:${trimmed.slice(0, 120)}`;
      if (!seen.has(key)) {
        seen.add(key);
        errors.push({
          category: "configuration",
          message: trimmed.slice(0, 160),
          file: null,
          line: null,
          raw: trimmed,
        });
      }
      continue;
    }
  }

  return errors.slice(0, 50);
}

/** Compact, agent-friendly digest of the errors (for the Auto-Fix prompt). */
export function errorsToPrompt(errors: BuildError[], attempt: number): string {
  const lines = errors.map((error, index) => {
    const where = error.file
      ? ` at ${error.file}${error.line ? `:${error.line}` : ""}`
      : "";
    return `${index + 1}. [${error.category}]${where}: ${error.message}`;
  });
  return [
    `The Gradle build failed (auto-fix attempt ${attempt}).`,
    `Errors (${errors.length}):`,
    ...lines,
    "",
    "You have tools. Fix the project so it compiles:",
    "1. read_file each file mentioned above (paths are relative to the project root)",
    "2. repair the code with edit_file or write_file",
    "3. keep .nexus/project-spec.json truthful and respect the Style Bible",
    "4. never delete files; do not touch build.gradle dependencies",
    "5. when done, summarize the changes in one short paragraph",
  ].join("\n");
}
