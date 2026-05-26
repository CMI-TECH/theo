import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// lesson_views table schema:
// CREATE TABLE lesson_views (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   student_id UUID REFERENCES students(id),
//   lesson_url TEXT NOT NULL,
//   lesson_title TEXT DEFAULT '',
//   course_id INTEGER,
//   lesson_id INTEGER,
//   viewed_at TIMESTAMPTZ DEFAULT NOW()
// );

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.student_id || !body?.lesson_url) {
    return Response.json({ error: "student_id and lesson_url are required" }, { status: 400 });
  }

  const { student_id, lesson_url, lesson_title, course_id, lesson_id } = body as {
    student_id: string;
    lesson_url: string;
    lesson_title?: string;
    course_id?: number;
    lesson_id?: number;
  };

  const supabase = await createClient();
  const { error } = await supabase.from("lesson_views").insert({
    student_id,
    lesson_url,
    lesson_title: lesson_title ?? "",
    course_id: course_id ?? null,
    lesson_id: lesson_id ?? null,
  });

  if (error) {
    console.error("[track-lesson]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
