"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";

const CEFIS_LOGO =
  "https://fjasnwkpvcpzwapxxhvy.supabase.co/storage/v1/object/public/logo/LOGO%20CREFIS.png";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  isPending: boolean;
  studentId: string;
  studentName: string;
  isVoiceEnabled: boolean;
  isSpeaking: boolean;
  onSend: (text: string) => void;
  onVoiceToggle: () => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  isPending,
  studentId,
  studentName,
  isVoiceEnabled,
  isSpeaking,
  onSend,
  onVoiceToggle,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — never shrinks */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white border border-gray-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CEFIS_LOGO} alt="Theo" className="w-full h-full object-contain" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900">Theo</h1>
          {isPending ? (
            <p className="text-xs text-amber-500">Enviando em instantes...</p>
          ) : (
            <p className="text-xs text-gray-400">Seu tutor de IA · Online</p>
          )}
        </div>
        {studentName && (
          <div className="text-xs text-gray-400 flex-shrink-0">
            Olá, {studentName}
          </div>
        )}
        <Link
          href="/dashboard"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Messages — flex-1 + min-h-0 is the key combo for scroll in flex column */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 bg-white">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 overflow-hidden p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CEFIS_LOGO} alt="Theo" className="w-full h-full object-contain" />
              </div>
              <p className="text-sm text-gray-500">O Theo está pronto para começar</p>
              <p className="text-xs text-gray-400 mt-1">Aguardando conexão...</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            studentId={studentId}
            isStreaming={
              isStreaming && i === messages.length - 1 && msg.role === "assistant"
            }
          />
        ))}
      </div>

      {/* Input — flex-shrink-0 + sticky bottom-0 guarantees it never scrolls away */}
      <div className="flex-shrink-0 sticky bottom-0 bg-white z-10">
        <InputBar
          onSend={onSend}
          disabled={isStreaming}
          isVoiceEnabled={isVoiceEnabled}
          isSpeaking={isSpeaking}
          onVoiceToggle={onVoiceToggle}
        />
      </div>
    </div>
  );
}
