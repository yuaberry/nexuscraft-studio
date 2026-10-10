import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, InfoRow, SectionHeader } from "../SettingsBits";
import { bridgeStart, bridgeStatus, bridgeStop, type BridgeInfo } from "@/services/bridge/bridgeService";
import { useSettingsStore } from "@/stores/settingsStore";

export function MobileSettings() {
  const [info, setInfo] = useState<BridgeInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const aiModel = useSettingsStore((s) => s.settings.ai.model);

  const refresh = () => {
    bridgeStatus()
      .then(setInfo)
      .catch(() => setInfo(null));
  };

  useEffect(refresh, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (info?.running) {
        await bridgeStop();
        toast.success("Mobile connections disabled");
      } else {
        const started = await bridgeStart();
        if (started.running) {
          toast.success("Bridge online", {
            description: `Pair the VOXEL mobile app with ${started.addresses[0] ?? "your PC's IP"}:${started.port}`,
          });
        } else {
          toast.error("Could not start the bridge", {
            description: `Is port ${started.port} free? Check your firewall.`,
          });
        }
        setInfo(started);
      }
    } catch (error) {
      toast.error("Bridge error", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <SectionHeader
        title="Mobile"
        description="Let the VOXEL mobile app control this PC — projects, builds, servers and AI, all through a token-paired local bridge."
      />

      <Field
        label="Bridge"
        hint="Off by default. When on, the app listens on your local network (port 3717) and only accepts requests carrying the pairing token. Your AI key never leaves this machine."
      >
        <div className="flex items-center gap-3">
          <Button onClick={() => void toggle()} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            {info?.running ? "Disable" : "Enable mobile connections"}
          </Button>
          <Button variant="ghost" size="icon" onClick={refresh} title="Refresh">
            <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </Field>

      {info?.running && info.token && (
        <div className="mt-2 space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div>
            <p className="text-xs font-semibold text-primary">Pairing</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              In the mobile app: choose <b>Connect to PC</b>, type the address
              below and this token.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-card/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Address
              </p>
              <p className="mt-0.5 font-mono text-sm">
                {(info.addresses[0] ?? "this-pc")}:{info.port}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Token
              </p>
              <p className="mt-0.5 font-mono text-sm tracking-[0.2em] text-primary">
                {info.token}
              </p>
            </div>
          </div>
          <InfoRow
            label="AI relay"
            value={
              aiModel.trim()
                ? `Phone chats through ${aiModel} (key stays here)`
                : "Not configured — set an AI model first (Settings → AI)"
            }
          />
        </div>
      )}

      <div className="mt-2">
        <InfoRow
          label="Status"
          value={info?.running ? "Online (local network)" : "Offline"}
        />
        {info?.running && (
          <InfoRow label="Port" value={String(info.port)} />
        )}
      </div>
    </section>
  );
}
