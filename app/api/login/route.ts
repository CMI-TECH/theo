import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body as { email?: string; password?: string };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email?.trim() || !emailRegex.test(email.trim())) {
    return Response.json({ error: "E-mail inválido" }, { status: 400 });
  }

  if (!password) {
    return Response.json({ error: "Senha obrigatória" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select("id, name, password_hash")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (error || !data) {
    console.error("[login] Supabase lookup error:", error);
    return Response.json(
      { error: "E-mail não encontrado. Crie uma conta primeiro." },
      { status: 404 }
    );
  }

  if (!data.password_hash) {
    console.error("[login] No password_hash for student:", data.id);
    return Response.json(
      { error: "Conta sem senha cadastrada. Entre em contato com o suporte." },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) {
    return Response.json({ error: "Senha incorreta" }, { status: 401 });
  }

  console.log("[login] Student authenticated:", data.id);
  return Response.json({ student_id: data.id, name: data.name });
}
