// Server-side Supabase client for Route Handlers and Server Components.
// This app does not use Supabase Auth, so cookie-based session management
// is unnecessary — and using cookies() from next/headers inside Route Handlers
// on Vercel causes "Dynamic server usage" errors. We use the anon key directly.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return createSupabaseClient(url, key);
}
