import { describe, expect, it } from "vitest";
import { extractSpecProposal } from "./specUtils";

describe("extractSpecProposal", () => {
  it("extracts the first fenced json block that looks like a spec", () => {
    const answer = [
      "Here is the plan.",
      "```json",
      '{\n  "project_name": "Dark Kingdom",\n  "mod_id": "dark_kingdom",\n  "items": []\n}',
      "```",
      "Anything else?",
    ].join("\n");
    const proposal = extractSpecProposal(answer);
    expect(proposal).not.toBeNull();
    const parsed = JSON.parse(proposal!) as { project_name: string };
    expect(parsed.project_name).toBe("Dark Kingdom");
  });

  it("rejects json blocks that are not specs", () => {
    const answer = "Config:\n```json\n{\"loader\": \"fabric\"}\n```";
    expect(extractSpecProposal(answer)).toBeNull();
  });

  it("returns null when there is no json at all", () => {
    expect(extractSpecProposal("plain text answer")).toBeNull();
  });
});
