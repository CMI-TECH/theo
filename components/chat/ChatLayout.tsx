"use client";

import { useState, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { ChatPanel } from "./ChatPanel";
import { KnowledgeMap } from "@/components/knowledge/KnowledgeMap";

interface Props {
  studentId: string;
  studentName: string;
}

export function ChatLayout({ studentId, studentName }: Props) {
  const { messages, isStreaming, isPending, topics, historyLoaded, sendMessage } = useChat(studentId);
  const { isEnabled: isVoiceEnabled, isSpeaking, toggle, speak, stop: stopSpeaking } = useVoiceOutput();
  const [mobileTab, setMobileTab] = useState<"chat" | "map">("chat");

  // Stop audio if voice is toggled off mid-playback
  useEffect(() => {
    if (!isVoiceEnabled) stopSpeaking();
  }, [isVoiceEnabled, stopSpeaking]);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!historyLoaded) return;
    if (!initialized && messages.length === 0) {
      setInitialized(true);
      sendMessage(
        `Olá! Me chamo ${studentName} e quero começar a aprender com você.`
      );
    }
  }, [historyLoaded, initialized, messages.length, sendMessage, studentName]);

  const lastAssistantContent = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.content;

  useEffect(() => {
    if (lastAssistantContent && isVoiceEnabled && !isStreaming) {
      speak(lastAssistantContent);
    }
  // speak is stable (only depends on isEnabled); safe to omit from deps here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAssistantContent, isVoiceEnabled, isStreaming]);

  const panelProps = {
    messages,
    isStreaming,
    isPending,
    studentId,
    studentName,
    isVoiceEnabled,
    isSpeaking,
    onSend: sendMessage,
    onVoiceToggle: toggle,
  };

  return (
    // h-[100dvh] adjusts for mobile browser chrome (iOS Safari address bar)
    <div className="flex flex-col h-screen [height:100dvh]">
      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-gray-100 bg-white flex-shrink-0">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === "chat"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === "map"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
        >
          Mapa{" "}
          {topics.length > 0 && (
            <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
              {topics.length}
            </span>
          )}
        </button>
      </div>

      {/* Desktop: side-by-side. Mobile: tab view */}
      <div className="flex-1 min-h-0">
        {/* Desktop layout */}
        <div className="hidden md:grid md:grid-cols-[1fr_320px] h-full">
          <ChatPanel {...panelProps} />
          <KnowledgeMap topics={topics} />
        </div>

        {/* Mobile layout */}
        <div className="md:hidden h-full">
          {mobileTab === "chat" ? (
            <ChatPanel {...panelProps} />
          ) : (
            <KnowledgeMap topics={topics} />
          )}
        </div>
      </div>
    </div>
  );
}
