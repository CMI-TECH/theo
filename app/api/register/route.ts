import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, whatsapp, password } = body as {
    name?: string;
    email?: string;
    whatsapp?: string;
    password?: string;
  };

  if (!name?.trim() || name.trim().length < 2) {
    return Response.json({ error: "Nome inválido" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email?.trim() || !emailRegex.test(email.trim())) {
    return Response.json({ error: "E-mail inválido" }, { status: 400 });
  }

  const phoneRegex = /^[\d\s\-\+\(\)]{8,20}$/;
  if (!whatsapp?.trim() || !phoneRegex.test(whatsapp.trim())) {
    return Response.json({ error: "WhatsApp inválido" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return Response.json(
      { error: "Senha deve ter no mínimo 6 caracteres" },
      { status: 400 }
    );
  }

  const password_hash = await bcrypt.hash(password, 10);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      password_hash,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[register] Supabase insert error:", JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    }, null, 2));

    if (error.code === "23505") {
      return Response.json(
        { error: "Este e-mail já está cadastrado" },
        { status: 409 }
      );
    }

    return Response.json(
      { error: `Erro ao criar conta: ${error.message}` },
      { status: 500 }
    );
  }

  console.log("[register] Student created:", data.id);
  return Response.json({ student_id: data.id }, { status: 201 });
}
