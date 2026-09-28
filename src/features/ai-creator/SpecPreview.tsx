import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { FileJson, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { languageFromPath, setupMonacoTheme } from "@/lib/monaco";
import type { ProjectContext } from "@/services/ai/contextService";
import { writeProjectFile } from "@/services/projects/projectsService";
import { createSnapshot } from "@/services/projects/projectsService";
import { useSettingsStore } from "@/stores/settingsStore";

interface Props {
  context: ProjectContext | null;
  proposal: string | null;
  onSaved: () => void;
}

/**
 * Center column — Specification preview with diff against the live
 * project-spec.json, and a safe save path (auto-snapshot before overwrite).
 */
export function SpecPreview({ context, proposal, onSaved }: Props) {
  const basePath = useSettingsStore((s) => s.settings.storage.basePath);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"proposal" | "current">("proposal");

  const current = context?.projectSpec ?? null;
  const hasProposal = proposal !== null;
  const effective = view === "proposal" ? proposal : current;
  const proposalValid = useMemo(() => {
    if (!proposal) return false;
    try {
      const parsed = JSON.parse(proposal) as Record<string, unknown>;
      return "project_name" in parsed || "mod_id" in parsed;
    } catch {
      return false;
    }
  }, [proposal]);

  const changed = proposal !== null && proposal.trim() !== (current ?? "").trim();

  const handleSave = async () => {
    if (!context || !proposal || !basePath) return;
    if (!proposalValid) {
      toast.error("The proposal is not a valid specification");
      return;
    }
    setSaving(true);
    const { project } = context;
    const rel = `projects/${project.slug}/.nexus/project-spec.json`;
    try {
      // AD-7: snapshot before significant AI-driven changes
      if (current) {
        await createSnapshot(basePath, `projects/${project.slug}`, "pre-spec-update");
      }
      await writeProjectFile(basePath, rel, proposal);
      toast.success("project-spec.json saved", {
        description: current
          ? "Snapshot created before the update."
          : "The specification is now the project's source of truth.",
      });
      onSaved();
    } catch (error) {
      toast.error("Could not save specification", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <FileJson className="h-3.5 w-3.5 text-primary" />
          Specification
        </span>
        <div className="flex items-center gap-2">
          {hasProposal && current && (
            <Badge variant={changed ? "warning" : "success"}>
              {changed ? "differs from saved" : "matches saved"}
            </Badge>
          )}
          {hasProposal ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-[11px]"
              onClick={() => setView(view === "proposal" ? "current" : "proposal")}
            >
              {view === "proposal" ? "Show saved" : "Show proposal"}
            </Button>
          ) : null}
          {hasProposal && (
            <Button
              size="sm"
              variant="gradient"
              className="h-7 text-[11px]"
              onClick={() => void handleSave()}
              disabled={saving || !changed}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save spec
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {effective ? (
          <Editor
            key={`${view}-${effective.length}`}
            height="100%"
            language="json"
            theme="nexus-dark"
            value={effective}
            options={{
              readOnly: true,
              fontSize: 12.5,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: "none",
            }}
            onMount={() => setupMonacoTheme()}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-blueprint-grid text-center">
            <FileJson className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {context
                ? "Ask the AI for a design — the specification proposal lands here"
                : "Select a project to see its specification"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground/60">
              .nexus/project-spec.json is the single source of truth for every
              future generation
            </p>
          </div>
        )}
      </div>
      <div className="hidden">{languageFromPath("a.json")}</div>
    </div>
  );
}
