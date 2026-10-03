/**
 * Shaderpack file editor — Monaco over the generated GLSL (composite.fsh /
 * composite.vsh / shaders.properties / manifest / README). Reads and
 * writes go through the Rust workspace guard, same as project files.
 */

import { useCallback, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { setupMonacoTheme, languageFromPath, registerSaveShortcut } from "@/lib/monaco";
import { cn } from "@/lib/utils";
import {
  readShaderPackFile,
  writeShaderPackFile,
  type ShaderPackInfo,
} from "@/services/shaders/shaderService";

const EDITABLE_FILES = [
  "shaders/composite.fsh",
  "shaders/composite.vsh",
  "shaders.properties",
  "nexuscraft.json",
  "README.txt",
] as const;

interface ShaderPackEditorProps {
  pack: ShaderPackInfo | null;
  basePath: string;
  onClose: () => void;
}

export function ShaderPackEditor({ pack, basePath, onClose }: ShaderPackEditorProps) {
  const [activeFile, setActiveFile] = useState<string>(EDITABLE_FILES[0]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  // Starts true; the parent remounts this editor (key) per pack, so each
  // open begins in the loading state without a setState-in-effect.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const open = pack !== null;

  // Load every pack file when a pack opens
  useEffect(() => {
    if (!pack) return;
    let cancelled = false;
    void (async () => {
      try {
        const next: Record<string, string> = {};
        for (const file of EDITABLE_FILES) {
          try {
            next[file] = await readShaderPackFile(basePath, pack.slug, file);
          } catch {
            next[file] = ""; // file removed by the user — show empty, save recreates
          }
        }
        if (cancelled) return;
        setContents(next);
        setOriginals(next);
        setActiveFile(EDITABLE_FILES[0]);
      } catch (error) {
        toast.error("Could not read shaderpack", { description: String(error) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pack, basePath]);

  const save = useCallback(async () => {
    if (!pack) return;
    setSaving(true);
    try {
      for (const file of EDITABLE_FILES) {
        if (contents[file] !== originals[file]) {
          await writeShaderPackFile(basePath, pack.slug, file, contents[file] ?? "");
        }
      }
      setOriginals({ ...contents });
      toast.success("Shaderpack saved", {
        description: `${pack.name} — edits apply on the next game launch.`,
      });
    } catch (error) {
      toast.error("Could not save shaderpack", { description: String(error) });
    } finally {
      setSaving(false);
    }
  }, [pack, basePath, contents, originals]);

  const dirty = EDITABLE_FILES.some((f) => contents[f] !== originals[f]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex h-[74vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-4">
          <div className="flex items-center justify-between pr-8">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 truncate">
                {pack?.name ?? "Shaderpack"}
                {dirty && <Badge variant="secondary">edited</Badge>}
              </DialogTitle>
              <DialogDescription className="mt-1 font-mono text-[11px]">
                shaderpacks/{pack?.slug}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-3">
            {EDITABLE_FILES.map((file) => (
              <button
                key={file}
                className={cn(
                  "rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors",
                  activeFile === file
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
                onClick={() => setActiveFile(file)}
              >
                {file}
                {contents[file] !== originals[file] && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" />
                )}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Editor
              key={pack?.slug ?? "none"}
              height="100%"
              theme="nexus-dark"
              beforeMount={() => setupMonacoTheme()}
              onMount={(editor) => registerSaveShortcut(editor, () => void save())}
              language={languageFromPath(activeFile)}
              value={contents[activeFile] ?? ""}
              onChange={(value) =>
                setContents((prev) => ({ ...prev, [activeFile]: value ?? "" }))
              }
              options={{
                fontSize: 12.5,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
              }}
              className="h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
