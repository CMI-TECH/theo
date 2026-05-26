"use client";

import { useState, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

const CEFIS_LOGO =
  "https://fjasnwkpvcpzwapxxhvy.supabase.co/storage/v1/object/public/logo/logo%2001.png";

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
  studentId: string;
}

// ─── TrackedLink ──────────────────────────────────────────────────────────────

function TrackedLink({
  href,
  text,
  studentId,
}: {
  href: string;
  text: string;
  studentId: string;
}) {
  const isCefis = href.includes("cefis.com.br");

  function handleClick() {
    if (isCefis && studentId) {
      fetch("/api/track-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          lesson_url: href,
          lesson_title: text !== href ? text : "",
        }),
      }).catch(() => {});
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="underline text-blue-600 hover:text-blue-800 break-all"
    >
      {text}
    </a>
  );
}

// ─── VideoPlayer — lazy: shows card first, player only after click ────────────

function VideoPlayer({
  url,
  label,
  studentId,
}: {
  url: string;
  label: string;
  studentId: string;
}) {
  const [open, setOpen] = useState(false);
  const trackedRef = useRef(false);

  const displayLabel = label || "Aula CEFIS";

  if (!open) {
    return (
      <div className="my-3 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">{displayLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">Aula em vídeo · CEFIS</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          Assistir
        </button>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
        <span className="text-xs">🎓</span>
        <span className="text-xs text-gray-600 truncate">{displayLabel}</span>
      </div>
      <video
        controls
        autoPlay
        preload="auto"
        className="w-full max-h-56"
        onPlay={() => {
          if (!trackedRef.current && studentId) {
            trackedRef.current = true;
            fetch("/api/track-lesson", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                student_id: studentId,
                lesson_url: url,
                lesson_title: displayLabel,
              }),
            }).catch(() => {});
          }
        }}
      >
        <source src={url} type="video/mp4" />
      </video>
    </div>
  );
}

// ─── LessonCard — rich card with video embed + "Já assisti" button ───────────

interface LessonData {
  url?: string;
  title: string;
  course: string;
  duration?: number;
  position?: number;
}

function LessonCard({
  data,
  studentId,
}: {
  data: LessonData;
  studentId: string;
}) {
  const [open, setOpen]           = useState(false);
  const [watched, setWatched]     = useState(false);
  const [videoError, setVideoError] = useState(false);
  const trackedRef                = useRef(false);

  const durationMin = data.duration ? Math.round(data.duration / 60) : null;

  function handleWatched() {
    if (watched) return;
    setWatched(true);
    document.dispatchEvent(
      new CustomEvent("theo:lesson-watched", {
        detail: { title: data.title, course: data.course },
        bubbles: true,
      })
    );
  }

  return (
    <div className="my-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/30 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-blue-900 leading-tight">{data.title}</p>
          <p className="text-[11px] text-blue-600/80 mt-0.5 truncate">
            🎓 {data.course}
            {durationMin ? <span className="text-blue-400 ml-1">· {durationMin} min</span> : null}
          </p>
        </div>
      </div>

      {/* Video player */}
      {open && data.url && !videoError && (
        <video
          controls
          autoPlay
          preload="metadata"
          className="w-full max-h-52 bg-black border-t border-blue-100"
          onPlay={() => {
            if (!trackedRef.current && studentId) {
              trackedRef.current = true;
              fetch("/api/track-lesson", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  student_id: studentId,
                  lesson_url: data.url,
                  lesson_title: data.title,
                }),
              }).catch(() => {});
            }
          }}
          onError={() => setVideoError(true)}
        >
          <source src={data.url} type="video/mp4" />
          Seu navegador não suporta vídeo HTML5.
        </video>
      )}
      {open && data.url && videoError && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 text-center">
          <p className="text-xs text-amber-700 mb-2">Não foi possível carregar o vídeo inline.</p>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-blue-600 underline hover:text-blue-800"
          >
            Abrir aula na CEFIS →
          </a>
        </div>
      )}
      {open && !data.url && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500">
          Acesse essa aula diretamente no site da CEFIS.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 px-4 py-2.5 border-t border-blue-100/60">
        {data.url && (
          <button
            type="button"
            onClick={() => { setOpen((v) => !v); setVideoError(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              {open
                ? <rect x="6" y="6" width="12" height="12" rx="1" />
                : <polygon points="5 3 19 12 5 21 5 3" />}
            </svg>
            {open ? "Minimizar" : "Assistir aula"}
          </button>
        )}
        <button
          type="button"
          onClick={handleWatched}
          disabled={watched}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
            watched
              ? "bg-green-100 text-green-700 border border-green-200 cursor-default"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          }`}
        >
          {watched ? "✓ Assisti" : "✓ Já assisti"}
        </button>
      </div>
    </div>
  );
}

// ─── PlayButton ───────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/📅|📚|🔍|📌|⏱|▶|🎓/g, "")
    .trim();
}

type PlayState = "idle" | "loading" | "playing" | "error";

function PlayButton({ content }: { content: string }) {
  const [state, setState] = useState<PlayState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }

  function stopPlayback() {
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
    setState("idle");
  }

  async function handleClick() {
    if (state === "playing" || state === "loading") {
      stopPlayback();
      return;
    }

    const cleanText = stripMarkdown(content).slice(0, 500);
    if (!cleanText) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!res.ok) {
        let hint = `Erro ${res.status}`;
        if (res.status === 503) hint = "TTS não configurado";
        else if (res.status === 429) hint = "Limite atingido";
        else if (res.status === 502) hint = "Serviço indisponível";
        try {
          const body = await res.json();
          if (body?.error) hint = body.error;
        } catch { /* ignore */ }
        console.error("[PlayButton] TTS error:", res.status, hint);
        setErrorMsg(hint);
        setState("error");
        setTimeout(() => setState("idle"), 3000);
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("audio")) {
        console.error("[PlayButton] Unexpected content-type:", contentType);
        setErrorMsg("Resposta inválida");
        setState("error");
        setTimeout(() => setState("idle"), 3000);
        return;
      }

      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0) {
        setErrorMsg("Áudio vazio");
        setState("error");
        setTimeout(() => setState("idle"), 3000);
        return;
      }

      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();

      const decoded = await ctx.decodeAudioData(buf.slice(0));

      try { sourceRef.current?.stop(); } catch { /* ignore */ }

      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(ctx.destination);
      sourceRef.current = src;
      src.onended = () => {
        sourceRef.current = null;
        setState("idle");
      };
      src.start(0);
      setState("playing");
    } catch (err) {
      console.error("[PlayButton] error:", err);
      setErrorMsg("Erro de áudio");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  if (state === "error") {
    return (
      <span className="text-[10px] text-red-400 px-1" title={errorMsg}>
        {errorMsg}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        state === "playing" ? "Parar áudio" :
        state === "loading" ? "Carregando..." :
        "Ouvir mensagem"
      }
      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
        state === "playing"
          ? "bg-blue-200 text-blue-700 hover:bg-blue-300"
          : state === "loading"
          ? "bg-gray-100 text-gray-400 cursor-wait"
          : "bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700"
      }`}
    >
      {state === "loading" ? (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ) : state === "playing" ? (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )}
    </button>
  );
}

// ─── Inline parser ────────────────────────────────────────────────────────────

type InlineNode = React.ReactNode;

function parseInline(
  text: string,
  studentId: string,
  baseKey: string
): InlineNode[] {
  const parts: InlineNode[] = [];
  let rest = text;
  let idx = 0;

  type Pattern = {
    re: RegExp;
    render: (m: RegExpMatchArray, k: string) => InlineNode;
  };

  const patterns: Pattern[] = [
    {
      re: /\*\*(.+?)\*\*/,
      render: (m, k) => <strong key={k}>{m[1]}</strong>,
    },
    {
      re: /\*(.+?)\*/,
      render: (m, k) => <em key={k}>{m[1]}</em>,
    },
    {
      re: /`([^`]+)`/,
      render: (m, k) => (
        <code key={k} className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">
          {m[1]}
        </code>
      ),
    },
    {
      re: /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/,
      render: (m, k) => (
        <TrackedLink key={k} href={m[2]} text={m[1]} studentId={studentId} />
      ),
    },
    {
      re: /https?:\/\/\S+/,
      render: (m, k) => (
        <TrackedLink key={k} href={m[0]} text={m[0]} studentId={studentId} />
      ),
    },
  ];

  while (rest.length > 0) {
    let earliest: {
      index: number;
      match: RegExpMatchArray;
      pattern: Pattern;
    } | null = null;

    for (const p of patterns) {
      const m = p.re.exec(rest);
      if (m && m.index !== undefined) {
        if (!earliest || m.index < earliest.index) {
          earliest = { index: m.index, match: m, pattern: p };
        }
      }
    }

    if (earliest) {
      if (earliest.index > 0) {
        parts.push(rest.slice(0, earliest.index));
      }
      parts.push(
        earliest.pattern.render(earliest.match, `${baseKey}-${idx++}`)
      );
      rest = rest.slice(earliest.index + earliest.match[0].length);
    } else {
      parts.push(rest);
      break;
    }
  }

  return parts;
}

// ─── Block renderer ───────────────────────────────────────────────────────────

const CEFIS_VIDEO_RE = /https?:\/\/\S*cefis\S*\.mp4(?:\?\S*)?/;
const AULA_RE        = /\[AULA:(\{.*\})\]/;

function renderBlocks(content: string, studentId: string): React.ReactNode[] {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let olBuffer: { num: string; text: string }[] = [];
  let ulBuffer: string[] = [];

  function flushOl() {
    if (olBuffer.length === 0) return;
    const items = [...olBuffer];
    olBuffer = [];
    blocks.push(
      <ol key={`ol-${blocks.length}`} className="list-none space-y-1 my-1">
        {items.map(({ num, text }, j) => (
          <li key={j} className="flex gap-2">
            <span className="text-gray-400 text-sm flex-shrink-0 mt-px">{num}.</span>
            <span>{parseInline(text, studentId, `ol-${blocks.length}-${j}`)}</span>
          </li>
        ))}
      </ol>
    );
  }

  function flushUl() {
    if (ulBuffer.length === 0) return;
    const items = [...ulBuffer];
    ulBuffer = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-none space-y-1 my-1">
        {items.map((text, j) => (
          <li key={j} className="flex gap-2">
            <span className="text-blue-400 flex-shrink-0 mt-px">•</span>
            <span>{parseInline(text, studentId, `ul-${blocks.length}-${j}`)}</span>
          </li>
        ))}
      </ul>
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect [AULA:{...}] blocks — render rich LessonCard
    const aulaMatch = AULA_RE.exec(line);
    if (aulaMatch) {
      flushOl();
      flushUl();
      try {
        const data = JSON.parse(aulaMatch[1]) as LessonData;
        if (data.title) {
          blocks.push(<LessonCard key={i} data={data} studentId={studentId} />);
          continue;
        }
      } catch {
        // malformed JSON — fall through to regular rendering
      }
    }

    // Detect CEFIS video URL — render inline video player
    const videoMatch = CEFIS_VIDEO_RE.exec(line);
    if (videoMatch) {
      flushOl();
      flushUl();
      const videoUrl = videoMatch[0];
      const label = line
        .replace(videoUrl, "")
        .replace(/▶|Assista aqui:|:\s*$/g, "")
        .replace(/\*\*/g, "")
        .replace(/\[([^\]]*)\]\(/g, "$1")
        .replace(/[)\]]/g, "")
        .trim();
      blocks.push(
        <VideoPlayer key={i} url={videoUrl} label={label} studentId={studentId} />
      );
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      flushUl();
      olBuffer.push({ num: olMatch[1], text: olMatch[2] });
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      flushOl();
      ulBuffer.push(ulMatch[1]);
      continue;
    }

    flushOl();
    flushUl();

    if (line === "") {
      blocks.push(<div key={i} className="h-1.5" />);
      continue;
    }

    const hMatch = line.match(/^#{1,3}\s+(.*)/);
    if (hMatch) {
      blocks.push(
        <p key={i} className="font-bold text-sm mt-1.5">
          {parseInline(hMatch[1], studentId, `h-${i}`)}
        </p>
      );
      continue;
    }

    blocks.push(
      <p key={i} className="leading-relaxed">
        {parseInline(line, studentId, `p-${i}`)}
      </p>
    );
  }

  flushOl();
  flushUl();

  return blocks;
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

export function MessageBubble({ message, isStreaming, studentId }: Props) {
  const isUser = message.role === "user";
  const isDiagnostic =
    !isUser && message.content.includes("Diagnóstico do seu perfil");

  const contentBlocks = renderBlocks(message.content, studentId);

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[78%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
          {contentBlocks}
        </div>
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0 ml-2.5 mt-0.5">
          V
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      {/* CEFIS logo avatar — dark bg so white logo is visible */}
      <div className="w-7 h-7 rounded-full overflow-hidden bg-white border border-gray-200 flex-shrink-0 mr-2.5 mt-0.5 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CEFIS_LOGO}
          alt="Theo"
          className="w-full h-full object-contain p-0.5"
        />
      </div>

      <div
        className={`max-w-[82%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-900 ${
          isDiagnostic
            ? "bg-blue-50 border border-blue-100"
            : "bg-gray-100"
        }`}
      >
        {contentBlocks}

        {isStreaming && (
          <span className="inline-flex gap-0.5 ml-1 align-middle mt-1">
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        )}

        {!isStreaming && message.content && (
          <div className="flex justify-end mt-2 -mb-0.5">
            <PlayButton content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
