"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, Topic } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export function useChat(studentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Refs avoid stale closures inside async callbacks and timers
  const messagesRef = useRef<ChatMessage[]>([]);
  const isStreamingRef = useRef(false);
  const pendingMsgsRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!studentId) {
      setHistoryLoaded(true);
      return;
    }

    const supabase = createClient();

    async function loadHistory() {
      try {
        const [{ data: msgs }, { data: topicsData }] = await Promise.all([
          supabase
            .from("messages")
            .select("role, content")
            .eq("student_id", studentId)
            .order("created_at", { ascending: true }),
          supabase
            .from("topics")
            .select("id, student_id, name, score, updated_at")
            .eq("student_id", studentId),
        ]);

        if (msgs && msgs.length > 0) {
          setMessages(msgs as ChatMessage[]);
        }
        if (topicsData && topicsData.length > 0) {
          setTopics(topicsData as Topic[]);
        }
      } catch (err) {
        console.error("[useChat] Failed to load history:", err);
      } finally {
        setHistoryLoaded(true);
      }
    }

    loadHistory();
  // Run once on mount — studentId is stable (comes from sessionStorage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // doFlushRef holds the current flush function to avoid stale closures in setTimeout
  const doFlushRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    doFlushRef.current = async function doFlush() {
      // If streaming is in progress, wait for it to finish
      if (isStreamingRef.current) {
        timerRef.current = setTimeout(() => doFlushRef.current(), 1500);
        return;
      }

      const pending = [...pendingMsgsRef.current];
      pendingMsgsRef.current = [];
      setIsPending(false);
      if (pending.length === 0) return;

      // messagesRef has all pending user messages added optimistically at the end
      const currentMsgs = messagesRef.current;

      // Slice off the pending user messages to get the pre-existing history
      const historyForApi = currentMsgs.slice(0, currentMsgs.length - pending.length);

      // Build full history: existing + all pending except the last one
      const fullHistory: ChatMessage[] = [
        ...historyForApi,
        ...pending.slice(0, -1).map((t) => ({ role: "user" as const, content: t })),
      ];
      const lastMessage = pending[pending.length - 1];

      // Add streaming placeholder
      const assistantMsg: ChatMessage = { role: "assistant", content: "" };
      setMessages([...currentMsgs, assistantMsg]);
      isStreamingRef.current = true;
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: lastMessage,
            history: fullHistory,
            student_id: studentId,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Resposta inválida do servidor");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            try {
              const event = JSON.parse(data);
              if (event.type === "delta") {
                fullText += event.text;
                const displayText = fullText
                  .replace(/<!--TOPICS:[\s\S]*?-->/g, "")
                  .trim();
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = {
                    role: "assistant",
                    content: displayText,
                  };
                  return next;
                });
              }
            } catch {
              // ignore malformed SSE lines
            }
          }
        }

        // Fetch canonical topics from Supabase after stream completes
        const supabase = createClient();
        const { data: freshTopics } = await supabase
          .from("topics")
          .select("id, student_id, name, score, updated_at")
          .eq("student_id", studentId);
        if (freshTopics && freshTopics.length > 0) {
          setTopics(freshTopics as Topic[]);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "Desculpe, ocorreu um erro. Por favor, tente novamente.",
          };
          return next;
        });
      } finally {
        isStreamingRef.current = false;
        setIsStreaming(false);
        abortRef.current = null;
      }
    };
  }, [studentId]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    pendingMsgsRef.current = [...pendingMsgsRef.current, text.trim()];
    setIsPending(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doFlushRef.current(), 10_000);
  }, []);

  return { messages, isStreaming, isPending, topics, historyLoaded, sendMessage };
}
