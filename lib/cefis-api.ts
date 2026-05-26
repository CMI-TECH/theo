/**
 * Live CEFIS API client — sem autenticação necessária
 *
 * API v3 base: https://api-v3.cefis.com.br  (cursos, trilhas, aulas)
 * Todos os endpoints de catálogo são públicos (HTTP 200 sem Authorization).
 */

const V3 = "https://api-v3.cefis.com.br";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CefisCourse {
  id: number;
  title: string;
  subtitle: string;
  summary: string;
  duration: number;      // seconds
  lessonCount: number;
  averageRating: number;
  keywords: string;
  categories: number[];
  teacher?: { id: number; name: string };
}

export interface CefisLesson {
  id: number;
  title: string;
  position: number;
  duration: number;      // seconds
  videoUrl?: string;
}

// ── In-memory cache (survives warm Vercel invocations) ────────────────────────

const _cache = new Map<string, { v: unknown; t: number }>();
const TTL    = 60 * 60 * 1000; // 1 hour

async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v as T;
  const v = await fn();
  _cache.set(key, { v, t: Date.now() });
  return v;
}

// ── Public helpers ─────────────────────────────────────────────────────────────

/** Busca cursos do catálogo CEFIS por texto. Retorna [] se a API estiver fora. */
export async function searchCourses(query: string, limit = 8): Promise<CefisCourse[]> {
  const cacheKey = `courses:${query.slice(0, 100)}:${limit}`;
  return withCache(cacheKey, async () => {
    const url = new URL(`${V3}/courses`);
    url.searchParams.set("search",         query.slice(0, 200));
    url.searchParams.set("count",          String(limit));
    url.searchParams.set("order",          "averageRating");
    url.searchParams.set("orderDirection", "desc");

    const r = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!r.ok) {
      console.error("[cefis-api] Course search failed:", r.status);
      return [];
    }
    const d = await r.json();
    return (d.data ?? []) as CefisCourse[];
  });
}

/** Busca as aulas de um curso com URLs de vídeo. Retorna [] se indisponível. */
export async function getCourseLessons(courseId: number): Promise<CefisLesson[]> {
  return withCache(`lessons:${courseId}`, async () => {
    const r = await fetch(`${V3}/courses/${courseId}/lessons`, {
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return [];

    const d = await r.json();
    type RawLesson = {
      id: number;
      title: string;
      position: number;
      duration: number;
      stream_sources?: { quality: string; link_secure: string }[];
    };
    return (d.data ?? []).map((l: RawLesson): CefisLesson => ({
      id       : l.id,
      title    : l.title,
      position : l.position ?? 0,
      duration : l.duration ?? 0,
      videoUrl :
        l.stream_sources?.find((s) => s.quality === "sd")?.link_secure ??
        l.stream_sources?.[0]?.link_secure,
    }));
  });
}

/** Verifica se a API está acessível. Usado pelo /api/debug. */
export async function pingCefisApi(): Promise<{ ok: boolean; status: string }> {
  try {
    const r = await fetch(`${V3}/courses?count=1`, {
      headers: { Accept: "application/json" },
    });
    if (r.ok) {
      const d = await r.json();
      const total = d?.pagination?.totalItems ?? "?";
      return { ok: true, status: `✅ connected — ${total} cursos no catálogo` };
    }
    return { ok: false, status: `❌ HTTP ${r.status}` };
  } catch (err) {
    return { ok: false, status: `❌ ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Formata cursos + aulas em string para o system prompt. */
export function formatCoursesForPrompt(
  courses: CefisCourse[],
  lessonsMap: Map<number, CefisLesson[]>
): string {
  if (courses.length === 0) return "";

  return courses
    .map((c) => {
      const dur    = Math.round(c.duration / 60);
      const rating = c.averageRating ? ` | ⭐ ${Number(c.averageRating).toFixed(1)}` : "";
      let line = `- [ID ${c.id}] **${c.title}** (${dur} min, ${c.lessonCount} aulas${rating})\n  ${(c.summary ?? "").slice(0, 120)}...`;

      const lessons = lessonsMap.get(c.id) ?? [];
      if (lessons.length > 0) {
        const lessonLines = lessons
          .slice(0, 5)
          .map((l) => {
            const url = l.videoUrl ? ` — ${l.videoUrl}` : "";
            return `    ${l.position}. ${l.title}${url}`;
          })
          .join("\n");
        line += `\n  Aulas disponíveis:\n${lessonLines}`;
      }
      return line;
    })
    .join("\n\n");
}
