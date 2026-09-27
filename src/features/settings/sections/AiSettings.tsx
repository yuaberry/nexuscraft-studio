import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Plug, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/settingsStore";
import { AI_PROVIDERS, getProviderMeta } from "@/services/ai/providers";
import {
  fetchAvailableModels,
  testAiConnection,
} from "@/services/ai/connectionService";
import {
  AI_API_KEY_ID,
  secretsBackendInfo,
  secretsDelete,
  secretsHas,
  secretsSet,
} from "@/services/secrets/secretsService";
import { Field, SectionHeader } from "../SettingsBits";
import { cn } from "@/lib/utils";
import type { AiConnectionTestResult, SecretBackendInfo } from "@/types";

export function AiSettings() {
  const ai = useSettingsStore((s) => s.settings.ai);
  const update = useSettingsStore((s) => s.update);

  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [backend, setBackend] = useState<SecretBackendInfo | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testResult, setTestResult] = useState<AiConnectionTestResult | null>(null);

  const meta = getProviderMeta(ai.provider);

  const refreshKeyState = () => {
    secretsHas(AI_API_KEY_ID).then(setHasKey).catch(() => setHasKey(false));
    secretsBackendInfo().then(setBackend).catch(() => setBackend(null));
  };

  useEffect(refreshKeyState, [ai.provider]);

  const handleSaveKey = async () => {
    const value = keyDraft.trim();
    if (!value) {
      toast.info("Nothing to save — enter a key first");
      return;
    }
    try {
      const result = await secretsSet(AI_API_KEY_ID, value);
      setKeyDraft("");
      setHasKey(true);
      setTestResult(null);
      toast.success("API key stored securely", {
        description:
          result.backend === "os-keyring"
            ? "Saved in your operating system's credential manager."
            : "OS keyring unavailable — saved to a permission-restricted local file.",
      });
    } catch (error) {
      toast.error("Failed to store API key", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleRemoveKey = async () => {
    try {
      await secretsDelete(AI_API_KEY_ID);
      setHasKey(false);
      setKeyDraft("");
      setTestResult(null);
      toast.success("API key removed");
    } catch (error) {
      toast.error("Failed to remove key", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { secretsGet } = await import("@/services/secrets/secretsService");
      const key = await secretsGet(AI_API_KEY_ID);
      const result = await testAiConnection(ai, key);
      setTestResult(result);
      if (result.ok) {
        toast.success(result.message, { description: `${result.latencyMs} ms round trip` });
      } else {
        toast.error("Connection failed", { description: result.message });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    try {
      const { secretsGet } = await import("@/services/secrets/secretsService");
      const key = await secretsGet(AI_API_KEY_ID);
      const list = await fetchAvailableModels(ai, key);
      setModels(list);
      toast.success(`Fetched ${list.length} models`, {
        description: "Pick one from the model field dropdown.",
      });
    } catch (error) {
      toast.error("Could not fetch models", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <section>
      <SectionHeader
        title="AI"
        description="Provider-agnostic by design — bring your own model, cloud or local."
      />

      {/* Provider selection */}
      <Field label="Provider" hint="Keys are stored in the OS credential manager — never in the database or Git.">
        <div className="grid gap-3 sm:grid-cols-2">
          {AI_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() =>
                update("ai", { provider: provider.id }).catch(() =>
                  toast.error("Could not save provider"),
                )
              }
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                ai.provider === provider.id
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/70 bg-card/40 hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{provider.label}</span>
                {ai.provider === provider.id && <Badge>Active</Badge>}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {provider.description}
              </p>
            </button>
          ))}
        </div>
      </Field>

      {/* Model */}
      <Field
        label="Model"
        hint="Fetch the live list from your provider, or type an ID manually."
      >
        <div className="flex max-w-md items-center gap-2">
          <Input
            list="ai-model-list"
            placeholder={meta.modelPlaceholder}
            value={ai.model}
            onChange={(e) => void update("ai", { model: e.target.value }).catch(() => {})}
          />
          <datalist id="ai-model-list">
            {models.slice(0, 500).map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void handleFetchModels()}
            disabled={fetchingModels}
            title="Fetch available models"
          >
            {fetchingModels ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Field>

      {/* API key */}
      {meta.requiresKey && (
        <Field
          label="API key"
          hint={
            hasKey
              ? backend?.backend === "os-keyring"
                ? "A key is stored in the OS credential manager."
                : "A key is stored in a permission-restricted local file (OS keyring unavailable)."
              : `Paste your ${meta.label} key. It never leaves this machine.`
          }
        >
          <div className="max-w-md space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  type={showKey ? "text" : "password"}
                  className="pl-9 pr-10 font-mono text-xs"
                  placeholder={hasKey ? "•••••••••••••••• (stored)" : meta.keyHint}
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                  onClick={() => setShowKey((v) => !v)}
                  type="button"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={() => void handleSaveKey()} disabled={!keyDraft.trim()}>
                Save
              </Button>
              {hasKey && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void handleRemoveKey()}
                  title="Remove stored key"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {hasKey && (
              <Badge variant="success">
                Key stored{backend ? ` · ${backend.backend}` : ""}
              </Badge>
            )}
          </div>
        </Field>
      )}

      {/* Base URL */}
      {meta.supportsBaseUrl && (
        <Field
          label="Base URL"
          hint={`Custom endpoint support (any ${meta.label}-compatible API). Leave empty for the official API.`}
        >
          <div className="max-w-md">
            <Input
              className="font-mono text-xs"
              placeholder={meta.defaultBaseUrl}
              value={ai.baseUrl}
              onChange={(e) => void update("ai", { baseUrl: e.target.value }).catch(() => {})}
            />
          </div>
        </Field>
      )}

      <Separator className="my-2" />

      {/* Sampling */}
      <Field
        label={`Temperature — ${ai.temperature.toFixed(1)}`}
        hint="Lower is deterministic and precise; higher is creative. Code generation works best between 0.2 and 0.8."
      >
        <div className="max-w-md">
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={ai.temperature}
            onChange={(e) =>
              void update("ai", { temperature: Number(e.target.value) }).catch(() => {})
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[hsl(var(--primary))]"
          />
        </div>
      </Field>

      <Field
        label="Max tokens"
        hint="Upper bound for a single AI response. Generation is capped by the provider anyway."
      >
        <div className="max-w-md">
          <Input
            type="number"
            min={256}
            max={200000}
            value={ai.maxTokens}
            onChange={(e) =>
              void update("ai", { maxTokens: Number(e.target.value) }).catch(() => {})
            }
          />
        </div>
      </Field>

      <Separator className="my-2" />

      {/* Connection test */}
      <Field
        label="Connection test"
        hint="Performs a live request against the configured provider with your stored key."
      >
        <div className="space-y-3">
          <Button
            variant="gradient"
            onClick={() => void handleTest()}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            {testing ? "Testing…" : "Test connection"}
          </Button>

          {testResult && (
            <div
              className={cn(
                "rounded-lg border p-4 text-sm",
                testResult.ok
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  {testResult.ok ? "Connected" : "Failed"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {testResult.latencyMs} ms
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 font-mono text-xs leading-relaxed",
                  testResult.ok ? "text-emerald-300/80" : "text-red-300/80",
                )}
              >
                {testResult.message}
              </p>
              {testResult.details && (
                <div className="mt-2 space-y-1">
                  {Object.entries(testResult.details).map(([k, v]) => (
                    <p key={k} className="text-xs text-muted-foreground">
                      <span className="font-mono">{k}</span>: {v}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Field>

      <div className="pt-2">
        <Label className="text-[11px] text-muted-foreground/70">
          Streaming chat, tool-calling and the Nexus Agent arrive in Phases 2–4,
          building on this exact configuration.
        </Label>
      </div>
    </section>
  );
}
