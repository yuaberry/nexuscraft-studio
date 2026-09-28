import { useEffect, useMemo, useState } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import {
  ensureCatalog,
  getVersions,
  resolveTemplateParams,
  templateParamsToPayload,
} from "@/services/minecraft/versionCatalog";
import type { MinecraftVersionInfo } from "@/types/catalog";
import type { ProjectRecord } from "@/types";

const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "LGPL-3.0", "Custom", "Proprietary"];

export function CreateProjectWizard() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const addProject = useProjectsStore((s) => s.addProject);
  const open = useUiStore((s) => s.createWizardOpen);
  const setOpen = useUiStore((s) => s.setCreateWizardOpen);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState(settings.general.defaultLicense);
  const [author, setAuthor] = useState(settings.general.authorName);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);

  // ---- Version catalog (auto-updating) ----
  const [versions, setVersions] = useState<MinecraftVersionInfo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [mcVersion, setMcVersion] = useState<string>(settings.minecraft.defaultVersion);
  const [resolved, setResolved] = useState<Awaited<ReturnType<typeof resolveTemplateParams>> | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCatalogLoading(true);
    (async () => {
      try {
        await ensureCatalog(); // refreshes automatically when stale (12h TTL)
        const list = await getVersions();
        if (cancelled) return;
        setVersions(list);
        // keep configured default if the catalog has it; else pick the newest release
        if (!list.some((v) => v.version === mcVersion && v.kind === "release")) {
          const newest = list.find((v) => v.kind === "release");
          if (newest) setMcVersion(newest.version);
        }
      } catch (error) {
        if (!cancelled) {
          toast.warning("Version catalog unavailable — using embedded fallback", {
            description: String(error),
          });
          const list = await getVersions().catch(() => []);
          if (!cancelled) setVersions(list);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    resolveTemplateParams(mcVersion)
      .then((params) => {
        if (!cancelled) setResolved(params);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mcVersion]);

  const releases = useMemo(
    () => versions.filter((v) => v.kind === "release").slice(0, 40),
    [versions],
  );
  const snapshots = useMemo(
    () => versions.filter((v) => v.kind === "snapshot").slice(0, 8),
    [versions],
  );
  const selectedInfo = useMemo(
    () => versions.find((v) => v.version === mcVersion) ?? null,
    [versions, mcVersion],
  );

  const slug = useMemo(() => slugify(name), [name]);
  const modId = useMemo(() => toModId(slug), [slug]);
  const modIdClass = useMemo(() => toPascalCase(modId), [modId]);
  const packageDefault = useMemo(() => defaultPackageFor(modId), [modId]);
  const [packageOverride, setPackageOverride] = useState("");

  const javaPackage = packageOverride.trim() || packageDefault;
  const isValid = slug.length >= 2 && modId.length >= 2 && resolved !== null;
  const basePath = settings.storage.basePath;

  const handleCreate = async () => {
    if (!isValid || !resolved) return;
    if (!basePath) {
      toast.error("Configure your storage location first", {
        description: "Settings → Storage — choose where projects should live.",
      });
      setOpen(false);
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
        ...templateParamsToPayload(resolved),
      });

      const now = new Date().toISOString();
      const record: ProjectRecord = {
        id: crypto.randomUUID(),
        name: name.trim(),
        slug,
        type: "mod",
        minecraft_version: resolved.minecraftVersion,
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
        description: `${result.files_created} files · MC ${resolved.minecraftVersion} · Java ${resolved.javaRelease}`,
      });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Create project
          </DialogTitle>
          <DialogDescription>
            A real, compilable Fabric mod — version resolved live from the
            auto-updating catalog (Mojang + Fabric meta), with gradle wrapper,
            git history and a first item ready to extend.
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
                <span className="font-mono">
                  {basePath ? `${basePath}/projects/` : ""}
                  {slug}
                </span>
              </p>
            )}
          </div>

          {/* Minecraft version — live catalog */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Minecraft version</Label>
              {catalogLoading ? (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> syncing catalog…
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  auto-updated from Mojang + Fabric meta
                </span>
              )}
            </div>
            <Select value={mcVersion} onValueChange={setMcVersion}>
              <SelectTrigger>
                <SelectValue placeholder="Choose version…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Releases</SelectLabel>
                  {releases.map((v) => (
                    <SelectItem key={v.version} value={v.version}>
                      {v.version}
                      {v.experimental ? "  ⚠︎" : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {snapshots.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Snapshots (experimental)</SelectLabel>
                    {snapshots.map((v) => (
                      <SelectItem key={v.version} value={v.version}>
                        {v.version}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {resolved && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant="secondary">Java {resolved.javaRelease}</Badge>
                {selectedInfo?.fabric && (
                  <>
                    <Badge variant="outline">loader {resolved.loaderVersion}</Badge>
                    <Badge variant="outline">
                      {resolved.yarnMappings
                        ? `yarn ${resolved.yarnMappings}`
                        : "official Mojang mappings"}
                    </Badge>
                    <Badge variant="outline">fabric-api {resolved.fabricApiVersion}</Badge>
                  </>
                )}
                {resolved.experimental && (
                  <Badge variant="warning">
                    experimental — template targets ≤ 1.21.1; newer APIs may need agent fixes (Phase 4)
                  </Badge>
                )}
              </div>
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
              Forge/NeoForge catalog data is already tracked — templates arrive in
              Phase 3.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
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
