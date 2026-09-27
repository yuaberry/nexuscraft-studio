import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useUiStore } from "@/stores/uiStore";
import { insertProject } from "@/services/db/repositories/projectsRepository";
import {
  createProject,
  defaultPackageFor,
  slugify,
  toModId,
  toPascalCase,
} from "@/services/projects/projectsService";
import type { ProjectRecord } from "@/types";

const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "LGPL-3.0", "Custom", "Proprietary"];

export function CreateProjectWizard() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const addProject = useProjectsStore((s) => s.addProject);
  const open = useUiStore((s) => s.createWizardOpen);
  const setOpen = useUiStore((s) => s.setCreateWizardOpen);

  const onOpenChange = (next: boolean) => setOpen(next);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState(settings.general.defaultLicense);
  const [author, setAuthor] = useState(settings.general.authorName);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);

  const slug = useMemo(() => slugify(name), [name]);
  const modId = useMemo(() => toModId(slug), [slug]);
  const modIdClass = useMemo(() => toPascalCase(modId), [modId]);
  const packageDefault = useMemo(() => defaultPackageFor(modId), [modId]);
  const [packageOverride, setPackageOverride] = useState("");

  const javaPackage = packageOverride.trim() || packageDefault;
  const isValid = slug.length >= 2 && modId.length >= 2;
  const basePath = settings.storage.basePath;

  const handleCreate = async () => {
    if (!isValid) return;
    if (!basePath) {
      toast.error("Configure your storage location first", {
        description: "Settings → Storage — choose where projects should live.",
      });
      onOpenChange(false);
      navigate("/settings/storage");
      return;
    }

    setBusy(true);
    try {
      const result = await createProject({
        storageBase: basePath,
        slug,
        name: name.trim(),
        template: "fabric-1.20.1-mod",
        modId,
        modIdClass,
        package: javaPackage,
        description: description.trim(),
        license,
        author: author.trim(),
      });

      const now = new Date().toISOString();
      const record: ProjectRecord = {
        id: crypto.randomUUID(),
        name: name.trim(),
        slug,
        type: "mod",
        minecraft_version: settings.minecraft.defaultVersion,
        loader: "fabric",
        description: description.trim() || null,
        license,
        path: result.project_path,
        repository_url: null,
        status: "active",
        last_build_status: null,
        last_build_at: null,
        created_at: now,
        updated_at: now,
      };
      await insertProject(record);
      addProject(record);

      toast.success(`Project "${name.trim()}" created`, {
        description: `${result.files_created} files · git repository initialized`,
      });
      onOpenChange(false);
      setName("");
      setDescription("");
      setPackageOverride("");
      navigate(`/projects/${record.id}`);
    } catch (error) {
      toast.error("Could not create project", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Create project
          </DialogTitle>
          <DialogDescription>
            A real, compilable Fabric 1.20.1 mod — with gradle wrapper, git and
            a first item ready to extend with the AI Creator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              autoFocus
              placeholder="e.g. Dark Kingdom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid && !busy) {
                  void handleCreate();
                }
              }}
            />
            {slug && (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-mono">{basePath ? `${basePath}/projects/` : ""}{slug}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              placeholder="A dark medieval RPG mod…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>License</Label>
              <Select value={license} onValueChange={setLicense}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-author">Author</Label>
              <Input
                id="project-author"
                placeholder="Your name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>

          <button
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowAdvanced((v) => !v)}
            type="button"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {showAdvanced ? "Hide" : "Show"} advanced (Java identifiers)
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-card/50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Mod id</span>
                <span className="font-mono text-foreground/90">{modId || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Entry class</span>
                <span className="font-mono text-foreground/90">
                  {modIdClass ? `${javaPackage}.${modIdClass}` : "—"}
                </span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-package" className="text-xs">
                  Java package
                </Label>
                <Input
                  id="project-package"
                  className="font-mono text-xs"
                  value={packageOverride || packageDefault}
                  onChange={(e) => setPackageOverride(e.target.value)}
                  placeholder={packageDefault}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <Badge variant="default">Fabric</Badge>
            <span className="text-xs text-muted-foreground">
              Minecraft {settings.minecraft.defaultVersion} · template validated by tests
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={() => void handleCreate()}
            disabled={busy || !isValid}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
