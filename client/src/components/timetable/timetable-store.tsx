/**
 * Local state store for the Teacher Timetable feature.
 *
 * Uses a plain React context + useState/useReducer (the same pattern the rest
 * of Trace uses — no Redux/Zustand introduced). It owns the selected context,
 * the loaded timetable, dirty/save/publish status and every mutation, keeping
 * validation (overlaps, breaks, required fields) in one place.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  TimetableService,
  buildContextKey,
  createDemoTimetable,
  defaultSettings,
  findConflict,
  fromMinutes,
  genId,
  isWithinBreak,
  normalizeSettings,
  toMinutes,
  type Lecture,
  type LectureType,
  type Subject,
  type Timetable,
  type TimetableContext,
  type TimetableSettings,
} from "@/services/timetable-service";

export type ViewMode = "weekly" | "list" | "settings";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface NewLectureInput {
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime?: string; // defaults to one slot
  room?: string;
  type?: LectureType;
  notes?: string;
}

interface TimetableStore {
  // data
  context: TimetableContext;
  timetable: Timetable | null;
  subjects: Subject[];
  lectures: Lecture[];
  settings: TimetableSettings;
  loading: boolean;
  isDirty: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;

  // view
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;

  // context switching (guarded)
  changeContext: (patch: Partial<TimetableContext>) => void;
  forceChangeContext: (patch: Partial<TimetableContext>) => void;
  pendingContext: Partial<TimetableContext> | null;
  resolvePendingContext: (action: "stay" | "discard" | "saveAndLeave") => void;

  // persistence
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;

  // subjects
  addSubject: (data: Omit<Subject, "id" | "createdAt" | "updatedAt">) => boolean;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
  duplicateSubject: (id: string) => void;

  // lectures
  addLecture: (input: NewLectureInput) => boolean;
  updateLecture: (id: string, patch: Partial<Lecture>) => boolean;
  moveLecture: (id: string, day: number, start: string) => boolean;
  deleteLecture: (id: string) => void;
  duplicateLecture: (
    id: string,
    day: number,
    start: string,
    room?: string
  ) => boolean;
  clearAllLectures: () => void;

  // settings
  updateSettings: (patch: Partial<TimetableSettings>) => void;
}

const Ctx = createContext<TimetableStore | null>(null);

const DEFAULT_CONTEXT: TimetableContext = {
  academicYear: "2025 - 2026",
  department: "Computer Engineering",
  year: "2nd Year",
  division: "A",
  semester: "3",
};

export function TimetableStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = user?.uid || "local";

  const [context, setContext] = useState<TimetableContext>(DEFAULT_CONTEXT);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [pendingContext, setPendingContext] =
    useState<Partial<TimetableContext> | null>(null);

  // Guard against stale async loads when switching contexts quickly.
  const loadToken = useRef(0);

  /* ---------- load ---------- */
  const load = useCallback(
    async (ctx: TimetableContext) => {
      const token = ++loadToken.current;
      setLoading(true);
      const existing = await TimetableService.load(uid, ctx);
      if (token !== loadToken.current) return; // superseded
      if (existing) {
        setTimetable({
          ...existing,
          settings: normalizeSettings(existing.settings),
        });
        setLastSavedAt(existing.updatedAt || null);
      } else {
        // Seed a realistic demo timetable so the builder is immediately usable.
        setTimetable(createDemoTimetable(ctx, uid));
        setLastSavedAt(null);
      }
      setIsDirty(false);
      setSaveStatus("idle");
      setLoading(false);
    },
    [uid]
  );

  useEffect(() => {
    load(context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- mutation helper ---------- */
  const apply = useCallback(
    (updater: (tt: Timetable) => Timetable) => {
      setTimetable((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        return { ...next, updatedAt: Date.now() };
      });
      setIsDirty(true);
      setSaveStatus("idle");
    },
    []
  );

  /* ---------- persistence ---------- */
  const saveDraft = useCallback(async () => {
    if (!timetable) return;
    setSaveStatus("saving");
    try {
      const toSave: Timetable = { ...timetable, status: "draft" };
      await TimetableService.save(uid, toSave);
      setTimetable(toSave);
      setIsDirty(false);
      setSaveStatus("saved");
      setLastSavedAt(Date.now());
      toast({ title: "Timetable saved successfully" });
    } catch {
      setSaveStatus("error");
      toast({
        title: "Save failed",
        description: "Saved locally — check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [timetable, uid, toast]);

  const publish = useCallback(async () => {
    if (!timetable) return;
    setSaveStatus("saving");
    const now = Date.now();
    const toSave: Timetable = {
      ...timetable,
      status: "published",
      version: (timetable.version || 1) + (timetable.publishedAt ? 1 : 0),
      publishedAt: now,
      publishedBy: user?.email || uid,
    };
    try {
      await TimetableService.save(uid, toSave);
      setTimetable(toSave);
      setIsDirty(false);
      setSaveStatus("saved");
      setLastSavedAt(now);
      toast({
        title: "Timetable published successfully",
        description: "Students will receive this when sync is enabled.",
      });
    } catch {
      setSaveStatus("error");
      toast({
        title: "Publish failed",
        description: "Saved locally — try publishing again when online.",
        variant: "destructive",
      });
    }
  }, [timetable, uid, user, toast]);

  /* ---------- context switching (guarded) ---------- */
  const doSwitch = useCallback(
    (patch: Partial<TimetableContext>) => {
      setContext((prev) => {
        const next = { ...prev, ...patch };
        load(next);
        return next;
      });
    },
    [load]
  );

  const changeContext = useCallback(
    (patch: Partial<TimetableContext>) => {
      if (isDirty) {
        setPendingContext(patch);
        return;
      }
      doSwitch(patch);
    },
    [isDirty, doSwitch]
  );

  const forceChangeContext = useCallback(
    (patch: Partial<TimetableContext>) => {
      setPendingContext(null);
      doSwitch(patch);
    },
    [doSwitch]
  );

  const resolvePendingContext = useCallback(
    async (action: "stay" | "discard" | "saveAndLeave") => {
      if (!pendingContext) return;
      if (action === "stay") {
        setPendingContext(null);
        return;
      }
      if (action === "saveAndLeave") {
        await saveDraft();
      }
      const target = pendingContext;
      setPendingContext(null);
      doSwitch(target);
    },
    [pendingContext, saveDraft, doSwitch]
  );

  /* ---------- subjects ---------- */
  const addSubject = useCallback(
    (data: Omit<Subject, "id" | "createdAt" | "updatedAt">): boolean => {
      if (!timetable) return false;
      const name = data.name.trim();
      const teacher = data.teacherName.trim();
      if (!name || !teacher) {
        toast({
          title: "Missing details",
          description: "Subject name and teacher are required.",
          variant: "destructive",
        });
        return false;
      }
      const dup = timetable.subjects.find(
        (s) =>
          s.name.trim().toLowerCase() === name.toLowerCase() &&
          s.teacherName.trim().toLowerCase() === teacher.toLowerCase()
      );
      if (dup) {
        toast({
          title: "Duplicate subject",
          description: `"${name}" for ${teacher} already exists in this timetable.`,
          variant: "destructive",
        });
        return false;
      }
      const now = Date.now();
      const subject: Subject = {
        ...data,
        name,
        teacherName: teacher,
        id: genId(),
        createdAt: now,
        updatedAt: now,
      };
      apply((tt) => ({ ...tt, subjects: [...tt.subjects, subject] }));
      toast({ title: "Subject added", description: name });
      return true;
    },
    [timetable, apply, toast]
  );

  const updateSubject = useCallback(
    (id: string, data: Partial<Subject>) => {
      apply((tt) => ({
        ...tt,
        subjects: tt.subjects.map((s) =>
          s.id === id ? { ...s, ...data, updatedAt: Date.now() } : s
        ),
        // keep scheduled lectures' display in sync
        lectures: tt.lectures.map((l) =>
          l.subjectId === id
            ? {
                ...l,
                subjectName: data.name ?? l.subjectName,
                teacherName: data.teacherName ?? l.teacherName,
                updatedAt: Date.now(),
              }
            : l
        ),
      }));
    },
    [apply]
  );

  const removeSubject = useCallback(
    (id: string) => {
      apply((tt) => ({
        ...tt,
        subjects: tt.subjects.filter((s) => s.id !== id),
        lectures: tt.lectures.filter((l) => l.subjectId !== id),
      }));
      toast({ title: "Subject removed" });
    },
    [apply, toast]
  );

  const duplicateSubject = useCallback(
    (id: string) => {
      if (!timetable) return;
      const src = timetable.subjects.find((s) => s.id === id);
      if (!src) return;
      const now = Date.now();
      const copy: Subject = {
        ...src,
        id: genId(),
        name: `${src.name} (copy)`,
        createdAt: now,
        updatedAt: now,
      };
      apply((tt) => ({ ...tt, subjects: [...tt.subjects, copy] }));
      toast({ title: "Subject duplicated", description: copy.name });
    },
    [timetable, apply, toast]
  );

  /* ---------- lectures ---------- */
  const addLecture = useCallback(
    (input: NewLectureInput): boolean => {
      if (!timetable) return false;
      const subject = timetable.subjects.find((s) => s.id === input.subjectId);
      if (!subject) {
        toast({ title: "Pick a subject first", variant: "destructive" });
        return false;
      }
      const endTime =
        input.endTime ||
        fromMinutes(toMinutes(input.startTime) + timetable.settings.defaultLectureDuration);
      if (toMinutes(endTime) <= toMinutes(input.startTime)) {
        toast({
          title: "Invalid time",
          description: "End time must be after the start time.",
          variant: "destructive",
        });
        return false;
      }
      const brk = isWithinBreak(timetable.settings, input.startTime, endTime);
      if (brk) {
        toast({
          title: "Schedule conflict",
          description: `This slot is reserved for ${brk.name}.`,
          variant: "destructive",
        });
        return false;
      }
      const conflict = findConflict(
        timetable.lectures,
        input.dayOfWeek,
        input.startTime,
        endTime
      );
      if (conflict) {
        toast({
          title: "Schedule conflict",
          description: `${conflict.subjectName} already occupies this time slot. Please choose another time or day.`,
          variant: "destructive",
        });
        return false;
      }
      const now = Date.now();
      const lecture: Lecture = {
        id: genId(),
        subjectId: subject.id,
        subjectName: subject.name,
        teacherName: subject.teacherName,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime,
        room: input.room ?? subject.defaultRoom ?? "",
        type: input.type || "Lecture",
        notes: input.notes || "",
        createdAt: now,
        updatedAt: now,
      };
      apply((tt) => ({ ...tt, lectures: [...tt.lectures, lecture] }));
      return true;
    },
    [timetable, apply, toast]
  );

  const updateLecture = useCallback(
    (id: string, patch: Partial<Lecture>): boolean => {
      if (!timetable) return false;
      const current = timetable.lectures.find((l) => l.id === id);
      if (!current) return false;
      const merged = { ...current, ...patch };
      if (toMinutes(merged.endTime) <= toMinutes(merged.startTime)) {
        toast({
          title: "Invalid time",
          description: "End time must be after the start time.",
          variant: "destructive",
        });
        return false;
      }
      const brk = isWithinBreak(
        timetable.settings,
        merged.startTime,
        merged.endTime
      );
      if (brk) {
        toast({
          title: "Schedule conflict",
          description: `This slot is reserved for ${brk.name}.`,
          variant: "destructive",
        });
        return false;
      }
      const conflict = findConflict(
        timetable.lectures,
        merged.dayOfWeek,
        merged.startTime,
        merged.endTime,
        id
      );
      if (conflict) {
        toast({
          title: "Schedule conflict",
          description: `${conflict.subjectName} already occupies this time slot. Please choose another time or day.`,
          variant: "destructive",
        });
        return false;
      }
      apply((tt) => ({
        ...tt,
        lectures: tt.lectures.map((l) =>
          l.id === id
            ? {
                ...merged,
                subjectName: merged.subjectName,
                teacherName: merged.teacherName,
                updatedAt: Date.now(),
              }
            : l
        ),
      }));
      return true;
    },
    [timetable, apply, toast]
  );

  const moveLecture = useCallback(
    (id: string, day: number, start: string): boolean => {
      if (!timetable) return false;
      const current = timetable.lectures.find((l) => l.id === id);
      if (!current) return false;
      const duration = toMinutes(current.endTime) - toMinutes(current.startTime);
      const end = fromMinutes(toMinutes(start) + duration);
      const ok = updateLecture(id, { dayOfWeek: day, startTime: start, endTime: end });
      if (ok) {
        const dayName = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" }[day];
        toast({ title: `Lecture moved to ${dayName}, ${startLabel(start)}` });
      }
      return ok;
    },
    [timetable, updateLecture, toast]
  );

  const deleteLecture = useCallback(
    (id: string) => {
      apply((tt) => ({ ...tt, lectures: tt.lectures.filter((l) => l.id !== id) }));
      toast({ title: "Lecture deleted" });
    },
    [apply, toast]
  );

  const duplicateLecture = useCallback(
    (id: string, day: number, start: string, room?: string): boolean => {
      if (!timetable) return false;
      const src = timetable.lectures.find((l) => l.id === id);
      if (!src) return false;
      const duration = toMinutes(src.endTime) - toMinutes(src.startTime);
      return addLecture({
        subjectId: src.subjectId,
        dayOfWeek: day,
        startTime: start,
        endTime: fromMinutes(toMinutes(start) + duration),
        room: room ?? src.room,
        type: src.type,
        notes: src.notes,
      });
    },
    [timetable, addLecture]
  );

  const clearAllLectures = useCallback(() => {
    apply((tt) => ({ ...tt, lectures: [] }));
    toast({ title: "All lectures cleared" });
  }, [apply, toast]);

  /* ---------- settings ---------- */
  const updateSettings = useCallback(
    (patch: Partial<TimetableSettings>) => {
      apply((tt) => ({ ...tt, settings: { ...tt.settings, ...patch } }));
    },
    [apply]
  );

  const value = useMemo<TimetableStore>(
    () => ({
      context,
      timetable,
      subjects: timetable?.subjects ?? [],
      lectures: timetable?.lectures ?? [],
      settings: timetable?.settings
        ? normalizeSettings(timetable.settings)
        : defaultSettings(),
      loading,
      isDirty,
      saveStatus,
      lastSavedAt,
      viewMode,
      setViewMode,
      changeContext,
      forceChangeContext,
      pendingContext,
      resolvePendingContext,
      saveDraft,
      publish,
      addSubject,
      updateSubject,
      removeSubject,
      duplicateSubject,
      addLecture,
      updateLecture,
      moveLecture,
      deleteLecture,
      duplicateLecture,
      clearAllLectures,
      updateSettings,
    }),
    [
      context,
      timetable,
      loading,
      isDirty,
      saveStatus,
      lastSavedAt,
      viewMode,
      changeContext,
      forceChangeContext,
      pendingContext,
      resolvePendingContext,
      saveDraft,
      publish,
      addSubject,
      updateSubject,
      removeSubject,
      duplicateSubject,
      addLecture,
      updateLecture,
      moveLecture,
      deleteLecture,
      duplicateLecture,
      clearAllLectures,
      updateSettings,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function startLabel(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function useTimetableStore(): TimetableStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimetableStore must be used within provider");
  return ctx;
}

// re-export for convenience in components
export { buildContextKey };
