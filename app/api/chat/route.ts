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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1";

  console.log(`[chat] ENV check — THEO_ANTHROPIC_API_KEY=${process.env.THEO_ANTHROPIC_API_KEY ? "SET" : "UNDEFINED"}`);

  const { allowed } = checkRateLimit(ip, 20, 60_000);
  if (!allowed) {
    return Response.json(
      { error: "Muitas requisições. Aguarde um momento." },
      { status: 429 }
    );
  }

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

  // Build a search query from all user messages to find relevant CEFIS courses
  // Wrapped in try/catch — data/ dir may be absent in deploy (gitignored)
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
  } catch (err) {
    console.warn("[chat] Course search failed (data dir absent?), continuing without courses:", err);
    coursesContext = undefined;
  }
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const systemPrompt = buildSystemPrompt(coursesContext, today);

  // Initialize Supabase here — cookies() only works during request handling,
  // not inside ReadableStream callbacks which run after the response starts.
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("[chat] Failed to create Supabase client:", err);
  }

  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("[chat] Starting Anthropic stream for student:", student_id);

        // Use messages.stream() without await — it returns a MessageStream directly
        const anthropicStream = getAnthropic().messages.stream({
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

        console.log("[chat] Stream complete, response length:", fullResponse.length);

        const topics = extractTopics(fullResponse);
        const cleanResponse = stripTopics(fullResponse);

        if (supabase) {
          const { error: msgError } = await supabase.from("messages").insert([
            { student_id, role: "user", content: message.trim() },
            { student_id, role: "assistant", content: cleanResponse },
          ]);
          if (msgError) {
            console.error("[chat] Failed to save messages:", msgError.message);
          }

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
            if (topicsError) {
              console.error("[chat] Failed to upsert topics:", topicsError.message);
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", topics })}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[chat] Stream error:", message, err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", text: `Erro: ${message}` })}\n\n`
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
