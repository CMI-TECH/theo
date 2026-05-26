import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildSystemPrompt } from "@/lib/theo-system-prompt";
import { searchCourses, formatCoursesForPrompt } from "@/lib/cefis-courses";
import type { ChatMessage } from "@/lib/types";

// Lazy getter — process.env is only resolved at request time in Next.js 16 Turbopack,
// not at module-initialization time. Initializing here would leave apiKey undefined.
function getAnthropic() {
  const apiKey = process.env.THEO_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("THEO_ANTHROPIC_API_KEY is not set in environment");
  return new Anthropic({ apiKey });
}

function extractTopics(text: string): Record<string, number> {
  const match = text.match(/<!--TOPICS:([\s\S]*?)-->/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

function stripTopics(text: string): string {
  return text.replace(/<!--TOPICS:[\s\S]*?-->/g, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    return await handleChat(request);
  } catch (err) {
    // Top-level catch — any unhandled sync/async throw ends up here instead of a blank 500
    const name    = err instanceof Error ? err.name    : "UnknownError";
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? err.stack   : undefined;
    console.error("[chat] UNHANDLED TOP-LEVEL ERROR", { name, message, stack });
    return Response.json({ error: message, name, stack }, { status: 500 });
  }
}

async function handleChat(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1";

  // ── ENV diagnostics ──────────────────────────────────────────────────────
  console.log("[chat] ENV", {
    THEO_ANTHROPIC_API_KEY : process.env.THEO_ANTHROPIC_API_KEY  ? "SET" : "MISSING",
    SUPABASE_URL           : process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
    SUPABASE_ANON_KEY      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
    NODE_ENV               : process.env.NODE_ENV,
  });

  const { allowed } = checkRateLimit(ip, 20, 60_000);
  if (!allowed) {
    return Response.json(
      { error: "Muitas requisições. Aguarde um momento." },
      { status: 429 }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  console.log("[chat] step: parsing body");
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, history, student_id } = body as {
    message?: string;
    history?: ChatMessage[];
    student_id?: string;
  };

  if (!message?.trim()) {
    return Response.json({ error: "Mensagem vazia" }, { status: 400 });
  }
  if (!student_id) {
    return Response.json({ error: "student_id ausente" }, { status: 400 });
  }

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message.trim() },
  ];

  // ── Course search (optional — data/ may be absent on deploy) ─────────────
  console.log("[chat] step: course search");
  let coursesContext: string | undefined;
  try {
    const allUserText = [
      ...(history ?? []).filter((m) => m.role === "user").map((m) => m.content),
      message.trim(),
    ].join(" ");
    const relevantCourses = searchCourses(allUserText, 8);
    coursesContext =
      relevantCourses.length > 0
        ? formatCoursesForPrompt(relevantCourses, true)
        : undefined;
    console.log("[chat] courses found:", relevantCourses.length);
  } catch (err) {
    console.warn("[chat] Course search failed, continuing without courses:", err);
    coursesContext = undefined;
  }

  // ── System prompt ────────────────────────────────────────────────────────
  console.log("[chat] step: building system prompt");
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const systemPrompt = buildSystemPrompt(coursesContext, today);
  console.log("[chat] system prompt length:", systemPrompt.length);

  // ── Supabase client (must be created before ReadableStream) ──────────────
  console.log("[chat] step: creating supabase client");
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    console.log("[chat] supabase client: OK");
  } catch (err) {
    console.error("[chat] Failed to create Supabase client:", err);
  }

  // ── Validate Anthropic key before opening stream ─────────────────────────
  console.log("[chat] step: validating anthropic key");
  const anthropicClient = getAnthropic(); // throws here if key missing — caught by top-level
  console.log("[chat] anthropic client: OK");

  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("[chat] step: opening anthropic stream, student:", student_id);

        const anthropicStream = anthropicClient.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: systemPrompt,
          messages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullResponse += event.delta.text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "delta", text: event.delta.text })}\n\n`
              )
            );
          }
        }

        console.log("[chat] stream complete, chars:", fullResponse.length);

        const topics = extractTopics(fullResponse);
        const cleanResponse = stripTopics(fullResponse);

        if (supabase) {
          const { error: msgError } = await supabase.from("messages").insert([
            { student_id, role: "user", content: message.trim() },
            { student_id, role: "assistant", content: cleanResponse },
          ]);
          if (msgError) console.error("[chat] save messages error:", msgError.message);

          if (Object.keys(topics).length > 0) {
            const upserts = Object.entries(topics).map(([name, score]) => ({
              student_id,
              name,
              score: Math.max(0, Math.min(100, Math.round(Number(score)))),
              updated_at: new Date().toISOString(),
            }));
            const { error: topicsError } = await supabase
              .from("topics")
              .upsert(upserts, { onConflict: "student_id,name" });
            if (topicsError) console.error("[chat] upsert topics error:", topicsError.message);
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", topics })}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        const name    = err instanceof Error ? err.name    : "UnknownError";
        const msg     = err instanceof Error ? err.message : String(err);
        const stack   = err instanceof Error ? err.stack   : undefined;
        console.error("[chat] stream error:", { name, msg, stack });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", text: `Erro: ${msg}` })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
