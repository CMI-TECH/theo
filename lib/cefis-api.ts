/**
 * Live CEFIS API client
 *
 * Auth resolution order:
 *  1. CEFIS_API_KEY  — pre-obtained key (preferred for Vercel deploys)
 *  2. CEFIS_EMAIL + CEFIS_PASSWORD — auto-login on first call, key cached in memory
 *
 * API v1 base: https://cefis.com.br
 * API v3 base: https://api-v3.cefis.com.br  (courses, tracks, lessons)
 */

const V1 = "https://cefis.com.br";
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

// ── API key ───────────────────────────────────────────────────────────────────

let _key: string | null = null;

async function getKey(): Promise<string | null> {
  if (_key) return _key;

  const direct = process.env.CEFIS_API_KEY;
  if (direct) {
    _key = direct;
    return _key;
  }

  const email = process.env.CEFIS_EMAIL;
  const pass  = process.env.CEFIS_PASSWORD;
  if (!email || !pass) {
    console.warn("[cefis-api] No CEFIS_API_KEY or CEFIS_EMAIL/PASSWORD set — running without CEFIS integration");
    return null;
  }

  try {
    const r = await fetch(`${V1}/api/v1/login`, {
      method : "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body   : JSON.stringify({ email, pass }),
    });
    if (!r.ok) {
      console.error("[cefis-api] Login failed:", r.status, await r.text());
      return null;
    }
    const d = await r.json();
    _key = (d?.data?.key as string) ?? null;
    if (_key) console.log("[cefis-api] API key obtained via login");
    return _key;
  } catch (err) {
    console.error("[cefis-api] Login error:", err);
    return null;
  }
}

// ── Simple in-memory cache (survives warm Vercel invocations) ─────────────────

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

/** Search the CEFIS course catalog. Returns [] gracefully if API is unavailable. */
export async function searchCourses(query: string, limit = 8): Promise<CefisCourse[]> {
  const cacheKey = `courses:${query.slice(0, 100)}:${limit}`;
  return withCache(cacheKey, async () => {
    const key = await getKey();
    if (!key) return [];

    const url = new URL(`${V3}/courses`);
    url.searchParams.set("search",         query.slice(0, 200));
    url.searchParams.set("count",          String(limit));
    url.searchParams.set("order",          "averageRating");
    url.searchParams.set("orderDirection", "desc");

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!r.ok) {
      console.error("[cefis-api] Course search failed:", r.status);
      return [];
    }
    const d = await r.json();
    return (d.data ?? []) as CefisCourse[];
  });
}

/** Fetch lessons for a course (with video URLs). Returns [] gracefully. */
export async function getCourseLessons(courseId: number): Promise<CefisLesson[]> {
  return withCache(`lessons:${courseId}`, async () => {
    const key = await getKey();
    if (!key) return [];

    const r = await fetch(`${V3}/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
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

/** Check if the CEFIS API is reachable and the key is valid. */
export async function pingCefisApi(): Promise<{ ok: boolean; status: string }> {
  try {
    const key = await getKey();
    if (!key) return { ok: false, status: "no API key configured" };

    const r = await fetch(`${V3}/courses?count=1`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (r.ok) return { ok: true, status: "✅ connected" };
    return { ok: false, status: `❌ HTTP ${r.status}` };
  } catch (err) {
    return { ok: false, status: `❌ ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Format courses + lessons into a prompt-friendly string for the system prompt. */
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
