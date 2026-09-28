/**
 * Extracts a complete project-spec.json proposal from an AI answer.
 * Heuristic: the first fenced ```json block that parses as JSON and looks
 * like a specification (has at least one spec-ish key).
 */

const SPEC_KEYS = [
  "project_name",
  "mod_id",
  "gameplay_features",
  "items",
  "blocks",
  "entities",
  "compatibility",
  "build_configuration",
];

export function extractSpecProposal(answer: string): string | null {
  const re = /```json\s*\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(answer)) !== null) {
    const raw = match[1].trim();
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const hits = SPEC_KEYS.filter((k) => k in parsed).length;
      if (hits >= 2) {
        // pretty-print for a stable diff and readable preview
        return JSON.stringify(parsed, null, 2) + "\n";
      }
    } catch {
      // not a JSON block — keep scanning
    }
  }
  return null;
}
