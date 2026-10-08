import { useEffect, useState } from "react";
import { ExternalLink, Loader2, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
import { Field, SectionHeader } from "../SettingsBits";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  getStoredAccount,
  signInWithMicrosoft,
  signOut,
  type MinecraftAccount,
} from "@/services/launcher/authService";

const RAM_OPTIONS = [2048, 4096, 6144, 8192, 12288, 16384];

export function LauncherSettings() {
  const launcher = useSettingsStore((s) => s.settings.launcher);
  const update = useSettingsStore((s) => s.update);

  const [clientIdDraft, setClientIdDraft] = useState(launcher.clientId);
  const [account, setAccount] = useState<MinecraftAccount | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    userCode: string;
    verificationUrl: string;
  } | null>(null);

  useEffect(() => {
    void getStoredAccount().then(setAccount).catch(() => setAccount(null));
  }, []);

  const handleSaveClientId = () => {
    if (clientIdDraft.trim() === launcher.clientId) return;
    update("launcher", { clientId: clientIdDraft.trim() })
      .then(() => toast.success("MSA client id saved"))
      .catch(() => toast.error("Could not save client id"));
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    setDeviceInfo(null);
    try {
      const signed = await signInWithMicrosoft((info) => setDeviceInfo(info));
      setAccount(signed);
      setDeviceInfo(null);
    } catch (error) {
      toast.error("Sign-in failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setAccount(null);
    toast.success("Signed out");
  };

  return (
    <section>
      <SectionHeader
        title="Launcher"
        description="Run Minecraft with your mods through the legitimate Microsoft device-flow sign-in — the same used by open-source launchers."
      />

      <Field
        label="Microsoft account"
        hint={account ? `Token valid — expires ${new Date(account.expiresAt).toLocaleString()}` : "Sign in to launch the game with your mods."}
      >
        <div className="max-w-md space-y-2 rounded-lg border border-border/70 bg-card/60 p-4">
          {account ? (
            <>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-emerald-400" />
                <Badge variant="success">{account.username}</Badge>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {account.uuid}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => void handleSignOut()}>
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </Button>
            </>
          ) : (
            <Button
              variant="gradient"
              size="sm"
              disabled={signingIn || clientIdDraft.trim().length < 10}
              onClick={() => void handleSignIn()}
            >
              {signingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {signingIn ? "Waiting for sign-in…" : "Sign in with Microsoft"}
            </Button>
          )}
        </div>
      </Field>

      <Field
        label="MSA client id (Azure app)"
        hint="Device-flow authentication needs an app registration — free at portal.azure.com → App registrations (public client, mobile/desktop). This is the same mechanism legitimate open-source launchers use."
      >
        <div className="max-w-md space-y-1.5">
          <Input
            className="font-mono text-xs"
            placeholder="00000000-0000-0000-0000-000000000000"
            value={clientIdDraft}
            onChange={(e) => setClientIdDraft(e.target.value)}
            onBlur={handleSaveClientId}
          />
          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            The app must allow "Allow public client flows" so the device-code
            grant works. No secret needed on desktop.
          </p>
        </div>
      </Field>

      <Field label="Game RAM" hint="Allocated to the game process (-Xmx).">
        <div className="flex max-w-md gap-2">
          {RAM_OPTIONS.map((ram) => (
            <Button
              key={ram}
              size="sm"
              variant={launcher.ramMb === ram ? "default" : "outline"}
              onClick={() =>
                update("launcher", { ramMb: ram }).catch(() =>
                  toast.error("Could not save RAM preference"),
                )
              }
            >
              {ram / 1024} GB
            </Button>
          ))}
        </div>
      </Field>

      <Field label="Legal" hint="Always on, by design.">
        <div className="max-w-md rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[11px] leading-relaxed text-amber-200/80">
            Minecraft files are downloaded at runtime from Mojang's official
            endpoints for your local use — nothing is redistributed. VOXEL
            never implements account bypasses or cracked authentication.
          </p>
        </div>
      </Field>

      {/* Device code dialog */}
      <Dialog open={deviceInfo !== null} onOpenChange={(open) => { if (!open) setDeviceInfo(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Finish signing in</DialogTitle>
            <DialogDescription>
              Open the link below in any browser and enter the code. This
              page is Microsoft's — VOXEL only receives the token.
            </DialogDescription>
          </DialogHeader>
          {deviceInfo && (
            <div className="space-y-3 text-center">
              <div className="rounded-lg border border-primary/30 bg-primary/10 py-3 font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                {deviceInfo.userCode}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  import("@/services/storage/storageService").then((m) =>
                    m.openAuthUrl(deviceInfo.verificationUrl).catch((error) =>
                      toast.info("Open this URL in your browser", {
                        description: `${deviceInfo.verificationUrl} (${String(error)})`,
                      }),
                    ),
                  )
                }
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {deviceInfo.verificationUrl}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                waiting for you to complete sign-in…
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeviceInfo(null);
                setSigningIn(false);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
