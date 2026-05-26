// Diagnostic endpoint — visit /api/debug in browser to check all env vars
// and test the Anthropic connection. REMOVE before going to production.
export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = {
    THEO_ANTHROPIC_API_KEY:          process.env.THEO_ANTHROPIC_API_KEY          ? "SET" : "❌ MISSING",
    NEXT_PUBLIC_SUPABASE_URL:        process.env.NEXT_PUBLIC_SUPABASE_URL        ? "SET" : "❌ MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY   ? "SET" : "❌ MISSING",
    SUPABASE_SECRET_KEY:             process.env.SUPABASE_SECRET_KEY             ? "SET" : "❌ MISSING",
    ELEVENLABS_API_KEY:              process.env.ELEVENLABS_API_KEY              ? "SET" : "❌ MISSING",
    ELEVENLABS_VOICE_ID:             process.env.ELEVENLABS_VOICE_ID             ? "SET" : "❌ MISSING",
    NODE_ENV:                        process.env.NODE_ENV,
  };

  // Try to init Anthropic SDK
  let anthropicStatus = "untested";
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const key = process.env.THEO_ANTHROPIC_API_KEY;
    if (!key) {
      anthropicStatus = "❌ key missing";
    } else {
      new Anthropic({ apiKey: key });
      anthropicStatus = "✅ client initialized OK";
    }
  } catch (err) {
    anthropicStatus = `❌ init error: ${err instanceof Error ? err.message : String(err)}`;
  }

  // Try to init Supabase client
  let supabaseStatus = "untested";
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      supabaseStatus = "❌ missing URL or anon key";
    } else {
      createClient(url, key);
      supabaseStatus = "✅ client initialized OK";
    }
  } catch (err) {
    supabaseStatus = `❌ init error: ${err instanceof Error ? err.message : String(err)}`;
  }

  return Response.json({
    env: envCheck,
    anthropic: anthropicStatus,
    supabase: supabaseStatus,
    timestamp: new Date().toISOString(),
  });
}
