"use client";

import { useState } from "react";

interface Props {
  studentId: string;
}

export function AiSummaryButton({ studentId }: Props) {
  const [state, setState]     = useState<"idle" | "loading" | "done">("idle");
  const [summary, setSummary] = useState("");

  async function handleClick() {
    if (state === "loading") return;
    if (state === "done") {
      setState("idle");
      setSummary("");
      return;
    }

    setState("loading");
    try {
      const r = await fetch("/api/ai-summary", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ student_id: studentId }),
      });
      const d = await r.json();
      setSummary(d.summary ?? "Sem dados suficientes para análise.");
      setState("done");
    } catch {
      setSummary("Erro ao gerar análise. Tente novamente.");
      setState("done");
    }
  }

  return (
    <div className="border-t border-gray-50 pt-3">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
          state === "done"
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100"
        } disabled:opacity-60`}
      >
        {state === "loading" ? (
          <>
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analisando...
          </>
        ) : state === "done" ? (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 6 6 6 6 18" />
              <line x1="18" y1="18" x2="6" y2="6" />
            </svg>
            Fechar análise
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Análise IA
          </>
        )}
      </button>

      {state === "done" && summary && (
        <div className="mt-2.5 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
          {summary}
        </div>
      )}
    </div>
  );
}
