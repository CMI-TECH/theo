import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AiSummaryButton } from "@/components/dashboard/AiSummaryButton";
import type { Student, Topic, Message } from "@/lib/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70)
    return { dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-100", ring: "#22c55e" };
  if (score >= 40)
    return { dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-700 border-yellow-100", ring: "#eab308" };
  return { dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-100", ring: "#ef4444" };
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

// SVG score ring (44×44, radius 18)
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-11 h-11 flex-shrink-0">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
        <circle
          cx="22" cy="22" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
        {score}
      </span>
    </div>
  );
}

// 7-day activity dots
function ActivityDots({ daySet }: { daySet: Set<string> }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return { active: daySet.has(key), label: d.toLocaleDateString("pt-BR", { weekday: "short" }) };
  });
  return (
    <div className="flex items-end gap-1">
      {days.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div
            className={`w-3.5 h-3.5 rounded-sm transition-colors ${
              day.active ? "bg-blue-500" : "bg-gray-100"
            }`}
            title={day.label}
          />
        </div>
      ))}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

interface LessonView { student_id: string; }
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
  } catch { /* table not yet created */ }

  const students: Student[] = (studentsRes.data ?? []) as Student[];
  const topics: Topic[]     = (topicsRes.data   ?? []) as Topic[];
  const messages             = (messagesRes.data ?? []) as Msg[];

  // ── Aggregate ────────────────────────────────────────────────────────────────

  const topicsByStudent   = new Map<string, Topic[]>();
  const msgCountByStudent = new Map<string, number>();
  const lastMsgByStudent  = new Map<string, Msg>();
  const daysByStudent     = new Map<string, Set<string>>();
  const objectiveByStudent= new Map<string, string>();
  const hasPlanByStudent  = new Map<string, boolean>();

  for (const t of topics) {
    const arr = topicsByStudent.get(t.student_id) ?? [];
    arr.push(t);
    topicsByStudent.set(t.student_id, arr);
  }

  for (const m of messages) {
    msgCountByStudent.set(m.student_id, (msgCountByStudent.get(m.student_id) ?? 0) + 1);
    if (!lastMsgByStudent.has(m.student_id)) lastMsgByStudent.set(m.student_id, m);
    if (!daysByStudent.has(m.student_id)) daysByStudent.set(m.student_id, new Set());
    const d = new Date(m.created_at);
    daysByStudent.get(m.student_id)!.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    if (m.role === "user" && m.content.length > 30) objectiveByStudent.set(m.student_id, m.content);
    if (m.role === "assistant" && m.content.includes("Seu plano de estudos")) hasPlanByStudent.set(m.student_id, true);
  }

  const lessonsByStudent = new Map<string, number>();
  for (const lv of lessonViews) {
    lessonsByStudent.set(lv.student_id, (lessonsByStudent.get(lv.student_id) ?? 0) + 1);
  }

  const totalStudents  = students.length;
  const totalTopics    = topics.length;
  const totalMessages  = messages.length;
  const totalLessons   = lessonViews.length;

  // Global avg score (admin view)
  const globalAvg = topics.length > 0
    ? Math.round(topics.reduce((s, t) => s + t.score, 0) / topics.length)
    : null;

  // Active students today
  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })();
  const activeToday = [...daysByStudent.values()].filter((s) => s.has(todayKey)).length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
              {isStudentView ? "Meu Progresso" : "Dashboard de Alunos"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {isStudentView
                ? "Seu histórico de aprendizado com o Theo"
                : globalAvg !== null
                ? `Domínio médio geral: ${globalAvg}/100 · ${activeToday} ativo${activeToday !== 1 ? "s" : ""} hoje`
                : "Visão geral do progresso"}
            </p>
          </div>

          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Voltar ao chat
          </Link>

          {!isStudentView && (
            <div className="flex items-center gap-5">
              {[
                { value: totalStudents,  label: "Alunos",           color: "text-blue-600"  },
                { value: totalTopics,    label: "Tópicos",          color: "text-purple-600"},
                { value: totalMessages,  label: "Mensagens",        color: "text-green-600" },
                { value: totalLessons,   label: "Aulas assistidas", color: "text-orange-600"},
              ].map(({ value, label, color }, i, arr) => (
                <div key={label} className="flex items-center gap-5">
                  <div className="text-center">
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-7 bg-gray-100" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Student grid ────────────────────────────────────────────────────── */}
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
              const lastMsg    = lastMsgByStudent.get(student.id);
              const msgCount   = msgCountByStudent.get(student.id) ?? 0;
              const lessonCount= lessonsByStudent.get(student.id) ?? 0;
              const daySet     = daysByStudent.get(student.id) ?? new Set<string>();
              const streak     = calculateStreak(daySet);
              const objective  = objectiveByStudent.get(student.id);
              const hasPlan    = hasPlanByStudent.get(student.id) ?? false;

              const avgScore =
                studentTopics.length > 0
                  ? Math.round(studentTopics.reduce((s, t) => s + t.score, 0) / studentTopics.length)
                  : null;

              const ringColor = avgScore === null ? "#d1d5db"
                : avgScore >= 70 ? "#22c55e"
                : avgScore >= 40 ? "#eab308"
                : "#ef4444";

              const accentBorder = avgScore === null ? "border-gray-200"
                : avgScore >= 70 ? "border-green-400"
                : avgScore >= 40 ? "border-yellow-400"
                : "border-red-400";

              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-2xl border-t-2 ${accentBorder} border-l border-r border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.09)] transition-all duration-200 overflow-hidden`}
                >
                  {/* Identity header */}
                  <div className="px-5 pt-5 pb-4 flex items-start gap-3 border-b border-gray-50">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                      {initials(student.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{student.name}</p>
                      <p className="text-xs text-gray-400 truncate">{student.email}</p>
                      <p className="text-xs text-gray-300 mt-0.5">Desde {formatDate(student.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasPlan && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                          Plano gerado
                        </span>
                      )}
                      {lastMsg && (
                        <span className="text-xs text-gray-300">{timeAgo(lastMsg.created_at)}</span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-4 flex flex-col gap-4">
                    {/* Objective */}
                    {objective && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-1">Objetivo</p>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{objective}</p>
                      </div>
                    )}

                    {/* Score ring + activity */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {avgScore !== null ? (
                          <>
                            <ScoreRing score={avgScore} color={ringColor} />
                            <div>
                              <p className="text-xs font-medium text-gray-700">Domínio médio</p>
                              <p className="text-xs text-gray-400">{studentTopics.length} tópico{studentTopics.length !== 1 ? "s" : ""} estudado{studentTopics.length !== 1 ? "s" : ""}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Sem tópicos avaliados ainda</p>
                        )}
                      </div>

                      {/* 7-day activity */}
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-[10px] text-gray-300 font-medium">7 dias</p>
                        <ActivityDots daySet={daySet} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-2">
                      {[
                        { icon: "💬", value: msgCount,   label: "msgs"  },
                        { icon: "🎓", value: lessonCount, label: "aulas" },
                        { icon: "🔥", value: streak,      label: streak === 1 ? "dia" : "dias" },
                      ].map(({ icon, value, label }) => (
                        <div key={label} className="flex-1 bg-gray-50 rounded-xl px-2 py-2 text-center">
                          <p className="text-sm font-bold text-gray-800 tabular-nums leading-none">{value}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Topics */}
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
                            <span className="text-xs text-gray-400 self-center">+{studentTopics.length - 6}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Last message */}
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
                          {lastMsg.content.slice(0, 140)}{lastMsg.content.length > 140 ? "…" : ""}
                        </p>
                      </div>
                    )}

                    {/* AI Summary button */}
                    <AiSummaryButton studentId={student.id} />
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
