import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const student_id = body?.student_id as string | undefined;
  if (!student_id) {
    return Response.json({ error: "student_id required" }, { status: 400 });
  }

  const apiKey = process.env.THEO_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not set" }, { status: 503 });
  }

  const supabase = await createClient();

  const [topicsRes, messagesRes, studentRes] = await Promise.all([
    supabase.from("topics").select("name, score").eq("student_id", student_id).order("score", { ascending: false }),
    supabase.from("messages").select("role, content, created_at").eq("student_id", student_id).order("created_at", { ascending: false }).limit(40),
    supabase.from("students").select("name, created_at").eq("id", student_id).single(),
  ]);

  const topics   = topicsRes.data   ?? [];
  const messages = messagesRes.data ?? [];
  const student  = studentRes.data;

  if (topics.length === 0 && messages.length === 0) {
    return Response.json({ summary: "Aluno ainda não iniciou interações suficientes para gerar análise." });
  }

  const topicsList = topics
    .map((t) => `${t.name}: ${t.score}/100`)
    .join(", ") || "nenhum tópico registrado ainda";

  const avgScore =
    topics.length > 0
      ? Math.round(topics.reduce((s, t) => s + t.score, 0) / topics.length)
      : null;

  const recentUserMsgs = messages
    .filter((m) => m.role === "user")
    .slice(0, 6)
    .map((m) => `• "${m.content.slice(0, 120)}"`)
    .join("\n");

  const daysActive = new Set(
    messages.map((m) => {
      const d = new Date(m.created_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  ).size;

  const prompt = `Você é um analista pedagógico. Analise o perfil de aprendizado deste aluno e produza um resumo claro, direto e útil em português brasileiro.

DADOS DO ALUNO:
- Nome: ${student?.name ?? "Aluno"}
- Tópicos estudados: ${topicsList}
- Domínio médio: ${avgScore !== null ? `${avgScore}/100` : "sem dados"}
- Total de mensagens: ${messages.length}
- Dias de estudo: ${daysActive}
- Falas recentes do aluno:
${recentUserMsgs || "• sem mensagens ainda"}

Produza exatamente 3 seções (use os emojis abaixo como títulos):

🎯 **Situação atual**
(onde o aluno está no aprendizado — 1-2 frases concretas)

💪 **Pontos fortes**
(o que já demonstra domínio ou engajamento — 1-2 frases)

📌 **Próximo foco recomendado**
(o que deve priorizar agora para avançar — 1-2 frases acionáveis)

Seja direto, concreto e encorajador. Sem introdução, sem despedida. Máximo 100 palavras.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model     : "claude-sonnet-4-6",
      max_tokens: 350,
      messages  : [{ role: "user", content: prompt }],
    });

    const summary =
      msg.content[0]?.type === "text" ? msg.content[0].text : "Sem análise disponível.";

    return Response.json({ summary });
  } catch (err) {
    console.error("[ai-summary] error:", err);
    return Response.json({ error: "Erro ao gerar análise" }, { status: 500 });
  }
}
