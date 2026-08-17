import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Loader2, Send, Sparkles, Trash2, ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { listChatMessages, clearChatHistory } from "@/lib/chat.functions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Ask AI — DoseRoutine" },
      {
        name: "description",
        content:
          "Ask questions about everything in your stack — supplements, peptides, hormones and more. Answers use your own stack for context.",
      },
    ],
  }),
  component: ChatPage,
});

const STARTERS = [
  "Can I take magnesium and zinc together?",
  "Best time to take vitamin D?",
  "Does anything in my stack interact with ashwagandha?",
  "How long before workouts should I take creatine?",
  "What can I stack with GLP-1 for muscle preservation?",
];

const DAILY_LIMITS: Record<string, number> = { free: 5, pro: 30 };

function tierOf(sub: { isPro?: boolean; isPaid?: boolean } | undefined | null): "free" | "pro" {
  if (sub?.isPro || sub?.isPaid) return "pro";
  return "free";
}

function ChatPage() {
  const qc = useQueryClient();
  const { data: subscription } = useSubscription();
  const tier = tierOf(subscription);
  const limit = DAILY_LIMITS[tier];

  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setToken(sess?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useServerFn(listChatMessages);
  const clear = useServerFn(clearChatHistory);
  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: () => load({ data: undefined as never }),
    staleTime: 60_000,
  });

  const initialMessages = useMemo(() => {
    if (!history) return [];
    return history.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));
  }, [history]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          "x-doseroutine-tier": tier,
        }),
      }),
    [token, tier],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    messages: initialMessages,
    onError: (e) => console.error("chat error", e),
  });

  useEffect(() => {
    if (initialMessages.length && messages.length === 0) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages.length]);

  const clearMut = useMutation({
    mutationFn: () => clear({ data: undefined as never }),
    onSuccess: () => {
      setMessages([]);
      qc.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  // Count only user messages sent this session for the visible "N of limit" hint.
  const userMsgs = messages.filter((m) => m.role === "user").length;
  const overLimit = Number.isFinite(limit) && userMsgs >= limit;

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || isBusy || !token) return;
    setInput("");
    await sendMessage({ text: clean });
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader
        hideBack
        title="Ask AI"
        actions={
          messages.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (confirm("Clear this conversation?")) clearMut.mutate();
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : undefined
        }
      />

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 pb-40 pt-3">
        {histLoading && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState onPick={send} tier={tier} limit={limit} />
        ) : (
          <div data-testid="chat-transcript" className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} parts={m.parts} />
            ))}
            {isBusy && messages[messages.length - 1]?.role === "user" ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            ) : null}
            {error ? (
              <div
                data-testid="chat-error"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {String(error.message || error)}
              </div>
            ) : null}

            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-0 bottom-16 z-30 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:bottom-0"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            disabled={overLimit}
            placeholder={
              overLimit
                ? `Daily limit reached (${limit}). ${tier === "free" ? "Upgrade for more." : "Try again tomorrow."}`
                : "Ask about your stack…"
            }
            className="min-h-[44px] max-h-40 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            disabled={isBusy || !input.trim() || overLimit || !token}
            aria-label="Send"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {Number.isFinite(limit) ? (
          <div className="mx-auto mt-1.5 flex max-w-2xl items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {tier === "free" ? "Free" : "Pro"} · {userMsgs}/{limit} today
            </span>
            {tier === "free" ? (
              <Link to="/upgrade" search={{}} className="text-primary hover:underline">
                Upgrade for more
              </Link>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}

function MessageBubble({
  role,
  parts,
}: {
  role: "user" | "assistant" | "system" | "data";
  parts: Array<{ type: string; text?: string }>;
}) {
  const text = parts.map((p) => (p.type === "text" ? (p.text ?? "") : "")).join("");
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground"
            : "max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 text-foreground"
        }
      >
        {isUser ? (
          <div className="whitespace-pre-wrap text-[15px]">{text}</div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5">
            <ReactMarkdown>{text || "…"}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  tier,
  limit,
}: {
  onPick: (t: string) => void;
  tier: string;
  limit: number;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 pt-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Ask about your stack</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Personalized answers using your saved supplements, peptides, hormones and more.
          Educational — not medical advice.
        </p>
      </div>
      <div className="grid w-full gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm hover:border-primary/60 hover:bg-primary/5"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {tier === "free" ? <Lock className="h-3.5 w-3.5" /> : null}
        <span>
          {tier[0].toUpperCase() + tier.slice(1)} tier · {limit} messages / day
        </span>
      </div>
    </div>
  );
}
