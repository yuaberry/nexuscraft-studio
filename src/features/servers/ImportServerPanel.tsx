/**
 * Import from a live server — real SLP ping, styled MOTD preview,
 * deterministic style inference and an optional AI pass that designs a
 * custom preset from the server's live data. Plus public references
 * the user can ping and pull data from, live.
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Globe,
  Loader2,
  Radar,
  Server as ServerIcon,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settingsStore";
import { secretsHas, AI_API_KEY_ID } from "@/services/secrets/secretsService";
import { getProviderMeta } from "@/services/ai/providers";
import { streamChat } from "@/services/ai/streaming";
import {
  pingServer,
  type ServerPingData,
} from "@/services/servers/serverPingService";
import { parseMotd } from "@/services/servers/motd";
import {
  inferPresetFromPing,
  designStyleWithAi,
  type AiStyleSuggestion,
} from "@/services/servers/inferStyle";
import type { ServerStylePreset } from "@/services/servers/serverPresets";
import { PUBLIC_SERVER_REFS } from "@/services/servers/publicServers";

interface ImportServerPanelProps {
  onApplyPreset: (preset: ServerStylePreset | null, name: string, properties: Record<string, string>) => void;
}

/** Renders legacy/component MOTD parts with their real colors. */
function MotdView({ raw }: { raw: string }) {
  let description: unknown = raw;
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      description = JSON.parse(raw);
    } catch {
      description = raw;
    }
  }
  const parts = parseMotd(description);
  return (
    <span className="font-mono text-xs">
      {parts.map((part, index) => (
        <span
          key={index}
          style={{
            color: part.color,
            fontWeight: part.bold ? 700 : 400,
            fontStyle: part.italic ? "italic" : undefined,
            textDecoration:
              [part.underline ? "underline" : "", part.strikethrough ? "line-through" : ""]
                .filter(Boolean)
                .join(" ") || undefined,
          }}
        >
          {part.text}
        </span>
      ))}
    </span>
  );
}

export function ImportServerPanel({ onApplyPreset }: ImportServerPanelProps) {
  const aiSettings = useSettingsStore((s) => s.settings.ai);

  const [address, setAddress] = useState("");
  const [pinging, setPinging] = useState(false);
  const [ping, setPing] = useState<ServerPingData | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiStyleSuggestion | null>(null);

  const provider = getProviderMeta(aiSettings.provider);
  const aiReady =
    aiSettings.model.trim().length > 0 && (!provider.requiresKey || /* lazy */ true);

  const runPing = useCallback(async (target?: string) => {
    const value = (target ?? address).trim();
    if (!value) {
      toast.error("Type a server address first", {
        description: "e.g. play.example.net or play.example.net:25566",
      });
      return;
    }
    setPinging(true);
    setPingError(null);
    setPing(null);
    setAiSuggestion(null);
    try {
      const result = await pingServer(value);
      setPing(result);
      toast.success(`Reached ${result.host}:${result.port}`, {
        description: `${result.playersOnline} players online · ${result.latencyMs}ms`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPingError(message);
    } finally {
      setPinging(false);
    }
  }, [address]);

  const runAiDesign = useCallback(async () => {
    if (!ping || aiBusy) return;
    setAiBusy(true);
    try {
      const apiKey = provider.requiresKey
        ? await secretsGetAiKey()
        : null;
      const suggestion = await designStyleWithAi(ping, {
        sendPrompt: async (system, user) => {
          let text = "";
          for await (const event of streamChat(aiSettings, apiKey, [
            { role: "system", content: system },
            { role: "user", content: user },
          ])) {
            if (event.type === "delta") text += event.text;
            if (event.type === "error") throw new Error(event.message);
          }
          return text;
        },
      });
      setAiSuggestion(suggestion);
      toast.success(`AI designed “${suggestion.styleName}”`, {
        description: suggestion.rationale.slice(0, 140),
      });
    } catch (error) {
      toast.error("AI design failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setAiBusy(false);
    }
  }, [ping, aiBusy, aiSettings, provider.requiresKey]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }, []);

  const inferred = ping ? inferPresetFromPing(ping) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* ---------- ping box ---------- */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4 text-primary" />
            Import from a live server
          </CardTitle>
          <Badge variant="secondary">real SLP protocol</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Paste a server address (or link) — NexusCraft performs the same
            handshake every launcher does and pulls live MOTD, version,
            players and icon. Then recreate that vibe locally as a styled
            preset, or let Nexus AI design one from the real data.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="play.example.net  ·  play.example.net:25566  ·  https://…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runPing()}
              className="font-mono text-xs"
            />
            <Button onClick={() => void runPing()} disabled={pinging} className="shrink-0">
              {pinging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
              Ping
            </Button>
          </div>

          {pingError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[11px] leading-relaxed text-destructive">
              {pingError}
            </div>
          )}

          {ping && (
            <div className="space-y-3 rounded-lg border border-border/70 bg-card/60 p-3">
              <div className="flex items-start gap-3">
                {ping.favicon ? (
                  <img
                    src={ping.favicon}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md border border-border/70 image-render-pixelated"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border/70 bg-secondary/60">
                    <ServerIcon className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <MotdView raw={ping.motdRaw} />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{ping.version}</Badge>
                    <Badge variant="secondary">
                      <Users className="mr-1 h-2.5 w-2.5" />
                      {ping.playersOnline}/{ping.playersMax}
                    </Badge>
                    <Badge variant="secondary">
                      <Zap className="mr-1 h-2.5 w-2.5" />
                      {ping.latencyMs}ms
                    </Badge>
                  </div>
                </div>
                <button
                  className="shrink-0 text-muted-foreground/70 transition-colors hover:text-foreground"
                  onClick={() => void copy(`${ping.host}:${ping.port}`)}
                  title="Copy address"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              {ping.modsJson && (
                <p className="text-[10px] text-muted-foreground/70">
                  Modded server detected — mod list captured for the AI.
                </p>
              )}

              {/* Deterministic inference */}
              {inferred && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                  <p className="text-[11px] font-semibold text-primary">
                    Local match: {inferred.name}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    {inferred.tagline} — {inferred.description}
                  </p>
                  <Button
                    size="sm"
                    variant="gradient"
                    className="mt-2"
                    onClick={() =>
                      onApplyPreset(
                        inferred,
                        `${ping.host} style`,
                        {
                          ...inferred.properties,
                          motd: ping.motd.slice(0, 59) || inferred.properties.motd,
                        },
                      )
                    }
                  >
                    Create local server in this style
                  </Button>
                </div>
              )}

              {/* AI design */}
              <div className="rounded-lg border border-dashed border-border/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Want a bespoke style instead?
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={aiBusy}
                    onClick={() => void runAiDesign()}
                    title={aiReady ? "Ask the configured AI provider" : "Configure AI in Settings → AI first"}
                  >
                    {aiBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Design with AI
                  </Button>
                </div>
                {aiSuggestion && (
                  <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-semibold text-primary">
                      {aiSuggestion.styleName}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                      {aiSuggestion.description}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge variant="secondary">{aiSuggestion.software}</Badge>
                      {Object.entries(aiSuggestion.properties).slice(0, 6).map(([k, v]) => (
                        <Badge key={k} variant="outline" className="text-[9px]">
                          {k}={v}
                        </Badge>
                      ))}
                      {aiSuggestion.modules.map((m) => (
                        <Badge key={m} variant="default" className="text-[9px]">
                          {m}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="gradient"
                      className="mt-2"
                      onClick={() => {
                        onApplyPreset(
                          null,
                          aiSuggestion.styleName,
                          { ...aiSuggestion.properties, motd: aiSuggestion.styleName },
                        );
                        toast.info("Style applied to the wizard", {
                          description:
                            "Modules: " +
                            (aiSuggestion.modules.length > 0
                              ? aiSuggestion.modules.join(", ")
                              : "none"),
                        });
                      }}
                    >
                      Use this design
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- references ---------- */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Server references
          </CardTitle>
          <Badge variant="secondary">ping them live</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="pb-1 text-[11px] leading-relaxed text-muted-foreground">
            Famous public servers and platforms — the addresses their own
            authors publish. Ping any of them to see live data and pull it
            into your own style.
          </p>
          {PUBLIC_SERVER_REFS.map((ref) => (
            <div
              key={ref.id}
              className="rounded-lg border border-border/60 bg-card/40 p-2.5 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-xs font-semibold">
                    {ref.name}
                    <Badge variant="outline" className="text-[8px] uppercase">
                      {ref.kind}
                    </Badge>
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {ref.address} · {ref.style}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7"
                    onClick={() => {
                      setAddress(ref.address);
                      void runPing(ref.address);
                    }}
                  >
                    <Radar className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-muted-foreground"
                    onClick={() => void copy(ref.website)}
                    title={ref.website}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/70">
                {ref.note}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function secretsGetAiKey(): Promise<string | null> {
  const has = await secretsHas(AI_API_KEY_ID);
  if (!has) return null;
  const { secretsGet } = await import("@/services/secrets/secretsService");
  return secretsGet(AI_API_KEY_ID);
}
