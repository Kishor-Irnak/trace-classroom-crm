/**
 * Timetable validation engine — pure functions, no React, no Firestore.
 *
 * Every rule that protects the teacher from scheduling mistakes lives here so
 * the store, the drag-and-drop highlighting, the dialogs and the publish audit
 * all agree on exactly the same answer.
 *
 * Severity model
 *  - "error"   → hard block. The lecture can NOT be placed (teacher already
 *                teaching elsewhere, slot taken, break, weightage used up…).
 *  - "warning" → soft block. The teacher must explicitly confirm so it is
 *                always intentional (back-to-back lectures, room double-booked…).
 *
 * Cross-class checks use every timetable owned by the same teacher account
 * (all years / divisions). Only timetables of the same academic year and the
 * same semester parity (odd / even term) are compared, because those are the
 * ones that actually run at the same time.
 */
import {
  DAY_NAMES,
  buildContextKey,
  formatTimeLabel,
  isValidTime,
  isWithinBreak,
  toMinutes,
  findConflict,
  type Lecture,
  type Subject,
  type Timetable,
  type TimetableContext,
  type TimetableSettings,
} from "./timetable-service";

/* ============================================================
 * Types
 * ========================================================== */

export type IssueSeverity = "error" | "warning";

export type IssueCode =
  | "invalid-time"
  | "non-working-day"
  | "outside-hours"
  | "break"
  | "slot-occupied"
  | "quota-exceeded"
  | "teacher-busy"
  | "teacher-back-to-back"
  | "teacher-overload"
  | "room-busy"
  | "same-subject-day"
  | "general";

export interface PlacementIssue {
  code: IssueCode;
  severity: IssueSeverity;
  /** Dialog heading, e.g. "Teacher is busy in another class". */
  title: string;
  /** Full human explanation. */
  message: string;
  /** 2–3 word label used on drag-and-drop cells, e.g. "Teacher busy". */
  short: string;
}

export interface PlacementResult {
  errors: PlacementIssue[];
  warnings: PlacementIssue[];
}

export interface PlacementInput {
  /** The timetable being edited (current state, including unsaved changes). */
  timetable: Timetable;
  /** Every timetable of this teacher account (may include the current one). */
  others: Timetable[];
  subjectId: string;
  teacherName?: string;
  room?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  /** Ignore this lecture (moving / editing it). */
  excludeLectureId?: string;
}

export interface ConflictRecord {
  lectureId: string;
  lecture: Lecture;
  issue: PlacementIssue;
}

export type QuotaStatus = "unlimited" | "open" | "full" | "over";

export interface SubjectQuota {
  subjectId: string;
  /** 0 = unlimited */
  weightage: number;
  placed: number;
  /** null when unlimited */
  remaining: number | null;
  status: QuotaStatus;
}

/* ============================================================
 * Tunables
 * ========================================================== */

/** More than this many lectures for one teacher in a day triggers a confirmation. */
export const MAX_TEACHER_LECTURES_PER_DAY = 6;

/** Upper bound accepted by the weightage input. */
export const MAX_WEIGHTAGE = 40;

/* ============================================================
 * Normalisation helpers
 * ========================================================== */

const HONORIFICS = new Set([
  "sir",
  "mam",
  "maam",
  "ma'am",
  "ma’am",
  "madam",
  "mr",
  "mrs",
  "ms",
  "miss",
  "dr",
  "prof",
  "professor",
  "shri",
  "smt",
  "kumari",
]);

/** Names that are labels, not people — never treated as "the same teacher". */
const NON_PERSON = new Set([
  "department",
  "project guide",
  "tba",
  "tbd",
  "n/a",
  "na",
  "-",
  "none",
  "guest",
  "guest faculty",
  "faculty",
  "staff",
]);

/**
 * "Dr. Amit Sir", "amit", "Mr Amit" → "amit".
 * Returns "" when the name is a placeholder (Department, TBA, …) so that
 * non-person entries never create false conflicts.
 */
export function normalizeTeacher(name?: string | null): string {
  if (!name) return "";
  const tokens = name
    .toLowerCase()
    .replace(/[.,_]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const core = tokens.filter((t) => !HONORIFICS.has(t));
  const joined = (core.length ? core : tokens).join(" ");
  if (!joined || NON_PERSON.has(joined)) return "";
  return joined;
}

const NON_ROOMS = new Set(["", "-", "tba", "tbd", "n/a", "na", "online", "virtual"]);

export function normalizeRoom(room?: string | null): string {
  const r = (room || "").trim().toLowerCase().replace(/\s+/g, " ");
  return NON_ROOMS.has(r) ? "" : r;
}

function semesterParity(sem: string): number {
  const n = Number(sem);
  return Number.isFinite(n) ? n % 2 : -1;
}

export function classLabel(c: TimetableContext): string {
  return `${c.year}, Division ${c.division} (${c.department}, Sem ${c.semester})`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function timeRange(l: { startTime: string; endTime: string }): string {
  return `${formatTimeLabel(l.startTime)} – ${formatTimeLabel(l.endTime)}`;
}

/* ============================================================
 * Other classes
 * ========================================================== */

export interface ExternalLecture {
  lecture: Lecture;
  /** Human label of the class this lecture belongs to. */
  label: string;
}

/** Lectures of OTHER classes that run in the same term as `current`. */
export function externalLectures(
  current: TimetableContext,
  others: Timetable[]
): ExternalLecture[] {
  const currentId = buildContextKey(current);
  const parity = semesterParity(current.semester);
  const out: ExternalLecture[] = [];
  for (const t of others) {
    if (!t || (t.id || buildContextKey(t)) === currentId) continue;
    if (t.academicYear !== current.academicYear) continue;
    if (semesterParity(t.semester) !== parity) continue;
    const label = classLabel(t);
    for (const lecture of t.lectures || []) out.push({ lecture, label });
  }
  return out;
}

/** Display names of every teacher known in this account (for autocomplete). */
export function collectKnownTeachers(
  timetable: Timetable | null,
  others: Timetable[]
): string[] {
  const seen = new Map<string, string>();
  const add = (name?: string) => {
    const key = normalizeTeacher(name);
    if (key && !seen.has(key)) seen.set(key, (name || "").trim());
  };
  timetable?.subjects.forEach((s) => add(s.teacherName));
  for (const t of others) {
    t.subjects?.forEach((s) => add(s.teacherName));
    t.lectures?.forEach((l) => add(l.teacherName));
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

/* ============================================================
 * Core: validate a single placement
 * ========================================================== */

interface Interval {
  start: number;
  end: number;
  subjectName: string;
  where: string; // "" for current class, " for 2nd Year, Division B …" otherwise
}

export function validatePlacement(input: PlacementInput): PlacementResult {
  const {
    timetable,
    others,
    subjectId,
    dayOfWeek: day,
    startTime,
    endTime,
    excludeLectureId,
  } = input;
  const errors: PlacementIssue[] = [];
  const warnings: PlacementIssue[] = [];
  const settings = timetable.settings;

  /* ---- 1. basic time sanity ---- */
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    errors.push({
      code: "invalid-time",
      severity: "error",
      title: "Invalid time",
      message: "Please enter a valid start and end time.",
      short: "Invalid time",
    });
    return { errors, warnings };
  }
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  if (e <= s) {
    errors.push({
      code: "invalid-time",
      severity: "error",
      title: "Invalid time",
      message: "The end time must be after the start time.",
      short: "Invalid time",
    });
    return { errors, warnings };
  }

  /* ---- 2. working day / hours / break ---- */
  if (!settings.workingDays.includes(day)) {
    errors.push({
      code: "non-working-day",
      severity: "error",
      title: "Not a working day",
      message: `${DAY_NAMES[day] || "This day"} is not enabled as a working day in Settings.`,
      short: "Day off",
    });
  }
  if (s < toMinutes(settings.startTime) || e > toMinutes(settings.endTime)) {
    errors.push({
      code: "outside-hours",
      severity: "error",
      title: "Outside working hours",
      message: `Lectures must fall between ${formatTimeLabel(settings.startTime)} and ${formatTimeLabel(settings.endTime)}.`,
      short: "Outside hours",
    });
  }
  const brk = isWithinBreak(settings, startTime, endTime);
  if (brk) {
    errors.push({
      code: "break",
      severity: "error",
      title: "Slot is a break",
      message: `${timeRange({ startTime, endTime })} overlaps ${brk.name || "a break"} (${timeRange(brk)}).`,
      short: brk.name || "Break",
    });
  }

  /* ---- 3. same-class overlap ---- */
  const clash = findConflict(timetable.lectures, day, startTime, endTime, excludeLectureId);
  if (clash) {
    errors.push({
      code: "slot-occupied",
      severity: "error",
      title: "Time slot already taken",
      message: `${clash.subjectName} (${clash.teacherName}) is already scheduled on ${DAY_NAMES[day]} at ${timeRange(clash)} in this timetable.`,
      short: "Slot taken",
    });
  }

  /* ---- 4. weightage (weekly quota) ---- */
  const subject = timetable.subjects.find((x) => x.id === subjectId);
  if (subject) {
    const weightage = normalizeWeightage(subject.weightage);
    if (weightage > 0) {
      const placed = timetable.lectures.filter(
        (l) => l.subjectId === subjectId && l.id !== excludeLectureId
      ).length;
      if (placed >= weightage) {
        errors.push({
          code: "quota-exceeded",
          severity: "error",
          title: "Weekly lecture limit reached",
          message: `${subject.name} has a weightage of ${weightage} lecture${weightage > 1 ? "s" : ""} per week and all ${weightage} ${weightage > 1 ? "are" : "is"} already scheduled. Increase its weightage (Edit Subject) or remove one of its lectures first.`,
          short: "No lectures left",
        });
      }
    }
  }

  /* ---- 5. teacher availability across ALL classes ---- */
  const external = externalLectures(timetable, others);
  const teacher = (input.teacherName ?? subject?.teacherName ?? "").trim();
  const teacherKey = normalizeTeacher(teacher);

  if (teacherKey) {
    const ownIntervals: Interval[] = timetable.lectures
      .filter(
        (l) =>
          l.id !== excludeLectureId &&
          l.dayOfWeek === day &&
          normalizeTeacher(l.teacherName) === teacherKey
      )
      .map((l) => ({
        start: toMinutes(l.startTime),
        end: toMinutes(l.endTime),
        subjectName: l.subjectName,
        where: "",
      }));

    const externalSameTeacher = external.filter(
      (x) =>
        x.lecture.dayOfWeek === day &&
        normalizeTeacher(x.lecture.teacherName) === teacherKey
    );

    // 5a. hard clash with another class
    const busy = externalSameTeacher.filter(
      (x) => s < toMinutes(x.lecture.endTime) && e > toMinutes(x.lecture.startTime)
    );
    if (busy.length > 0) {
      const lines = busy
        .slice(0, 3)
        .map(
          (x) =>
            `${x.lecture.subjectName} for ${x.label} (${timeRange(x.lecture)})`
        );
      errors.push({
        code: "teacher-busy",
        severity: "error",
        title: "Teacher is busy in another class",
        message: `${teacher} is already teaching ${lines.join("; ")} on ${DAY_NAMES[day]}. A teacher can't be in two classes at once — pick another time slot.`,
        short: "Teacher busy",
      });
    }

    const externalIntervals: Interval[] = externalSameTeacher.map((x) => ({
      start: toMinutes(x.lecture.startTime),
      end: toMinutes(x.lecture.endTime),
      subjectName: x.lecture.subjectName,
      where: ` for ${x.label}`,
    }));

    // 5b. back-to-back (only meaningful when nothing overlaps)
    if (busy.length === 0 && !clash) {
      const all = [...ownIntervals, ...externalIntervals].sort(
        (a, b) => a.start - b.start
      );
      // Walk left / right from the new lecture through touching intervals.
      const left: Interval[] = [];
      let cursor = s;
      for (let i = all.length - 1; i >= 0; i--) {
        if (all[i].end === cursor) {
          left.unshift(all[i]);
          cursor = all[i].start;
        }
      }
      const right: Interval[] = [];
      cursor = e;
      for (let i = 0; i < all.length; i++) {
        if (all[i].start === cursor) {
          right.push(all[i]);
          cursor = all[i].end;
        }
      }
      const run = left.length + 1 + right.length;
      if (run >= 2) {
        const prev = left[left.length - 1];
        const next = right[0];
        const bits: string[] = [];
        if (prev)
          bits.push(
            `${prev.subjectName}${prev.where} ends at ${formatTimeLabel(minToStr(prev.end))}`
          );
        if (next)
          bits.push(
            `${next.subjectName}${next.where} starts at ${formatTimeLabel(minToStr(next.start))}`
          );
        warnings.push({
          code: "teacher-back-to-back",
          severity: "warning",
          title: "Back-to-back lectures",
          message: `${teacher} already has a lecture placed right ${prev ? "before" : "after"} this slot (${bits.join(" · ")}). This would be their ${ordinal(left.length + 1)} lecture in a row (${run} back-to-back). Continue only if this is intentional.`,
          short: "Back-to-back",
        });
      }
    }

    // 5c. heavy day
    const dayTotal = ownIntervals.length + externalIntervals.length + 1;
    if (dayTotal > MAX_TEACHER_LECTURES_PER_DAY) {
      warnings.push({
        code: "teacher-overload",
        severity: "warning",
        title: "Heavy teaching day",
        message: `${teacher} would have ${dayTotal} lectures on ${DAY_NAMES[day]} across all classes (recommended maximum is ${MAX_TEACHER_LECTURES_PER_DAY}).`,
        short: "Heavy day",
      });
    }
  }

  /* ---- 6. room double-booked in another class ---- */
  const roomKey = normalizeRoom(input.room);
  if (roomKey) {
    const roomClash = external.find(
      (x) =>
        x.lecture.dayOfWeek === day &&
        normalizeRoom(x.lecture.room) === roomKey &&
        s < toMinutes(x.lecture.endTime) &&
        e > toMinutes(x.lecture.startTime)
    );
    if (roomClash) {
      warnings.push({
        code: "room-busy",
        severity: "warning",
        title: "Room already booked",
        message: `Room ${input.room} is already used by ${roomClash.label} for ${roomClash.lecture.subjectName} (${timeRange(roomClash.lecture)}). Continue only if the room is shared on purpose.`,
        short: "Room booked",
      });
    }
  }

  /* ---- 7. same subject twice on one day ---- */
  if (subject) {
    const sameDay = timetable.lectures.find(
      (l) =>
        l.subjectId === subjectId &&
        l.id !== excludeLectureId &&
        l.dayOfWeek === day
    );
    if (sameDay) {
      warnings.push({
        code: "same-subject-day",
        severity: "warning",
        title: "Subject already scheduled that day",
        message: `${subject.name} already has a lecture on ${DAY_NAMES[day]} at ${timeRange(sameDay)}. Add another one the same day?`,
        short: "Same day",
      });
    }
  }

  return { errors, warnings };
}

function minToStr(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ============================================================
 * Audit — find conflicts that already exist in a timetable
 * ========================================================== */

const AUDIT_CODES: IssueCode[] = [
  "teacher-busy",
  "slot-occupied",
  "break",
  "outside-hours",
  "non-working-day",
  "invalid-time",
];

export function auditTimetable(
  timetable: Timetable,
  others: Timetable[]
): ConflictRecord[] {
  const out: ConflictRecord[] = [];
  for (const l of timetable.lectures) {
    const r = validatePlacement({
      timetable,
      others,
      subjectId: l.subjectId,
      teacherName: l.teacherName,
      room: l.room,
      dayOfWeek: l.dayOfWeek,
      startTime: l.startTime,
      endTime: l.endTime,
      excludeLectureId: l.id,
    });
    for (const issue of r.errors) {
      if (AUDIT_CODES.includes(issue.code)) {
        out.push({ lectureId: l.id, lecture: l, issue });
      }
    }
  }
  return out;
}

/* ============================================================
 * Weightage (weekly quota)
 * ========================================================== */

export function normalizeWeightage(w: unknown): number {
  const n = Math.floor(Number(w));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_WEIGHTAGE);
}

export function computeQuotas(
  subjects: Subject[],
  lectures: Lecture[]
): Record<string, SubjectQuota> {
  const placedBy: Record<string, number> = {};
  for (const l of lectures) placedBy[l.subjectId] = (placedBy[l.subjectId] || 0) + 1;
  const out: Record<string, SubjectQuota> = {};
  for (const s of subjects) {
    const weightage = normalizeWeightage(s.weightage);
    const placed = placedBy[s.id] || 0;
    if (weightage === 0) {
      out[s.id] = { subjectId: s.id, weightage, placed, remaining: null, status: "unlimited" };
    } else {
      const remaining = weightage - placed;
      out[s.id] = {
        subjectId: s.id,
        weightage,
        placed,
        remaining: Math.max(0, remaining),
        status: remaining < 0 ? "over" : remaining === 0 ? "full" : "open",
      };
    }
  }
  return out;
}

/** Number of lecture cells available in a week (lecture slots × working days). */
export function weeklySlotCapacity(settings: TimetableSettings): number {
  const slots = (settings.timeStructure || []).filter((b) => b.type === "lecture").length;
  return slots * settings.workingDays.length;
}

export function totalWeightage(subjects: Subject[]): number {
  return subjects.reduce((sum, s) => sum + normalizeWeightage(s.weightage), 0);
}

/* ============================================================
 * Settings guards
 * ========================================================== */

interface SettingsProblem {
  key: string;
  message: string;
}

function settingsProblems(lectures: Lecture[], settings: TimetableSettings): SettingsProblem[] {
  const problems: SettingsProblem[] = [];

  const hiddenByDay: Record<number, number> = {};
  for (const l of lectures) {
    if (!settings.workingDays.includes(l.dayOfWeek)) {
      hiddenByDay[l.dayOfWeek] = (hiddenByDay[l.dayOfWeek] || 0) + 1;
    }
  }
  for (const [d, n] of Object.entries(hiddenByDay)) {
    problems.push({
      key: `day:${d}`,
      message: `${DAY_NAMES[Number(d)]} still has ${n} scheduled lecture${n > 1 ? "s" : ""}. Move or delete ${n > 1 ? "them" : "it"} before turning this day off.`,
    });
  }

  const startMin = toMinutes(settings.startTime);
  const endMin = toMinutes(settings.endTime);
  const outside = lectures.filter(
    (l) =>
      settings.workingDays.includes(l.dayOfWeek) &&
      (toMinutes(l.startTime) < startMin || toMinutes(l.endTime) > endMin)
  );
  if (outside.length > 0) {
    problems.push({
      key: "hours",
      message: `${outside.length} scheduled lecture${outside.length > 1 ? "s fall" : " falls"} outside ${formatTimeLabel(settings.startTime)} – ${formatTimeLabel(settings.endTime)}. Move or delete ${outside.length > 1 ? "them" : "it"} first.`,
    });
  }

  for (const l of lectures) {
    const brk = isWithinBreak(settings, l.startTime, l.endTime);
    if (brk) {
      problems.push({
        key: `break:${l.id}:${brk.id}`,
        message: `${l.subjectName} (${DAY_NAMES[l.dayOfWeek]}, ${timeRange(l)}) overlaps ${brk.name || "this break"}. Move the lecture first.`,
      });
    }
  }
  return problems;
}

/**
 * Returns an error message when `next` would orphan / clash with already
 * scheduled lectures, or null when the change is safe. Problems that already
 * exist with `prev` are ignored so legacy data never blocks unrelated edits.
 */
export function validateSettingsChange(
  lectures: Lecture[],
  prev: TimetableSettings,
  next: TimetableSettings
): string | null {
  if (!next.workingDays || next.workingDays.length === 0) {
    return "Select at least one working day.";
  }
  if (!isValidTime(next.startTime) || !isValidTime(next.endTime)) {
    return "Enter a valid start and end time.";
  }
  if (toMinutes(next.endTime) <= toMinutes(next.startTime)) {
    return "Working hours must end after they start.";
  }
  const before = new Set(settingsProblems(lectures, prev).map((p) => p.key));
  const fresh = settingsProblems(lectures, next).find((p) => !before.has(p.key));
  return fresh ? fresh.message : null;
}

/** Validate a new / edited time-structure block (slot or break). */
export function validateTimeBlock(
  settings: TimetableSettings,
  start: string,
  end: string,
  ignoreId?: string
): string | null {
  if (!isValidTime(start) || !isValidTime(end)) return "Enter a valid start and end time.";
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (e <= s) return "End time must be after the start time.";
  if (s < toMinutes(settings.startTime) || e > toMinutes(settings.endTime)) {
    return `Must be inside working hours (${formatTimeLabel(settings.startTime)} – ${formatTimeLabel(settings.endTime)}).`;
  }
  for (const b of settings.timeStructure || []) {
    if (b.id === ignoreId) continue;
    if (s < toMinutes(b.endTime) && e > toMinutes(b.startTime)) {
      return `Overlaps with ${b.type === "break" ? b.name || "a break" : "a lecture slot"} (${timeRange(b)}).`;
    }
  }
  return null;
}

/* ============================================================
 * Slot helpers
 * ========================================================== */

/** Sorted start times of the lecture-type blocks (valid places to put a lecture). */
export function lectureSlotStarts(settings: TimetableSettings): string[] {
  const starts = (settings.timeStructure || [])
    .filter((b) => b.type === "lecture")
    .map((b) => b.startTime);
  return Array.from(new Set(starts)).sort((a, b) => toMinutes(a) - toMinutes(b));
}

/** First lecture slot of `day` that has no lecture in it. */
export function firstFreeSlot(
  settings: TimetableSettings,
  lectures: Lecture[],
  day: number
): { start: string; end: string } | null {
  const blocks = (settings.timeStructure || [])
    .filter((b) => b.type === "lecture")
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  for (const b of blocks) {
    const bs = toMinutes(b.startTime);
    const be = toMinutes(b.endTime);
    const taken = lectures.some(
      (l) =>
        l.dayOfWeek === day &&
        bs < toMinutes(l.endTime) &&
        be > toMinutes(l.startTime)
    );
    if (!taken) return { start: b.startTime, end: b.endTime };
  }
  return blocks[0] ? { start: blocks[0].startTime, end: blocks[0].endTime } : null;
}
