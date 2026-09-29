import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settingsStore";
import { getVersions } from "@/services/minecraft/versionCatalog";
import {
  createServerCommand,
  slugify,
} from "@/services/servers/serverService";
import { insertServer } from "@/services/db/repositories/serversRepository";
import type { MinecraftVersionInfo } from "@/types/catalog";
import type { ServerRecord } from "@/types";

const RAM_OPTIONS = [1024, 2048, 4096, 8192];

export function CreateServerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const basePath = useSettingsStore((s) => s.settings.storage.basePath);

  const [name, setName] = useState("");
  const [software, setSoftware] = useState<"vanilla" | "paper">("vanilla");
  const [versions, setVersions] = useState<MinecraftVersionInfo[]>([]);
  const [mcVersion, setMcVersion] = useState<string>("");
  const [port, setPort] = useState("25565");
  const [ram, setRam] = useState(2048);
  const [acceptEula, setAcceptEula] = useState(false);
  const [busy, setBusy] = useState(false);

  const slug = useMemo(() => slugify(name), [name]);

  useEffect(() => {
    if (!open) return;
    void getVersions()
      .then((list) => {
        const releases = list.filter((v) => v.kind === "release").slice(0, 30);
        setVersions(releases);
        if (!mcVersion && releases.length > 0) setMcVersion(releases[0].version);
      })
      .catch(() => setVersions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canCreate =
    slug.length >= 2 && mcVersion.length > 0 && acceptEula && /^\d{4,5}$/.test(port);

  const handleCreate = async () => {
    if (!canCreate || !basePath) {
      if (!basePath) {
        toast.error("Configure your storage location first", {
          description: "Settings → Storage",
        });
        navigate("/settings/storage");
      }
      return;
    }
    setBusy(true);
    try {
      const result = await createServerCommand({
        basePath,
        slug,
        name: name.trim(),
        software,
        mcVersion,
        port: Number(port),
        ramMb: ram,
        acceptEula,
      });
      const now = new Date().toISOString();
      const record: ServerRecord = {
        id: crypto.randomUUID(),
        name: name.trim(),
        slug,
        software,
        minecraft_version: mcVersion,
        path: result.serverDir,
        port: Number(port),
        ram_mb: ram,
        status: "stopped",
        created_at: now,
        updated_at: now,
      };
      await insertServer(record);
      toast.success(`Server "${name.trim()}" created`, {
        description: "Official jar downloaded and verified. Open the console to start it.",
      });
      setName("");
      setAcceptEula(false);
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not create server", {
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
          <DialogTitle>Create server</DialogTitle>
          <DialogDescription>
            Official jar (vanilla via Mojang, Paper via Fill API), verified
            checksums, isolated under your workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="server-name">Server name</Label>
            <Input
              id="server-name"
              autoFocus
              placeholder="e.g. Kingdom SMP"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {slug && (
              <p className="font-mono text-[10px] text-muted-foreground">
                {basePath ? `${basePath}/servers/` : ""}
                {slug}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Software</Label>
              <Select value={software} onValueChange={(v) => setSoftware(v as typeof software)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vanilla">Vanilla</SelectItem>
                  <SelectItem value="paper">Paper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Minecraft version</Label>
              <Select value={mcVersion} onValueChange={setMcVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.version} value={v.version}>
                      {v.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="server-port">Port</Label>
              <Input
                id="server-port"
                inputMode="numeric"
                value={port}
                onChange={(e) => setPort(e.target.value.replace(/\D/g, "").slice(0, 5))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>RAM</Label>
              <div className="flex gap-1.5">
                {RAM_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={ram === option ? "default" : "outline"}
                    onClick={() => setRam(option)}
                  >
                    {option / 1024}G
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
            <Switch checked={acceptEula} onCheckedChange={setAcceptEula} />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              I accept the{" "}
              <a
                className="text-primary hover:underline"
                href="https://aka.ms/MinecraftEULA"
                onClick={(e) => e.preventDefault()}
                title="https://aka.ms/MinecraftEULA"
              >
                Minecraft EULA
              </a>
              . The server runs with online-mode=true — no account bypass, ever.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <Badge variant="default">{software}</Badge>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Download className="h-3 w-3" /> jar fetched at creation · backups
              and console included
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
            disabled={busy || !canCreate}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Creating…" : "Create server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
