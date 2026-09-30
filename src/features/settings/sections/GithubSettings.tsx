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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, SectionHeader } from "../SettingsBits";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  getGithubToken,
  getGithubUser,
  githubSignOut,
  signInWithGithub,
  type GithubUser,
} from "@/services/github/githubService";

export function GithubSettings() {
  const github = useSettingsStore((s) => s.settings.github);
  const update = useSettingsStore((s) => s.update);

  const [clientIdDraft, setClientIdDraft] = useState(github.clientId);
  const [user, setUser] = useState<GithubUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    userCode: string;
    verificationUrl: string;
  } | null>(null);

  useEffect(() => {
    void getGithubToken().then(async (token) => {
      if (!token) return;
      try {
        setUser(await getGithubUser(token));
      } catch {
        setUser(null);
      }
    });
  }, []);

  const handleSaveClientId = () => {
    if (clientIdDraft.trim() === github.clientId) return;
    update("github", { clientId: clientIdDraft.trim() })
      .then(() => toast.success("GitHub client id saved"))
      .catch(() => toast.error("Could not save client id"));
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    setDeviceInfo(null);
    try {
      const signed = await signInWithGithub((info) => setDeviceInfo(info));
      setUser(signed);
      setDeviceInfo(null);
    } catch (error) {
      toast.error("GitHub sign-in failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <section>
      <SectionHeader
        title="GitHub"
        description="Publish projects with OAuth device flow. The token lives in the OS keyring and is used only as a transient push header."
      />

      <Field
        label="GitHub account"
        hint={user ? `Signed in — token stored securely` : "Sign in to create repositories and push projects."}
      >
        <div className="max-w-md space-y-2 rounded-lg border border-border/70 bg-card/60 p-4">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-emerald-400" />
                <Badge variant="success">{user.login}</Badge>
                <span className="text-[10px] text-muted-foreground">{user.name ?? ""}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => { void githubSignOut(); setUser(null); }}>
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
              {signingIn ? "Waiting for authorization…" : "Sign in with GitHub"}
            </Button>
          )}
        </div>
      </Field>

      <Field
        label="GitHub OAuth client id"
        hint="Create a free OAuth App on github.com (Settings → Developer settings → OAuth Apps) and paste its client id. Device flow must be enabled for the app."
      >
        <div className="max-w-md">
          <Input
            className="font-mono text-xs"
            placeholder="Iv1.xxxxxxxxxxxxxxxx / Ov23xxxxxxxxxxxx"
            value={clientIdDraft}
            onChange={(e) => setClientIdDraft(e.target.value)}
            onBlur={handleSaveClientId}
          />
        </div>
      </Field>

      <Dialog open={deviceInfo !== null} onOpenChange={(open) => { if (!open) setDeviceInfo(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Authorize NexusCraft</DialogTitle>
            <DialogDescription>
              Open the link, enter the code and authorize the app. This is
              GitHub's own page.
            </DialogDescription>
          </DialogHeader>
          {deviceInfo && (
            <div className="space-y-3 text-center">
              <div className="rounded-lg border border-primary/30 bg-primary/10 py-3 font-mono text-2xl font-bold tracking-[0.2em] text-primary">
                {deviceInfo.userCode}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  import("@/services/storage/storageService")
                    .then((m) => m.openAuthUrl(deviceInfo.verificationUrl))
                    .catch(() =>
                      toast.info("Open this URL in your browser", {
                        description: deviceInfo.verificationUrl,
                      }),
                    )
                }
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {deviceInfo.verificationUrl}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> waiting for GitHub…
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
