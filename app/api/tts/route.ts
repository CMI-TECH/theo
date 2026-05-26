import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1";

  const { allowed } = checkRateLimit(ip, 10, 60_000);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.text?.trim()) {
    return Response.json({ error: "Texto ausente" }, { status: 400 });
  }

  const text: string = (body.text as string).slice(0, 500);

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB";
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "ElevenLabs não configurado" },
      { status: 503 }
    );
  }

  const elevenRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!elevenRes.ok) {
    const errText = await elevenRes.text();
    console.error("[tts] ElevenLabs error:", elevenRes.status, errText);
    const hint = elevenRes.status === 401 ? "API key inválida"
               : elevenRes.status === 422 ? "Voice ID inválido"
               : elevenRes.status === 429 ? "Limite ElevenLabs atingido"
               : `Erro ${elevenRes.status}`;
    return Response.json({ error: hint, detail: errText }, { status: 502 });
  }

  const audioBuffer = await elevenRes.arrayBuffer();

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
