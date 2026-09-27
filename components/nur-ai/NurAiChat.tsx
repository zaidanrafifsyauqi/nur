"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, RotateCcw, Sparkles, Square, User } from "lucide-react";
import type { AIMessage } from "@/lib/ai/types";

const SUGGESTED_PROMPTS = [
  "Apa doa sebelum bepergian?",
  "Jelaskan Al-Fatihah",
  "Berapa waktu Maghrib?",
  "Arah kiblat saya?",
  "Cari masjid terdekat",
  "Apa yang perlu disiapkan untuk perjalanan Muslim?",
] as const;

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nur-deep text-white dark:bg-nur-gold dark:text-nur-ink">
          <Bot className="h-4 w-4" aria-hidden />
        </span>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
          isUser
            ? "bg-nur-deep text-white dark:bg-nur-gold dark:text-nur-ink"
            : "border border-[var(--nur-border)] bg-[var(--nur-surface)] text-[var(--nur-text)]"
        }`}
      >
        {/* Preserve line breaks, wrap long strings, support Arabic */}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      {isUser && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--nur-surface-2)] text-[var(--nur-text-secondary)]">
          <User className="h-4 w-4" aria-hidden />
        </span>
      )}
    </div>
  );
}

export function NurAiChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const canSend = input.trim().length > 0 && !isLoading;

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;
      if (trimmed.length > 4000) {
        setError("Message is too long. Please keep it under 4000 characters.");
        return;
      }
      if (messages.length >= 20) {
        setError("Conversation is too long. Please start a new chat.");
        return;
      }

      const userMessage: AIMessage = { role: "user", content: trimmed };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
          signal: controller.signal,
        });
        const data = (await res.json()) as { message?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error || "NUR AI is temporarily unavailable. Please try again.");
        }
        if (!data.message) throw new Error("NUR AI is temporarily unavailable. Please try again.");
        setMessages((prev) => [...prev, { role: "assistant", content: data.message as string }]);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — keep history intact
          return;
        }
        const msg = err instanceof Error ? err.message : "NUR AI is temporarily unavailable. Please try again.";
        setError(msg);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
  };

  const handleSuggestion = (prompt: string) => {
    void sendMessage(prompt);
  };

  return (
    <div className="flex min-h-[60vh] flex-col">
      {/* Header is rendered by page; chat area below */}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nur-deep text-white dark:bg-nur-gold dark:text-nur-ink">
              <Sparkles className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Assalamu&apos;alaikum 👋</h2>
            <p className="max-w-md text-sm text-[var(--nur-text-secondary)]">
              Bagaimana NUR bisa membantu hari ini?
            </p>
          </div>
          <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSuggestion(prompt)}
                className="min-h-[44px] rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-[var(--nur-surface-2)]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 py-4" aria-live="polite" aria-atomic="false">
          {messages.map((m, i) => (
            <MessageBubble key={`${m.role}-${i}`} message={m} />
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nur-deep text-white dark:bg-nur-gold dark:text-nur-ink">
                <Bot className="h-4 w-4 animate-pulse" aria-hidden />
              </span>
              <div className="rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 py-3 text-sm text-[var(--nur-text-secondary)]">
                NUR AI is thinking...
              </div>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
            >
              {error}
            </div>
          )}
          <div ref={listRef} />
        </div>
      )}

      {/* Composer — sticky, safe-area, keyboard friendly */}
      <div className="sticky bottom-0 -mx-4 border-t border-[var(--nur-border)] bg-[var(--nur-background)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:mx-0 sm:px-0">
        {messages.length > 0 && (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              onClick={handleNewChat}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              New chat
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <label htmlFor="nur-ai-input" className="sr-only">
            Ask NUR AI
          </label>
          <textarea
            id="nur-ai-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) void sendMessage(input);
              }
            }}
            placeholder="Tanyakan sesuatu…"
            rows={1}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 py-3 text-sm leading-relaxed placeholder:text-[var(--nur-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nur-deep/20"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              aria-label="Stop generation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white dark:bg-red-500"
            >
              <Square className="h-4 w-4 fill-white" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nur-deep text-white transition-colors hover:bg-nur-dark disabled:opacity-40 dark:bg-nur-gold dark:text-nur-ink"
            >
              <ArrowUp className="h-5 w-5" aria-hidden />
            </button>
          )}
        </form>
        <p className="mt-1.5 text-center text-xs text-[var(--nur-text-secondary)]">
          NUR AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
