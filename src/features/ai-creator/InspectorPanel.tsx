import { useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  BookMarked,
  Brain,
  Check,
  FileStack,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ProjectContext } from "@/services/ai/contextService";
import {
  deleteReference,
  importReference,
  readReferenceBase64,
  type ReferenceImage,
} from "@/services/ai/references";
import { cn } from "@/lib/utils";

interface Props {
  context: ProjectContext | null;
  projectSlug: string | null;
  references: ReferenceImage[];
  attached: Set<string>;
  onReferencesChanged: (next: Set<string>) => Promise<void>;
  onQuickPrompt: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  "Design the full project specification for this project.",
  "Suggest 5 new items consistent with the Style Bible.",
  "Draft the content plan for the next 3 features, with file paths.",
];

export function InspectorPanel({
  context,
  projectSlug,
  references,
  attached,
  onReferencesChanged,
  onQuickPrompt,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleUpload = async () => {
    if (!projectSlug) return;
    const selected = await open({
      multiple: true,
      title: "Choose reference images",
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
      ],
    });
    if (!selected || selected.length === 0) return;
    setImporting(true);
    try {
      const paths = Array.isArray(selected) ? selected : [selected];
      for (const path of paths) {
        await importReference(projectSlug, path);
      }
      await onReferencesChanged(new Set(attached));
      toast.success(
        `Imported ${paths.length} reference${paths.length === 1 ? "" : "s"}`,
        {
          description: "Stored under .voxel/references/ — versioned with the project.",
        },
      );
    } catch (error) {
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleAttach = async (relPath: string) => {
    const next = new Set(attached);
    if (next.has(relPath)) next.delete(relPath);
    else {
      // Vision sanity check: read once to ensure the file is usable
      if (projectSlug) {
        try {
          await readReferenceBase64(projectSlug, relPath);
        } catch (error) {
          toast.error("Cannot attach this image", { description: String(error) });
          return;
        }
      }
      next.add(relPath);
    }
    await onReferencesChanged(next);
  };

  const handleDelete = async (relPath: string) => {
    if (!projectSlug) return;
    try {
      await deleteReference(projectSlug, relPath);
      const next = new Set(attached);
      next.delete(relPath);
      await onReferencesChanged(next);
    } catch (error) {
      toast.error("Delete failed", { description: String(error) });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Context status */}
      <div className="border-b border-border/60 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Brain className="h-3.5 w-3.5 text-primary" />
          Project inspector
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          <ContextRow
            icon={FileStack}
            label="project-spec.json"
            found={context?.projectSpecParsed != null}
            hint={
              context?.projectSpecParsed
                ? `${Object.keys(context.projectSpecParsed).length} top-level keys`
                : "Source of truth — ask the AI to design one"
            }
          />
          <ContextRow
            icon={BookMarked}
            label="style-bible.md"
            found={Boolean(context?.styleBible)}
            hint={
              context?.styleBible
                ? `${context.styleBible.split("\n").length} lines of style rules`
                : "Define the aesthetic once — every generation respects it"
            }
          />
          <ContextRow
            icon={Brain}
            label="ai-memory.md"
            found={Boolean(context?.aiMemory)}
            hint={
              context?.aiMemory
                ? `${context.aiMemory.split("\n").length} lines of notes`
                : "The agent reads this before every significant change"
            }
          />

          <Separator />

          {/* Reference board */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/90">
                Reference board
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-[11px]"
                disabled={!projectSlug || importing}
                onClick={() => void handleUpload()}
              >
                {importing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImagePlus className="h-3 w-3" />
                )}
                Add
              </Button>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" />

            {references.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-[11px] leading-relaxed text-muted-foreground/70">
                Concept art, screenshots and texture references live here.
                Attach them to a message and the AI sees them (vision models).
              </p>
            ) : (
              <div className="space-y-1.5">
                {references.map((ref) => {
                  const isAttached = attached.has(ref.relPath);
                  return (
                    <div
                      key={ref.relPath}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
                        isAttached
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/60 hover:border-primary/30",
                      )}
                    >
                      <button
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => void toggleAttach(ref.relPath)}
                        title={isAttached ? "Detach from next message" : "Attach to next message"}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            isAttached
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40",
                          )}
                        >
                          {isAttached && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate font-mono text-[10px] text-foreground/90">
                          {ref.fileName}
                        </span>
                      </button>
                      <span className="shrink-0 text-[9px] text-muted-foreground/60">
                        {Math.round(ref.sizeBytes / 1024)}KB
                      </span>
                      <button
                        className="shrink-0 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-70"
                        onClick={() => void handleDelete(ref.relPath)}
                        title="Remove from project"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Quick prompts */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground/90">
              Quick prompts
            </span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onQuickPrompt(prompt)}
                disabled={!context}
                className="w-full rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-left text-[11px] leading-relaxed text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ContextRow({
  icon: Icon,
  label,
  found,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  found: boolean;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-foreground/90">{label}</span>
          <Badge variant={found ? "success" : "outline"} className="h-4 px-1.5 text-[9px]">
            {found ? "loaded" : "missing"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground/70">
          {hint}
        </p>
      </div>
    </div>
  );
}
