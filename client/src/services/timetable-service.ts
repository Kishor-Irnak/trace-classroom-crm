/**
 * Teacher Timetable — types, utilities, demo data and persistence service.
 *
 * Data is stored per-teacher, per-class-context as a single Firestore document
 * at:  users/{uid}/timetables/{contextKey}
 *
 * This path is already permitted by the existing Firestore rule
 * `match /users/{userId}/{document=**}` so no security change is required and
 * timetables can never leak between teachers or between divisions.
 *
 * The shape is intentionally structured (subjects / lectures / settings) so a
 * future student-calendar sync (phase 2) can consume it without a migration.
 */
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { CacheService } from "./cache-service";

/* ============================================================
 * Types
 * ========================================================== */

export type LectureType =
  | "Lecture"
  | "Lab"
  | "Tutorial"
  | "Seminar"
  | "Practical"
  | "Other";

export const LECTURE_TYPES: LectureType[] = [
  "Lecture",
  "Lab",
  "Tutorial",
  "Seminar",
  "Practical",
  "Other",
];

export interface Subject {
  id: string;
  name: string;
  teacherName: string;
  defaultRoom?: string;
  color: string; // key into SUBJECT_COLORS
  shortCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Lecture {
  id: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  dayOfWeek: number; // 1 = Monday ... 6 = Saturday
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  room?: string;
  type: LectureType;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TimeBlock {
  id: string;
  type: "lecture" | "break";
  name?: string; // "Lunch Break"
  startTime: string; // "13:00"
  endTime: string; // "14:00"
}

export interface TimetableSettings {
  workingDays: number[]; // subset of [1..6]
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  defaultLectureDuration: number; // minutes
  timeStructure: TimeBlock[];
  breaks?: { id?: string; name: string; startTime: string; endTime: string }[];
}

export type TimetableStatus = "draft" | "published";

export interface TimetableContext {
  academicYear: string;
  department: string;
  year: string;
  division: string;
  semester: string;
}

export interface Timetable extends TimetableContext {
  id: string; // contextKey
  status: TimetableStatus;
  version: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  publishedBy: string | null;
  settings: TimetableSettings;
  subjects: Subject[];
  lectures: Lecture[];
}

/* ============================================================
 * Static option lists (context selector)
 * ========================================================== */

export const ACADEMIC_YEARS = ["2025 - 2026", "2026 - 2027", "2024 - 2025"];
export const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Electronics & Telecom",
  "Mechanical Engineering",
];
export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
export const DIVISIONS = ["A", "B", "C", "D"];
export const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export const DAY_SHORT: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const SLOT_DURATION_OPTIONS = [
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "50 minutes", value: 50 },
  { label: "60 minutes", value: 60 },
];

/* ============================================================
 * Subject colors
 * ========================================================== */

export const SUBJECT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  purple: "#a855f7",
  red: "#ef4444",
  teal: "#14b8a6",
  pink: "#ec4899",
  amber: "#f59e0b",
  indigo: "#6366f1",
  rose: "#f43f5e",
};

export const COLOR_KEYS = Object.keys(SUBJECT_COLORS);

export function colorHex(key: string): string {
  return SUBJECT_COLORS[key] || SUBJECT_COLORS.blue;
}

/** Convert a #rrggbb hex to an rgba() string with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ============================================================
 * Time utilities  (structured "HH:MM" 24h strings — never labels)
 * ========================================================== */

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(mins: number): string {
  const clamped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:00" -> "9:00 AM" */
export function formatTimeLabel(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "09:00" -> "9 AM" (compact, for grid row labels) */
export function formatTimeShort(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour12}:${String(m).padStart(2, "0")} ${period}` : `${hour12} ${period}`;
}

/** Build the ordered list of unique time labels for the grid based on time structure. */
export function buildTimeLabels(settings: TimetableSettings): string[] {
  const times = new Set<string>();
  if (settings?.startTime) times.add(settings.startTime);
  if (settings?.endTime) times.add(settings.endTime);
  const structure = settings?.timeStructure || [];
  structure.forEach((b) => {
    if (b.startTime) times.add(b.startTime);
    if (b.endTime) times.add(b.endTime);
  });
  return Array.from(times).sort((a, b) => toMinutes(a) - toMinutes(b));
}

/* ============================================================
 * Validation
 * ========================================================== */

export function isWithinBreak(
  settings: TimetableSettings,
  start: string,
  end: string
): TimeBlock | null {
  const s = toMinutes(start);
  const e = toMinutes(end);
  const structure = settings?.timeStructure || [];
  for (const b of structure) {
    if (b.type === "break") {
      const bs = toMinutes(b.startTime);
      const be = toMinutes(b.endTime);
      if (s < be && e > bs) return b;
    }
  }
  return null;
}

/**
 * Find a lecture that overlaps the given day/time range.
 * @param excludeId ignore this lecture (used when editing/moving itself)
 */
export function findConflict(
  lectures: Lecture[],
  day: number,
  start: string,
  end: string,
  excludeId?: string
): Lecture | null {
  const s = toMinutes(start);
  const e = toMinutes(end);
  for (const l of lectures) {
    if (l.id === excludeId) continue;
    if (l.dayOfWeek !== day) continue;
    const ls = toMinutes(l.startTime);
    const le = toMinutes(l.endTime);
    if (s < le && e > ls) return l;
  }
  return null;
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/* ============================================================
 * IDs
 * ========================================================== */

export function genId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/* ============================================================
 * Context key
 * ========================================================== */

export function buildContextKey(ctx: TimetableContext): string {
  return [
    ctx.academicYear,
    ctx.department,
    ctx.year,
    ctx.division,
    ctx.semester,
  ]
    .map((s) => String(s).trim().replace(/[^a-zA-Z0-9]+/g, "-"))
    .join("__");
}

/* ============================================================
 * Defaults + demo data
 * ========================================================== */

export function defaultSettings(): TimetableSettings {
  return {
    workingDays: [1, 2, 3, 4, 5, 6],
    startTime: "09:00",
    endTime: "17:00",
    defaultLectureDuration: 60,
    timeStructure: [
      { id: "ts_1", type: "lecture", startTime: "09:00", endTime: "10:00" },
      { id: "ts_2", type: "lecture", startTime: "10:00", endTime: "11:00" },
      { id: "ts_3", type: "lecture", startTime: "11:00", endTime: "12:00" },
      { id: "ts_4", type: "lecture", startTime: "12:00", endTime: "13:00" },
      { id: "ts_5", type: "break", name: "Lunch Break", startTime: "13:00", endTime: "14:00" },
      { id: "ts_6", type: "lecture", startTime: "14:00", endTime: "15:00" },
      { id: "ts_7", type: "lecture", startTime: "15:00", endTime: "16:00" },
      { id: "ts_8", type: "lecture", startTime: "16:00", endTime: "17:00" },
    ],
  };
}

export function normalizeSettings(
  settings?: (Partial<TimetableSettings> & { slotDuration?: number; breaks?: any[] }) | null
): TimetableSettings {
  const defaults = defaultSettings();
  if (!settings) return defaults;

  let timeStructure =
    Array.isArray(settings.timeStructure) && settings.timeStructure.length > 0
      ? [...settings.timeStructure]
      : [];

  if (timeStructure.length === 0) {
    const startMin = toMinutes(settings.startTime || defaults.startTime);
    const endMin = toMinutes(settings.endTime || defaults.endTime);
    const dur = Number(settings.defaultLectureDuration || settings.slotDuration || 60);

    const generated: TimeBlock[] = [];
    let cur = startMin;
    let idx = 1;
    while (cur + dur <= endMin) {
      const next = cur + dur;
      let isBreak = false;
      let breakName = "";
      if (Array.isArray(settings.breaks)) {
        const b = settings.breaks.find(
          (br: any) => toMinutes(br.startTime) <= cur && toMinutes(br.endTime) >= next
        );
        if (b) {
          isBreak = true;
          breakName = b.name || "Break";
        }
      }
      generated.push({
        id: `ts_${idx++}`,
        type: isBreak ? "break" : "lecture",
        name: breakName || undefined,
        startTime: fromMinutes(cur),
        endTime: fromMinutes(next),
      });
      cur = next;
    }
    timeStructure = generated.length > 0 ? generated : defaults.timeStructure;
  }

  return {
    workingDays:
      Array.isArray(settings.workingDays) && settings.workingDays.length > 0
        ? settings.workingDays
        : defaults.workingDays,
    startTime: settings.startTime || defaults.startTime,
    endTime: settings.endTime || defaults.endTime,
    defaultLectureDuration: Number(
      settings.defaultLectureDuration || settings.slotDuration || defaults.defaultLectureDuration
    ),
    timeStructure,
    breaks: Array.isArray(settings.breaks) ? settings.breaks : undefined,
  };
}

interface DemoSubjectSeed {
  key: string;
  name: string;
  teacher: string;
  room: string;
  color: string;
}

const DEMO_SUBJECTS: DemoSubjectSeed[] = [
  { key: "math", name: "Mathematics", teacher: "Shubhanshree Mam", room: "FF110", color: "blue" },
  { key: "ds", name: "Data Structures", teacher: "Amit Sir", room: "FF102", color: "green" },
  { key: "dbms", name: "DBMS", teacher: "Rahul Sir", room: "FF205", color: "orange" },
  { key: "cg", name: "Computer Graphics", teacher: "Neha Mam", room: "Lab 2", color: "purple" },
  { key: "os", name: "Operating System", teacher: "Priya Mam", room: "FF204", color: "red" },
  { key: "wt", name: "Web Technologies", teacher: "Karan Sir", room: "Lab 1", color: "teal" },
  { key: "mp", name: "Mini Project", teacher: "Project Guide", room: "Lab 3", color: "pink" },
  { key: "sem", name: "Seminar", teacher: "Department", room: "Auditorium", color: "amber" },
];

/** A realistic starting timetable matching the reference design (section 41). */
export function createDemoTimetable(
  ctx: TimetableContext,
  createdBy: string
): Timetable {
  const now = Date.now();
  const subjects: Subject[] = DEMO_SUBJECTS.map((s) => ({
    id: s.key,
    name: s.name,
    teacherName: s.teacher,
    defaultRoom: s.room,
    color: s.color,
    createdAt: now,
    updatedAt: now,
  }));

  const subj = (key: string) => subjects.find((s) => s.id === key)!;

  let n = 0;
  const L = (
    key: string,
    day: number,
    start: string,
    end: string,
    room: string,
    type: LectureType = "Lecture"
  ): Lecture => {
    const s = subj(key);
    return {
      id: `demo_${n++}`,
      subjectId: s.id,
      subjectName: s.name,
      teacherName: s.teacherName,
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      room,
      type,
      createdAt: now,
      updatedAt: now,
    };
  };

  const lectures: Lecture[] = [
    // Monday
    L("math", 1, "09:00", "10:00", "FF110"),
    L("dbms", 1, "11:00", "12:00", "FF205"),
    L("wt", 1, "14:00", "15:00", "Lab 1", "Lab"),
    // Tuesday
    L("ds", 2, "09:00", "10:00", "FF102"),
    L("os", 2, "11:00", "12:00", "FF204"),
    L("cg", 2, "14:00", "15:00", "Lab 2", "Lab"),
    L("mp", 2, "16:00", "17:00", "Lab 3", "Practical"),
    // Wednesday
    L("cg", 3, "09:00", "10:00", "Lab 2", "Lab"),
    L("ds", 3, "11:00", "12:00", "FF102"),
    L("dbms", 3, "14:00", "15:00", "FF205"),
    L("sem", 3, "16:00", "17:00", "Auditorium", "Seminar"),
    // Thursday
    L("dbms", 4, "09:00", "10:00", "FF205"),
    L("cg", 4, "11:00", "12:00", "Lab 2", "Lab"),
    L("math", 4, "14:00", "15:00", "FF110"),
    // Friday
    L("math", 5, "09:00", "10:00", "FF110"),
    L("os", 5, "11:00", "12:00", "FF204"),
    L("wt", 5, "14:00", "15:00", "Lab 1", "Lab"),
  ];

  return {
    ...ctx,
    id: buildContextKey(ctx),
    status: "draft",
    version: 1,
    createdBy,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    publishedBy: null,
    settings: defaultSettings(),
    subjects,
    lectures,
  };
}

/** An empty timetable (used when a brand-new context is created by hand). */
export function createEmptyTimetable(
  ctx: TimetableContext,
  createdBy: string
): Timetable {
  const now = Date.now();
  return {
    ...ctx,
    id: buildContextKey(ctx),
    status: "draft",
    version: 1,
    createdBy,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    publishedBy: null,
    settings: defaultSettings(),
    subjects: [],
    lectures: [],
  };
}

/* ============================================================
 * Persistence service
 * ========================================================== */

const LOCAL_PREFIX = "trace_timetable";

function localKey(userId: string, contextKey: string): string {
  return `${LOCAL_PREFIX}_${userId}_${contextKey}`;
}

export const TimetableService = {
  /**
   * Load a timetable for a teacher + context.
   * Order: Firestore -> localStorage mirror -> null.
   */
  async load(
    userId: string,
    ctx: TimetableContext
  ): Promise<Timetable | null> {
    const contextKey = buildContextKey(ctx);
    try {
      const snap = await getDoc(doc(db, "users", userId, "timetables", contextKey));
      if (snap.exists()) {
        const raw = snap.data() as Timetable;
        const data: Timetable = {
          ...raw,
          settings: normalizeSettings(raw.settings),
        };
        // Mirror locally for instant subsequent loads / offline.
        CacheService.set(localKey(userId, contextKey), data, 60 * 60 * 24 * 30);
        return data;
      }
      // Firestore had nothing — check local mirror (e.g. write failed earlier).
      const local = CacheService.get<Timetable>(localKey(userId, contextKey));
      return local ? { ...local, settings: normalizeSettings(local.settings) } : null;
    } catch (e) {
      console.error("[Timetable] load failed, using local mirror", e);
      const local = CacheService.get<Timetable>(localKey(userId, contextKey));
      return local ? { ...local, settings: normalizeSettings(local.settings) } : null;
    }
  },

  /**
   * Persist a timetable. Always mirrors to localStorage; Firestore is
   * best-effort so the teacher never loses work if the network is down.
   */
  async save(userId: string, timetable: Timetable): Promise<void> {
    const contextKey = timetable.id || buildContextKey(timetable);
    const payload: Timetable = {
      ...timetable,
      id: contextKey,
      updatedAt: Date.now(),
    };
    // Mirror first (synchronous, never fails on quota in practice for small docs).
    CacheService.set(localKey(userId, contextKey), payload, 60 * 60 * 24 * 30);
    try {
      await setDoc(doc(db, "users", userId, "timetables", contextKey), payload);
    } catch (e) {
      console.error("[Timetable] Firestore save failed (kept locally)", e);
      throw e;
    }
  },
};
