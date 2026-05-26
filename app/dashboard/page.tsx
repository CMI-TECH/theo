import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Student, Topic, Message } from "@/lib/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70)
    return { dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-100" };
  if (score >= 40)
    return { dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-700 border-yellow-100" };
  return { dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-100" };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateStreak(daySet: Set<string>): number {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (daySet.has(key)) streak++;
    else break;
  }
  return streak;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

interface LessonView {
  student_id: string;
}

type Msg = Pick<Message, "student_id" | "role" | "content" | "created_at">;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: filterStudentId } = await searchParams;
  const isStudentView = !!filterStudentId;

  const supabase = await createClient();

  const studentsQuery = supabase
    .from("students")
    .select("id, name, email, whatsapp, created_at")
    .order("created_at", { ascending: false });
  if (filterStudentId) studentsQuery.eq("id", filterStudentId);

  const topicsQuery = supabase
    .from("topics")
    .select("id, student_id, name, score, updated_at");
  if (filterStudentId) topicsQuery.eq("student_id", filterStudentId);

  const messagesQuery = supabase
    .from("messages")
    .select("student_id, role, content, created_at")
    .order("created_at", { ascending: false })
    .limit(filterStudentId ? 500 : 3000);
  if (filterStudentId) messagesQuery.eq("student_id", filterStudentId);

  const [studentsRes, topicsRes, messagesRes] = await Promise.all([
    studentsQuery,
    topicsQuery,
    messagesQuery,
  ]);

  let lessonViews: LessonView[] = [];
  try {
    const { data } = await supabase.from("lesson_views").select("student_id");
    lessonViews = (data ?? []) as LessonView[];
  } catch {
    // table not yet created
  }

  const students: Student[] = (studentsRes.data ?? []) as Student[];
  const topics: Topic[] = (topicsRes.data ?? []) as Topic[];
  const messages = (messagesRes.data ?? []) as Msg[];

  // ── Aggregate by student ─────────────────────────────────────────────────

  // Topics grouped by student
  const topicsByStudent = new Map<string, Topic[]>();
  for (const t of topics) {
    const arr = topicsByStudent.get(t.student_id) ?? [];
    arr.push(t);
    topicsByStudent.set(t.student_id, arr);
  }

  // Message count per student
  const msgCountByStudent = new Map<string, number>();
  // Last message per student
  const lastMsgByStudent = new Map<string, Msg>();
  // Active days per student (for streak)
  const daysByStudent = new Map<string, Set<string>>();
  // First objective message per student (overwrite → keep oldest)
  const objectiveByStudent = new Map<string, string>();
  // Study plan detection
  const hasPlanByStudent = new Map<string, boolean>();

  for (const m of messages) {
    // Count
    msgCountByStudent.set(m.student_id, (msgCountByStudent.get(m.student_id) ?? 0) + 1);

    // Last message (first seen in desc list = most recent)
    if (!lastMsgByStudent.has(m.student_id)) {
      lastMsgByStudent.set(m.student_id, m);
    }

    // Active days
    if (!daysByStudent.has(m.student_id)) daysByStudent.set(m.student_id, new Set());
    const d = new Date(m.created_at);
    daysByStudent.get(m.student_id)!.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);

    // Objective: user messages longer than 30 chars (overwrite → gets oldest in DESC loop)
    if (m.role === "user" && m.content.length > 30) {
      objectiveByStudent.set(m.student_id, m.content);
    }

    // Study plan detection
    if (m.role === "assistant" && m.content.includes("Seu plano de estudos")) {
      hasPlanByStudent.set(m.student_id, true);
    }
  }

  // Lesson views per student
  const lessonsByStudent = new Map<string, number>();
  for (const lv of lessonViews) {
    lessonsByStudent.set(lv.student_id, (lessonsByStudent.get(lv.student_id) ?? 0) + 1);
  }

  const totalStudents = students.length;
  const totalTopics = topics.length;
  const totalMessages = messages.length;
  const totalLessons = lessonViews.length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
              {isStudentView ? "Meu Progresso" : "Dashboard de Alunos"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {isStudentView
                ? "Seu histórico de aprendizado com o Theo"
                : "Visão geral do progresso"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Voltar ao chat
            </Link>
          </div>
          {!isStudentView && <div className="flex items-center gap-5">
            {[
              { value: totalStudents, label: "Alunos" },
              { value: totalTopics, label: "Tópicos" },
              { value: totalMessages, label: "Mensagens" },
              { value: totalLessons, label: "Aulas assistidas" },
            ].map(({ value, label }, i, arr) => (
              <div key={label} className="flex items-center gap-5">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="w-px h-7 bg-gray-100" />
                )}
              </div>
            ))}
          </div>}
        </div>
      </div>

      {/* ── Student grid ──────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {students.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Nenhum aluno cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {students.map((student) => {
              const studentTopics = (topicsByStudent.get(student.id) ?? []).sort(
                (a, b) => b.score - a.score
              );
              const lastMsg = lastMsgByStudent.get(student.id);
              const msgCount = msgCountByStudent.get(student.id) ?? 0;
              const lessonCount = lessonsByStudent.get(student.id) ?? 0;
              const daySet = daysByStudent.get(student.id) ?? new Set<string>();
              const streak = calculateStreak(daySet);
              const objective = objectiveByStudent.get(student.id);
              const hasPlan = hasPlanByStudent.get(student.id) ?? false;

              const avgScore =
                studentTopics.length > 0
                  ? Math.round(
                      studentTopics.reduce((s, t) => s + t.score, 0) /
                        studentTopics.length
                    )
                  : null;

              const scoreBarColor =
                avgScore === null
                  ? "bg-gray-200"
                  : avgScore >= 70
                  ? "bg-green-500"
                  : avgScore >= 40
                  ? "bg-yellow-500"
                  : "bg-red-400";

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-200 overflow-hidden"
                >
                  {/* ── Identity header ─────────────────────────── */}
                  <div className="px-5 pt-5 pb-4 flex items-start gap-3 border-b border-gray-50">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {initials(student.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{student.email}</p>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Desde {formatDate(student.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasPlan && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                          Plano gerado
                        </span>
                      )}
                      {lastMsg && (
                        <span className="text-xs text-gray-300">
                          {timeAgo(lastMsg.created_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-4 flex flex-col gap-4">
                    {/* ── Objective ───────────────────────────────── */}
                    {objective && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-1">Objetivo</p>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                          {objective}
                        </p>
                      </div>
                    )}

                    {/* ── Stats row ───────────────────────────────── */}
                    <div className="flex gap-3">
                      {[
                        { icon: "💬", value: msgCount, label: "msgs" },
                        { icon: "🎓", value: lessonCount, label: "aulas" },
                        { icon: "🔥", value: streak, label: streak === 1 ? "dia" : "dias" },
                      ].map(({ icon, value, label }) => (
                        <div
                          key={label}
                          className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-center"
                        >
                          <p className="text-base font-bold text-gray-800 tabular-nums">
                            {value}
                          </p>
                          <p className="text-xs text-gray-400">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* ── Knowledge progress ──────────────────────── */}
                    {avgScore !== null && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-gray-400">
                            Domínio médio
                          </p>
                          <p className="text-xs font-semibold text-gray-700">
                            {avgScore}/100
                          </p>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${scoreBarColor}`}
                            style={{ width: `${avgScore}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Topics ──────────────────────────────────── */}
                    {studentTopics.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">
                          Tópicos ({studentTopics.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {studentTopics.slice(0, 6).map((t) => {
                            const { dot, badge } = scoreColor(t.score);
                            return (
                              <span
                                key={t.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${badge}`}
                                title={`${t.name}: ${t.score}/100`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                                {t.name}
                                <span className="opacity-50 text-[10px]">{t.score}</span>
                              </span>
                            );
                          })}
                          {studentTopics.length > 6 && (
                            <span className="text-xs text-gray-400 self-center">
                              +{studentTopics.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Last message ────────────────────────────── */}
                    {lastMsg && (
                      <div className="border-t border-gray-50 pt-3 -mb-0.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            Última mensagem ·{" "}
                            <span className={lastMsg.role === "user" ? "text-blue-500" : "text-gray-400"}>
                              {lastMsg.role === "user" ? "aluno" : "Theo"}
                            </span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {lastMsg.content.slice(0, 140)}
                          {lastMsg.content.length > 140 ? "…" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
