import fs from "fs";
import path from "path";

interface CourseTeacher {
  id: number;
  name: string;
}

export interface CourseDetails {
  id: number;
  title: string;
  subtitle: string;
  summary: string;
  keywords: string;
  categories: number[];
  duration: number; // seconds
  lessonCount: number;
  teacher: CourseTeacher;
  averageRating: number;
  ratingQuantity: number;
}

export interface Lesson {
  id: number;
  title: string;
  position: number;
  duration: number; // seconds
  videoUrl?: string;
}

const COURSES_DIR = path.join(process.cwd(), "data", "courses", "output");

let _cache: CourseDetails[] | null = null;

function loadAll(): CourseDetails[] {
  if (_cache) return _cache;

  // data/ is gitignored — on Vercel (or any deploy without the data dir) return empty gracefully
  if (!fs.existsSync(COURSES_DIR)) {
    console.warn("[cefis-courses] data dir not found, running without course catalogue:", COURSES_DIR);
    _cache = [];
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(COURSES_DIR, { withFileTypes: true });
  } catch (err) {
    console.error("[cefis-courses] Failed to read courses dir:", err);
    _cache = [];
    return [];
  }

  const courses: CourseDetails[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const detailsPath = path.join(COURSES_DIR, entry.name, "details.json");
    if (!fs.existsSync(detailsPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(detailsPath, "utf-8"));
      courses.push(raw.data as CourseDetails);
    } catch {
      // skip malformed
    }
  }

  _cache = courses;
  return courses;
}

export function searchCourses(query: string, limit = 8): CourseDetails[] {
  const terms = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return loadAll().slice(0, limit);

  return loadAll()
    .map((c) => {
      const normalizedTitle = c.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      const normalizedKeywords = (c.keywords ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      const normalizedSummary = (c.summary ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");

      let score = 0;
      for (const term of terms) {
        if (normalizedTitle.includes(term)) score += 10;
        if (normalizedKeywords.includes(term)) score += 8;
        if (normalizedSummary.includes(term)) score += 3;
      }
      return { course: c, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ course }) => course);
}

export function getCourse(id: number): CourseDetails | null {
  return loadAll().find((c) => c.id === id) ?? null;
}

export function getCourseLessons(courseId: number): Lesson[] {
  const lessonsDir = path.join(COURSES_DIR, String(courseId), "lessons");
  if (!fs.existsSync(lessonsDir)) return [];

  const entries = fs.readdirSync(lessonsDir, { withFileTypes: true });
  const lessons: Lesson[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const detailsPath = path.join(lessonsDir, entry.name, "details.json");
    if (!fs.existsSync(detailsPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(detailsPath, "utf-8"));
      // Extract SD video URL from stream_sources
      const videoUrl: string | undefined =
        raw.stream_sources?.find(
          (s: { quality: string; link_secure: string }) => s.quality === "sd"
        )?.link_secure ??
        raw.stream_sources?.[0]?.link_secure;

      lessons.push({
        id: raw.id,
        title: raw.title,
        position: raw.position ?? 0,
        duration: raw.duration ?? 0,
        ...(videoUrl ? { videoUrl } : {}),
      });
    } catch {
      // skip
    }
  }

  return lessons.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function getAllCourses(): CourseDetails[] {
  return loadAll();
}

export function formatCoursesForPrompt(
  courses: CourseDetails[],
  includeLessons = false
): string {
  if (courses.length === 0) return "";

  const lines = courses.map((c) => {
    const dur = Math.round(c.duration / 60);
    const rating =
      c.averageRating != null ? ` | Avaliação: ${c.averageRating}/10` : "";
    let line = `- [ID ${c.id}] **${c.title}** (${dur} min, ${c.lessonCount} aulas${rating})\n  ${(c.summary ?? "").slice(0, 120)}...`;

    if (includeLessons) {
      const lessons = getCourseLessons(c.id).slice(0, 6);
      if (lessons.length > 0) {
        const lessonLines = lessons
          .map((l) => {
            const url = l.videoUrl ? ` — ${l.videoUrl}` : "";
            return `    ${l.position}. ${l.title}${url}`;
          })
          .join("\n");
        line += `\n  Aulas disponíveis:\n${lessonLines}`;
      }
    }

    return line;
  });

  return lines.join("\n");
}
