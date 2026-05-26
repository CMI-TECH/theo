/*
  Supabase schema — run these SQL statements in your Supabase SQL editor:

  CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    whatsapp TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, name)
  );

  CREATE TABLE study_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    duration_min INTEGER NOT NULL,
    module TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT false
  );
*/

export interface Student {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  created_at: string;
}

export interface Message {
  id: string;
  student_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Topic {
  id: string;
  student_id: string;
  name: string;
  score: number;
  updated_at: string;
}

export interface StudyPlanItem {
  id: string;
  student_id: string;
  day: number;
  duration_min: number;
  module: string;
  done: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
