"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { MicButton } from "./MicButton";
import { useSpeechInput } from "@/hooks/useSpeechInput";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  isVoiceEnabled: boolean;
  isSpeaking: boolean;
  onVoiceToggle: () => void;
}

export function InputBar({
  onSend,
  disabled,
  isVoiceEnabled,
  isSpeaking,
  onVoiceToggle,
}: Props) {
  const [value, setValue] = useState("");
  const [interimText, setInterimText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFinal = useCallback(
    (transcript: string) => {
      setInterimText("");
      const text = transcript.trim();
      if (text && !disabled) onSend(text);
    },
    [disabled, onSend]
  );

  const { isListening, isSupported, networkError, start, stop } = useSpeechInput({
    onInterim: setInterimText,
    onFinal: handleFinal,
  });

  // Displayed content: interim speech text while listening, typed value otherwise
  const displayValue = isListening ? interimText : value;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [displayValue]);

  function handleSend() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white px-4 py-3">
      <div
        className={`flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-2.5 border transition-all ${
          isListening
            ? "border-red-300 ring-2 ring-red-100"
            : "border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={displayValue}
          onChange={(e) => {
            if (!isListening) setValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Ouvindo..." : "Digite sua resposta..."}
          readOnly={isListening}
          rows={1}
          className={`flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed max-h-40 ${
            isListening ? "text-red-600 placeholder-red-400" : "text-gray-900 placeholder-gray-400"
          }`}
        />
        <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
          <MicButton
            isListening={isListening}
            isSupported={isSupported}
            networkError={networkError}
            onStart={start}
            onStop={stop}
          />

          {/* Voice output toggle */}
          <button
            type="button"
            onClick={onVoiceToggle}
            title={isVoiceEnabled ? "Desativar voz do Theo" : "Ativar voz do Theo"}
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isVoiceEnabled
                ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            }`}
          >
            {isSpeaking ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {isVoiceEnabled ? (
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                ) : (
                  <line x1="23" y1="9" x2="17" y2="15" />
                )}
              </svg>
            )}
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || disabled || isListening}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-xs text-center mt-2">
        {networkError ? (
          <span className="text-amber-500">
            Microfone indisponível em localhost — funciona no deploy
          </span>
        ) : isListening ? (
          <span className="text-red-400">Fale agora — envio automático ao parar</span>
        ) : (
          <span className="text-gray-400">Enter para enviar · Shift+Enter para nova linha</span>
        )}
      </p>
    </div>
  );
}
