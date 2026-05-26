"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { transcript: string };
}

interface SpeechRecognitionEvent extends Event {
  readonly results: {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface Options {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
}

export function useSpeechInput({ onInterim, onFinal }: Options) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    setIsSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  // Keep callbacks current without recreating recognition
  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const start = useCallback(() => {
    if (!isSupported || isListening) return;

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      if (interim) onInterimRef.current(interim);
      if (final) onFinalRef.current(final);
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "network") {
        // Web Speech API requires HTTPS — fails on http://localhost
        setNetworkError(true);
        setIsListening(false);
        onInterimRef.current("");
        return;
      }
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("[speech] error:", e.error);
      }
      setIsListening(false);
      onInterimRef.current("");
    };

    recognition.onend = () => {
      setIsListening(false);
      onInterimRef.current("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isSupported, isListening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    onInterimRef.current("");
  }, []);

  return { isListening, isSupported, networkError, start, stop };
}
