import { useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { secretsBackendInfo, secretsClearAll } from "@/services/secrets/secretsService";
import { Field, InfoRow, SectionHeader } from "../SettingsBits";
import type { SecretBackendInfo } from "@/types";

export function SecuritySettings() {
  const [backend, setBackend] = useState<SecretBackendInfo | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    secretsBackendInfo()
      .then(setBackend)
      .catch(() => setBackend(null));
  }, []);

  const handleClearAll = async () => {
    setBusy(true);
    try {
      await secretsClearAll();
      toast.success("All stored secrets cleared");
    } catch (error) {
      toast.error("Failed to clear secrets", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <section>
      <SectionHeader
        title="Security"
        description="How NexusCraft protects credentials on this machine."
      />

      <Field
        label="Credential storage"
        hint="API keys are stored outside the SQLite database and are redacted from all logs."
      >
        <div className="max-w-md space-y-2 rounded-lg border border-border/70 bg-card/60 p-4">
          <div className="flex items-center gap-2">
            {backend ? (
              backend.backend === "os-keyring" ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <Badge variant="success">OS credential manager</Badge>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 text-amber-400" />
                  <Badge variant="warning">Local file (restricted permissions)</Badge>
                </>
              )
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <InfoRow
            label="Backend"
            value={backend?.backend ?? "detecting…"}
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            {backend?.backend === "os-keyring"
              ? "Keys are managed by your operating system's credential service (GNOME Keyring / Windows Credential Manager / macOS Keychain)."
              : "The OS keyring was unavailable, so keys are kept in a file readable only by your user account. Consider installing gnome-keyring for hardware-managed secrets."}
          </p>
        </div>
      </Field>

      <Field
        label="Danger zone"
        hint="Removes every stored secret (API keys). You will need to re-enter them."
      >
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          Clear all stored secrets
        </Button>
      </Field>

      <Field
        label="Agent sandbox (Phases 3–4)"
        hint="Architecture commitments for the Nexus Agent."
      >
        <ul className="max-w-md list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
          <li>
            Every tool call (read/write/edit/delete/build) is validated by a Rust
            path guard — nothing outside the project workspace is writable.
          </li>
          <li>
            Process execution uses a strict executable allowlist (gradle, git,
            java, server jars) — no arbitrary shell commands.
          </li>
          <li>
            Every call is recorded to the audited <code>ai_tool_calls</code>
            {" "}table with status ok / denied / error.
          </li>
          <li>
            Destructive operations require explicit confirmation in the UI.
          </li>
        </ul>
      </Field>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all stored secrets?</DialogTitle>
            <DialogDescription>
              This permanently removes every API key stored by NexusCraft Studio.
              Features using them will stop working until you re-enter the keys.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleClearAll()}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Clear secrets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
