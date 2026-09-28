import { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2, Square, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  messages: DisplayMessage[];
  streaming: boolean;
  attachedCount: number;
  hasProject: boolean;
  onSend: (text: string) => Promise<void>;
  onStop: () => void;
  onNewChat: () => void;
}

export function ChatPanel({
  messages,
  streaming,
  attachedCount,
  hasProject,
  onSend,
  onStop,
  onNewChat,
}: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const canSend = hasProject && draft.trim().length > 0 && !streaming;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        const text = draft;
        setDraft("");
        void onSend(text);
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Creator
        </span>
        <button
          className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={onNewChat}
          title="Start a fresh conversation (history stays in the database)"
        >
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyChat hasProject={hasProject} />
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-primary/15 text-foreground"
                      : "border border-border/60 bg-card/70 text-foreground/95",
                  )}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="chat-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                      {message.streaming && (
                        <span className="mt-1 inline-block h-4 w-1.5 animate-pulse-soft bg-primary align-middle" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 p-3">
        {attachedCount > 0 && (
          <div className="pb-2">
            <Badge variant="secondary">
              <ImagePlus className="h-3 w-3" />
              {attachedCount} reference{attachedCount === 1 ? "" : "s"} attached
            </Badge>
          </div>
        )}
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasProject}
            placeholder={
              hasProject
                ? "Describe what to build… (Enter to send, Shift+Enter for a new line)"
                : "Select a project first"
            }
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background/60 px-3 py-2.5 pr-12 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <div className="absolute bottom-2.5 right-2.5">
            {streaming ? (
              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onStop} title="Stop generation">
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant={canSend ? "gradient" : "secondary"}
                className="h-8 w-8"
                disabled={!canSend}
                onClick={() => {
                  const text = draft;
                  setDraft("");
                  void onSend(text);
                }}
                title="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {streaming && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating — the model is writing to your project…
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyChat({ hasProject }: { hasProject: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-xl bg-secondary/60 p-3">
        <Sparkles className="h-6 w-6 text-muted-foreground/60" />
      </div>
      {hasProject ? (
        <>
          <p className="text-sm font-medium text-foreground/90">
            Design with the project as context
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            The AI reads this project's spec, style bible and files before
            answering. Try:{" "}
            <span className="text-primary/90">
              "Design the project specification for a dark medieval RPG"
            </span>
          </p>
        </>
      ) : (
        <p className="max-w-xs text-xs text-muted-foreground">
          Select a project above to start.
        </p>
      )}
    </div>
  );
}
