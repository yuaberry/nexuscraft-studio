import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectsStore } from "@/stores/projectsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ChatPanel, type DisplayMessage } from "./ChatPanel";
import { InspectorPanel } from "./InspectorPanel";
import { SpecPreview } from "./SpecPreview";
import {
  appendMessage,
  createSession,
  getLatestSession,
  listMessages,
  type AiSessionRecord,
} from "@/services/ai/sessions";
import {
  buildSystemPrompt,
  loadProjectContext,
  type ProjectContext,
} from "@/services/ai/contextService";
import {
  setReferenceStorageBase,
  listReferences,
  readReferenceBase64,
  type ReferenceImage,
} from "@/services/ai/references";
import {
  streamChat,
  type ChatMessage,
  type ImagePart,
} from "@/services/ai/streaming";
import { secretsGet, AI_API_KEY_ID } from "@/services/secrets/secretsService";
import { getProviderMeta } from "@/services/ai/providers";
import { extractSpecProposal } from "./specUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Boxes, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function AiCreatorPage() {
  const navigate = useNavigate();
  const projects = useProjectsStore((s) => s.projects);
  const projectsLoaded = useProjectsStore((s) => s.loaded);
  const hydrateProjects = useProjectsStore((s) => s.hydrate);
  const aiSettings = useSettingsStore((s) => s.settings.ai);
  const basePath = useSettingsStore((s) => s.settings.storage.basePath);

  const [projectId, setProjectId] = useState<string | null>(null);
  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const [session, setSession] = useState<AiSessionRecord | null>(null);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [specProposal, setSpecProposal] = useState<string | null>(null);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [attached, setAttached] = useState<Set<string>>(new Set());

  const streamRef = useRef<AsyncGenerator<unknown, void, unknown> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!projectsLoaded) void hydrateProjects();
  }, [projectsLoaded, hydrateProjects]);

  // Default to the most recent project once
  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [projectId, projects]);

  useEffect(() => {
    if (basePath) void setReferenceStorageBase(basePath);
  }, [basePath]);

  // Load session + context + references when the project changes
  useEffect(() => {
    if (!project) {
      setSession(null);
      setContext(null);
      setMessages([]);
      setReferences([]);
      setSpecProposal(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [latest, ctx, refs] = await Promise.all([
          getLatestSession(project.id),
          loadProjectContext(project),
          listReferences(project.slug).catch(() => []),
        ]);
        if (cancelled) return;
        setContext(ctx);
        setReferences(refs);
        setAttached(new Set());
        if (latest) {
          setSession(latest);
          const history = await listMessages(latest.id);
          if (cancelled) return;
          setMessages(
            history
              .map((m): DisplayMessage | null =>
                m.role === "user" || m.role === "assistant"
                  ? { role: m.role, content: m.content }
                  : null,
              )
              .filter((m): m is DisplayMessage => m !== null),
          );
        } else {
          setSession(null);
          setMessages([]);
        }
      } catch (error) {
        toast.error("Could not load project context", {
          description: String(error),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project]);

  const ensureSession = useCallback(async (): Promise<AiSessionRecord> => {
    if (session) return session;
    if (!project) throw new Error("No project selected");
    const created = await createSession(project.id, `${project.name} session`);
    setSession(created);
    return created;
  }, [session, project]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!project || !context) return;
      if (streaming) return;

      const meta = getProviderMeta(aiSettings.provider);
      const apiKey = meta.requiresKey ? await secretsGet(AI_API_KEY_ID) : null;
      if (meta.requiresKey && !apiKey) {
        toast.error("Configure your API key first", {
          description: "Settings → AI → API key",
        });
        navigate("/settings/ai");
        return;
      }
      if (!aiSettings.model.trim()) {
        toast.error("Choose a model first", { description: "Settings → AI → Model" });
        navigate("/settings/ai");
        return;
      }

      const activeSession = await ensureSession();

      // Vision parts for attached references
      const imageParts: ImagePart[] = [];
      for (const relPath of attached) {
        try {
          const { base64, mediaType } = await readReferenceBase64(project.slug, relPath);
          imageParts.push({ type: "image", mediaType, base64 });
        } catch (error) {
          toast.warning(`Could not attach ${relPath.split("/").pop()}`, {
            description: String(error),
          });
        }
      }

      const userMessage: DisplayMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);
      setStreaming(true);
      abortRef.current = false;

      try {
        await appendMessage(activeSession.id, "user", text);
      } catch (e) {
        console.warn("Failed to persist user message", e);
      }

      const history: ChatMessage[] = [
        { role: "system", content: buildSystemPrompt(context) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];
      history.push({
        role: "user",
        content:
          imageParts.length > 0
            ? [{ type: "text", text } as const, ...imageParts]
            : text,
      });

      let full = "";
      try {
        const generator = streamChat(aiSettings, apiKey, history);
        streamRef.current = generator as AsyncGenerator<unknown, void, unknown>;
        for await (const event of generator) {
          if (abortRef.current) break;
          const typed = event as
            | { type: "delta"; text: string }
            | { type: "done" }
            | { type: "error"; message: string };
          if (typed.type === "delta") {
            full += typed.text;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant" && last.streaming) {
                next[next.length - 1] = { ...last, content: full };
              } else {
                next.push({ role: "assistant", content: full, streaming: true });
              }
              return next;
            });
          } else if (typed.type === "error") {
            toast.error("AI request failed", { description: typed.message });
            break;
          } else {
            break;
          }
        }
      } catch (error) {
        toast.error("AI request failed", { description: String(error) });
      } finally {
        streamRef.current = null;
        setStreaming(false);
        // finalize the assistant bubble
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.role === "assistant"
              ? { ...m, streaming: false }
              : m,
          ),
        );
        if (full.trim().length > 0) {
          try {
            await appendMessage(activeSession.id, "assistant", full);
          } catch (e) {
            console.warn("Failed to persist assistant message", e);
          }
          const proposal = extractSpecProposal(full);
          if (proposal) {
            setSpecProposal(proposal);
            toast.success("Specification proposal ready", {
              description: "Review and save it in the center panel.",
            });
          }
        }
      }
    },
    [project, context, aiSettings, messages, attached, streaming, ensureSession, navigate],
  );

  const handleStop = useCallback(() => {
    abortRef.current = true;
    void streamRef.current?.return(undefined);
  }, []);

  const handleNewChat = useCallback(() => {
    setSession(null);
    setMessages([]);
    setSpecProposal(null);
  }, []);

  const refreshContext = useCallback(async () => {
    if (!project) return;
    setContext(await loadProjectContext(project));
  }, [project]);

  if (projectsLoaded && projects.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="rounded-2xl bg-secondary/60 p-4">
          <Boxes className="h-8 w-8 text-muted-foreground/70" />
        </div>
        <div>
          <p className="text-lg font-semibold">The AI Creator needs a project</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            The AI operates on a real project on disk — spec, files, style bible
            and context. Create one first, then come back to design with it.
          </p>
        </div>
        <button
          className="btn-ghost text-sm text-primary hover:underline"
          onClick={() => useUiStoreSafeOpenWizard()}
        >
          Create project
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-card/30 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <Select
            value={projectId ?? undefined}
            onValueChange={(v) => {
              setProjectId(v);
              setSession(null);
            }}
          >
            <SelectTrigger className="h-8 w-64">
              <SelectValue placeholder="Select project…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {project && (
            <Badge variant="secondary">
              {project.loader} · MC {project.minecraft_version}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {context?.projectSpecParsed ? (
            <Badge variant="success">spec loaded</Badge>
          ) : (
            <Badge variant="warning">no spec yet</Badge>
          )}
        </div>
      </div>

      {/* 3 columns */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_300px]">
        <ChatPanel
          messages={messages}
          streaming={streaming}
          attachedCount={attached.size}
          onSend={handleSend}
          onStop={handleStop}
          onNewChat={handleNewChat}
          hasProject={project !== null}
        />
        <SpecPreview
          context={context}
          proposal={specProposal}
          onSaved={() => void refreshContext()}
        />
        <InspectorPanel
          context={context}
          projectSlug={project?.slug ?? null}
          references={references}
          attached={attached}
          onReferencesChanged={async (next) => {
            setAttached(next);
            if (project) setReferences(await listReferences(project.slug));
          }}
          onQuickPrompt={(prompt) => {
            void handleSend(prompt);
          }}
        />
      </div>
    </div>
  );
}

/** Small helper to avoid importing the whole ui store here twice. */
function useUiStoreSafeOpenWizard() {
  import("@/stores/uiStore").then((m) => m.useUiStore.getState().setCreateWizardOpen(true));
}
