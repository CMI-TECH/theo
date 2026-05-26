"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "theo_voice_enabled";

function stripForTTS(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`{1,3}[^`\n]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/📅|📚|🔍|📌|⏱|✅|❌|→/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 500);
}

export function useVoiceOutput() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") setIsEnabled(true);
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    try {
      sourceRef.current?.stop();
    } catch {
      // ignore if already stopped
    }
    sourceRef.current = null;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!isEnabled || !text.trim() || isSpeakingRef.current) return;

      const clean = stripForTTS(text);
      if (!clean) return;

      isSpeakingRef.current = true;
      setIsSpeaking(true);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
        });

        if (!res.ok) {
          console.error("[tts] HTTP error:", res.status);
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          return;
        }

        const buffer = await res.arrayBuffer();

        // Resume or create AudioContext (browsers need user gesture)
        if (!ctxRef.current || ctxRef.current.state === "closed") {
          ctxRef.current = new AudioContext();
        }
        if (ctxRef.current.state === "suspended") {
          await ctxRef.current.resume();
        }

        const decoded = await ctxRef.current.decodeAudioData(buffer);
        const source = ctxRef.current.createBufferSource();
        source.buffer = decoded;
        source.connect(ctxRef.current.destination);
        sourceRef.current = source;

        source.onended = () => {
          sourceRef.current = null;
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        };

        source.start(0);
      } catch (err) {
        console.error("[tts] speak error:", err);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      }
    },
    [isEnabled]
  );

  return { isEnabled, isSpeaking, toggle, speak, stop };
}
