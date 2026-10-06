/**
 * Local state store for the Teacher Timetable feature.
 *
 * Uses a plain React context + useState/useReducer (the same pattern the rest
 * of Trace uses — no Redux/Zustand introduced). It owns the selected context,
 * the loaded timetable, dirty/save/publish status and every mutation.
 *
 * All scheduling rules (teacher availability across years / divisions,
 * back-to-back confirmation, weightage quotas, breaks, working hours…) are
 * evaluated by `services/timetable-validation` and surfaced through
 * `pendingIssue`, which the page renders as a blocking / confirm dialog.
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
  createEmptyTimetable,
  defaultSettings,
  fromMinutes,
  genId,
  normalizeSettings,
  toMinutes,
  DAY_NAMES,
  formatTimeLabel,
  type Lecture,
  type LectureType,
  type Subject,
  type Timetable,
  type TimetableContext,
  type TimetableSettings,
} from "@/services/timetable-service";
import {
  auditTimetable,
  classLabel,
  collectKnownTeachers,
  computeQuotas,
  normalizeTeacher,
  normalizeWeightage,
  validatePlacement,
  validateSettingsChange,
  type ConflictRecord,
  type PlacementInput,
  type PlacementIssue,
  type PlacementResult,
  type SubjectQuota,
} from "@/services/timetable-validation";

export type ViewMode = "weekly" | "list" | "settings";
export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type OthersStatus = "loading" | "ready" | "error";

export interface NewLectureInput {
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime?: string; // defaults to one slot
  room?: string;
  type?: LectureType;
  notes?: string;
}

/** Options shared by every lecture mutation. */
export interface OpOptions {
  /** The teacher already acknowledged the warnings for this action. */
  confirmed?: boolean;
  /**
   * Runs once the change has actually been applied — either immediately or
   * after the teacher confirmed a warning. Dialogs use it to close themselves.
   */
  onDone?: () => void;
}

/** A dialog the page must show: a hard block, or a "are you sure?" confirm. */
export interface PendingIssue {
  kind: "blocked" | "confirm";
  issues: PlacementIssue[];
  /** Optional headline override. */
  title?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

interface Snapshot {
  subjects: Subject[];
  lectures: Lecture[];
  settings: TimetableSettings;
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

  // validation data
  otherTimetables: Timetable[];
  othersStatus: OthersStatus;
  refreshOthers: () => Promise<Timetable[] | null>;
  quotas: Record<string, SubjectQuota>;
  conflicts: ConflictRecord[];
  knownTeachers: string[];
  checkPlacement: (
    p: Omit<PlacementInput, "timetable" | "others">
  ) => PlacementResult;
  pendingIssue: PendingIssue | null;
  resolvePendingIssue: (confirm: boolean) => void;

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
  publish: () => Promise<boolean>;

  // undo
  canUndo: boolean;
  undo: () => void;

  // subjects
  addSubject: (data: Omit<Subject, "id" | "createdAt" | "updatedAt">) => boolean;
  updateSubject: (id: string, data: Partial<Subject>) => boolean;
  removeSubject: (id: string) => void;
  duplicateSubject: (id: string) => void;
  setWeightageForAll: (weightage: number) => boolean;
  copySubjectsFrom: (sourceId: string) => boolean;

  // lectures
  addLecture: (input: NewLectureInput, opts?: OpOptions) => boolean;
  updateLecture: (id: string, patch: Partial<Lecture>, opts?: OpOptions) => boolean;
  moveLecture: (id: string, day: number, start: string, opts?: OpOptions) => boolean;
  deleteLecture: (id: string) => void;
  duplicateLecture: (
    id: string,
    day: number,
    start: string,
    room?: string,
    opts?: OpOptions
  ) => boolean;
  clearAllLectures: () => void;

  // settings
  updateSettings: (patch: Partial<TimetableSettings>) => boolean;
}

const Ctx = createContext<TimetableStore | null>(null);

const DEFAULT_CONTEXT: TimetableContext = {
  academicYear: "2025 - 2026",
  department: "Computer Engineering",
  year: "2nd Year",
  division: "A",
  semester: "3",
};

const HISTORY_LIMIT = 50;

function general(title: string, message: string): PlacementIssue {
  return { code: "general", severity: "error", title, message, short: title };
}

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
  const [others, setOthers] = useState<Timetable[]>([]);
  const [othersStatus, setOthersStatus] = useState<OthersStatus>("loading");
  const [pendingIssue, setPendingIssue] = useState<PendingIssue | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  // Always-fresh mirrors so async confirmations never act on stale state.
  const ttRef = useRef<Timetable | null>(null);
  ttRef.current = timetable;
  const othersRef = useRef<Timetable[]>([]);
  othersRef.current = others;
  const pendingIssueRef = useRef<PendingIssue | null>(null);
  pendingIssueRef.current = pendingIssue;
  const history = useRef<Snapshot[]>([]);

  // Guard against stale async loads when switching contexts quickly.
  const loadToken = useRef(0);

  /* ---------- other classes (for cross-class conflict checks) ---------- */
  const refreshOthers = useCallback(async (): Promise<Timetable[] | null> => {
    try {
      const all = await TimetableService.loadAll(uid);
      othersRef.current = all;
      setOthers(all);
      setOthersStatus("ready");
      return all;
    } catch (e) {
      console.error("[Timetable] could not load other classes", e);
      setOthersStatus("error");
      return null;
    }
  }, [uid]);

  /* ---------- load ---------- */
  const load = useCallback(
    async (ctx: TimetableContext) => {
      const token = ++loadToken.current;
      setLoading(true);
      const [existing, all] = await Promise.all([
        TimetableService.load(uid, ctx),
        refreshOthers(),
      ]);
      if (token !== loadToken.current) return; // superseded
      history.current = [];
      setCanUndo(false);
      setPendingIssue(null);
      if (existing) {
        setTimetable({
          ...existing,
          settings: normalizeSettings(existing.settings),
        });
        setLastSavedAt(existing.updatedAt || null);
      } else if (all && all.length === 0) {
        // Very first timetable ever: seed a realistic example to get started.
        setTimetable(createDemoTimetable(ctx, uid));
        setLastSavedAt(null);
      } else {
        // Other classes already exist: never inject sample lectures that
        // could collide with the teacher's real schedule.
        setTimetable(createEmptyTimetable(ctx, uid));
        setLastSavedAt(null);
      }
      setIsDirty(false);
      setSaveStatus("idle");
      setLoading(false);
    },
    [uid, refreshOthers]
  );

  useEffect(() => {
    load(context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /* ---------- mutation helper (records undo history) ---------- */
  const apply = useCallback((updater: (tt: Timetable) => Timetable) => {
    const cur = ttRef.current;
    if (cur) {
      history.current.push({
        subjects: cur.subjects,
        lectures: cur.lectures,
        settings: cur.settings,
      });
      if (history.current.length > HISTORY_LIMIT) history.current.shift();
      setCanUndo(true);
    }
    setTimetable((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      return { ...next, updatedAt: Date.now() };
    });
    setIsDirty(true);
    setSaveStatus("idle");
  }, []);

  const undo = useCallback(() => {
    const snap = history.current.pop();
    if (!snap) return;
    setCanUndo(history.current.length > 0);
    setTimetable((prev) =>
      prev ? { ...prev, ...snap, updatedAt: Date.now() } : prev
    );
    setIsDirty(true);
    setSaveStatus("idle");
    toast({ title: "Last change undone" });
  }, [toast]);

  /* ---------- confirmation gate ---------- */
  /**
   * Returns true when the action may proceed right now. Otherwise it opens the
   * blocking / confirm dialog and returns false. On confirm, `retry` re-runs
   * the whole action with `confirmed: true`.
   */
  const gate = useCallback(
    (
      result: PlacementResult,
      retry: () => void,
      opts?: OpOptions,
      confirmLabel = "Yes, place it intentionally"
    ): boolean => {
      if (result.errors.length > 0) {
        setPendingIssue({ kind: "blocked", issues: result.errors });
        return false;
      }
      if (result.warnings.length > 0 && !opts?.confirmed) {
        setPendingIssue({
          kind: "confirm",
          issues: result.warnings,
          confirmLabel,
          onConfirm: retry,
        });
        return false;
      }
      return true;
    },
    []
  );

  const resolvePendingIssue = useCallback((confirm: boolean) => {
    const p = pendingIssueRef.current;
    setPendingIssue(null);
    if (confirm && p?.kind === "confirm") p.onConfirm?.();
  }, []);

  /* ---------- persistence ---------- */
  const saveDraft = useCallback(async () => {
    const tt = ttRef.current;
    if (!tt) return;
    setSaveStatus("saving");
    try {
      const fresh = await refreshOthers();
      const toSave: Timetable = { ...tt, status: "draft" };
      await TimetableService.save(uid, toSave);
      setTimetable((prev) => (prev ? { ...prev, status: "draft" } : prev));
      setOthers((prev) => [
        ...prev.filter((t) => t.id !== toSave.id),
        toSave,
      ]);
      setIsDirty(false);
      setSaveStatus("saved");
      setLastSavedAt(Date.now());
      const conflicts = fresh ? auditTimetable(toSave, fresh) : [];
      if (conflicts.length > 0) {
        toast({
          title: `Saved — ${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""} need attention`,
          description: "Resolve the highlighted lectures before publishing.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Timetable saved successfully" });
      }
    } catch {
      setSaveStatus("error");
      toast({
        title: "Save failed",
        description: "Saved locally — check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [uid, toast, refreshOthers]);

  const publish = useCallback(async (): Promise<boolean> => {
    const tt = ttRef.current;
    if (!tt) return false;

    if (tt.lectures.length === 0) {
      toast({
        title: "Nothing to publish",
        description: "Add at least one lecture to the timetable first.",
        variant: "destructive",
      });
      return false;
    }

    // Re-verify against the latest data of every other class.
    setSaveStatus("saving");
    const fresh = await refreshOthers();
    if (!fresh) {
      setSaveStatus("error");
      toast({
        title: "Can't verify teacher availability",
        description:
          "Your other class timetables couldn't be loaded. Check your connection and try again.",
        variant: "destructive",
      });
      return false;
    }
    const conflicts = auditTimetable(tt, fresh);
    if (conflicts.length > 0) {
      setSaveStatus("idle");
      setPendingIssue({
        kind: "blocked",
        title: "Fix conflicts before publishing",
        issues: conflicts.map((c) => ({
          ...c.issue,
          title: `${c.lecture.subjectName} — ${DAY_NAMES[c.lecture.dayOfWeek]} ${formatTimeLabel(c.lecture.startTime)}`,
          message: c.issue.message,
        })),
      });
      return false;
    }

    const now = Date.now();
    const toSave: Timetable = {
      ...tt,
      status: "published",
      version: (tt.version || 1) + (tt.publishedAt ? 1 : 0),
      publishedAt: now,
      publishedBy: user?.email || uid,
    };
    try {
      await TimetableService.save(uid, toSave);
      setTimetable((prev) =>
        prev
          ? {
              ...prev,
              status: "published",
              version: toSave.version,
              publishedAt: now,
              publishedBy: toSave.publishedBy,
            }
          : prev
      );
      setOthers((prev) => [...prev.filter((t) => t.id !== toSave.id), toSave]);
      setIsDirty(false);
      setSaveStatus("saved");
      setLastSavedAt(now);
      toast({
        title: "Timetable published successfully",
        description: "Students will receive this when sync is enabled.",
      });
      return true;
    } catch {
      setSaveStatus("error");
      toast({
        title: "Publish failed",
        description: "Saved locally — try publishing again when online.",
        variant: "destructive",
      });
      return false;
    }
  }, [uid, user, toast, refreshOthers]);

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
      const tt = ttRef.current;
      if (!tt) return false;
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
      const dup = tt.subjects.find(
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
        weightage: normalizeWeightage(data.weightage),
        id: genId(),
        createdAt: now,
        updatedAt: now,
      };
      apply((t) => ({ ...t, subjects: [...t.subjects, subject] }));
      toast({ title: "Subject added", description: name });
      return true;
    },
    [apply, toast]
  );

  const updateSubject = useCallback(
    (id: string, data: Partial<Subject>): boolean => {
      const tt = ttRef.current;
      if (!tt) return false;
      const cur = tt.subjects.find((s) => s.id === id);
      if (!cur) return false;

      const name = (data.name ?? cur.name).trim();
      const teacher = (data.teacherName ?? cur.teacherName).trim();
      if (!name || !teacher) {
        toast({
          title: "Missing details",
          description: "Subject name and teacher are required.",
          variant: "destructive",
        });
        return false;
      }
      const dup = tt.subjects.find(
        (s) =>
          s.id !== id &&
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

      const patch: Partial<Subject> = { ...data, name, teacherName: teacher };

      // Weightage can't go below what is already scheduled.
      if (data.weightage !== undefined) {
        const w = normalizeWeightage(data.weightage);
        const placed = tt.lectures.filter((l) => l.subjectId === id).length;
        if (w > 0 && w < placed) {
          setPendingIssue({
            kind: "blocked",
            issues: [
              general(
                "Weightage is lower than scheduled lectures",
                `${name} already has ${placed} lecture${placed > 1 ? "s" : ""} in the timetable, so its weightage can't be less than ${placed}. Remove ${placed - w} lecture${placed - w > 1 ? "s" : ""} first or choose ${placed} or more.`
              ),
            ],
          });
          return false;
        }
        patch.weightage = w;
      }

      // Changing the teacher must not create clashes in other classes.
      const teacherChanged = teacher !== cur.teacherName;
      if (teacherChanged) {
        const affected = tt.lectures.filter(
          (l) => l.subjectId === id && l.teacherName === cur.teacherName
        );
        const issues: PlacementIssue[] = [];
        for (const l of affected) {
          const r = validatePlacement({
            timetable: tt,
            others: othersRef.current,
            subjectId: id,
            teacherName: teacher,
            room: l.room,
            dayOfWeek: l.dayOfWeek,
            startTime: l.startTime,
            endTime: l.endTime,
            excludeLectureId: l.id,
          });
          r.errors
            .filter((i) => i.code === "teacher-busy")
            .forEach((i) => issues.push(i));
        }
        if (issues.length > 0) {
          setPendingIssue({
            kind: "blocked",
            title: `Can't assign ${teacher} to ${name}`,
            issues: issues.slice(0, 4),
          });
          return false;
        }
      }

      apply((t) => ({
        ...t,
        subjects: t.subjects.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s
        ),
        // keep scheduled lectures in sync (but keep per-lecture teacher overrides)
        lectures: t.lectures.map((l) =>
          l.subjectId === id
            ? {
                ...l,
                subjectName: name,
                teacherName:
                  l.teacherName === cur.teacherName ? teacher : l.teacherName,
                updatedAt: Date.now(),
              }
            : l
        ),
      }));
      return true;
    },
    [apply, toast]
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
      const tt = ttRef.current;
      if (!tt) return;
      const src = tt.subjects.find((s) => s.id === id);
      if (!src) return;
      const now = Date.now();
      const copy: Subject = {
        ...src,
        id: genId(),
        name: `${src.name} (copy)`,
        createdAt: now,
        updatedAt: now,
      };
      apply((t) => ({ ...t, subjects: [...t.subjects, copy] }));
      toast({ title: "Subject duplicated", description: copy.name });
    },
    [apply, toast]
  );

  const setWeightageForAll = useCallback(
    (weightage: number): boolean => {
      const tt = ttRef.current;
      if (!tt) return false;
      const w = normalizeWeightage(weightage);
      if (w > 0) {
        const tooMany = tt.subjects
          .map((s) => ({
            s,
            placed: tt.lectures.filter((l) => l.subjectId === s.id).length,
          }))
          .filter((x) => x.placed > w);
        if (tooMany.length > 0) {
          setPendingIssue({
            kind: "blocked",
            issues: [
              general(
                "Some subjects already have more lectures",
                `${tooMany
                  .map((x) => `${x.s.name} (${x.placed} scheduled)`)
                  .join(", ")} already exceed ${w} per week. Remove the extra lectures first or choose a higher value.`
              ),
            ],
          });
          return false;
        }
      }
      apply((t) => ({
        ...t,
        subjects: t.subjects.map((s) => ({
          ...s,
          weightage: w,
          updatedAt: Date.now(),
        })),
      }));
      toast({
        title: w > 0 ? `Weightage set to ${w} for all subjects` : "Weightage limit removed",
      });
      return true;
    },
    [apply, toast]
  );

  const copySubjectsFrom = useCallback(
    (sourceId: string): boolean => {
      const src = othersRef.current.find((t) => t.id === sourceId);
      if (!src || !src.subjects?.length) return false;
      const now = Date.now();
      const copies: Subject[] = src.subjects.map((s) => ({
        ...s,
        id: genId(),
        createdAt: now,
        updatedAt: now,
      }));
      apply((t) => ({ ...t, subjects: [...t.subjects, ...copies] }));
      toast({
        title: "Subjects copied",
        description: `${copies.length} subjects from ${classLabel(src)}`,
      });
      return true;
    },
    [apply, toast]
  );

  /* ---------- lectures ---------- */
  const addLecture = useCallback(
    (input: NewLectureInput, opts?: OpOptions): boolean => {
      const tt = ttRef.current;
      if (!tt) return false;
      const subject = tt.subjects.find((s) => s.id === input.subjectId);
      if (!subject) {
        toast({ title: "Pick a subject first", variant: "destructive" });
        return false;
      }
      const endTime =
        input.endTime ||
        fromMinutes(toMinutes(input.startTime) + tt.settings.defaultLectureDuration);
      const room = input.room ?? subject.defaultRoom ?? "";

      const result = validatePlacement({
        timetable: tt,
        others: othersRef.current,
        subjectId: subject.id,
        teacherName: subject.teacherName,
        room,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime,
      });
      if (!gate(result, () => addLecture(input, { ...opts, confirmed: true }), opts))
        return false;

      const now = Date.now();
      const lecture: Lecture = {
        id: genId(),
        subjectId: subject.id,
        subjectName: subject.name,
        teacherName: subject.teacherName,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime,
        room,
        type: input.type || "Lecture",
        notes: input.notes || "",
        createdAt: now,
        updatedAt: now,
      };
      apply((t) => ({ ...t, lectures: [...t.lectures, lecture] }));
      opts?.onDone?.();
      return true;
    },
    [apply, toast, gate]
  );

  const updateLecture = useCallback(
    (id: string, patch: Partial<Lecture>, opts?: OpOptions): boolean => {
      const tt = ttRef.current;
      if (!tt) return false;
      const current = tt.lectures.find((l) => l.id === id);
      if (!current) return false;
      const merged: Lecture = { ...current, ...patch };
      const subj = tt.subjects.find((s) => s.id === merged.subjectId);
      if (subj) merged.subjectName = subj.name;
      if (!merged.teacherName?.trim()) {
        toast({
          title: "Teacher required",
          description: "Enter the teacher taking this lecture.",
          variant: "destructive",
        });
        return false;
      }

      const result = validatePlacement({
        timetable: tt,
        others: othersRef.current,
        subjectId: merged.subjectId,
        teacherName: merged.teacherName,
        room: merged.room,
        dayOfWeek: merged.dayOfWeek,
        startTime: merged.startTime,
        endTime: merged.endTime,
        excludeLectureId: id,
      });
      if (
        !gate(result, () => updateLecture(id, patch, { ...opts, confirmed: true }), opts, "Yes, save it intentionally")
      )
        return false;

      apply((t) => ({
        ...t,
        lectures: t.lectures.map((l) =>
          l.id === id ? { ...merged, updatedAt: Date.now() } : l
        ),
      }));
      opts?.onDone?.();
      return true;
    },
    [apply, toast, gate]
  );

  const moveLecture = useCallback(
    (id: string, day: number, start: string, opts?: OpOptions): boolean => {
      const tt = ttRef.current;
      if (!tt) return false;
      const current = tt.lectures.find((l) => l.id === id);
      if (!current) return false;
      // Dropped back where it came from — nothing to do.
      if (current.dayOfWeek === day && current.startTime === start) {
        opts?.onDone?.();
        return true;
      }
      const duration = toMinutes(current.endTime) - toMinutes(current.startTime);
      const end = fromMinutes(toMinutes(start) + duration);
      return updateLecture(
        id,
        { dayOfWeek: day, startTime: start, endTime: end },
        {
          ...opts,
          onDone: () => {
            toast({
              title: `Lecture moved to ${DAY_NAMES[day]}, ${formatTimeLabel(start)}`,
            });
            opts?.onDone?.();
          },
        }
      );
    },
    [updateLecture, toast]
  );

  const deleteLecture = useCallback(
    (id: string) => {
      apply((tt) => ({ ...tt, lectures: tt.lectures.filter((l) => l.id !== id) }));
      toast({ title: "Lecture deleted", description: "Use Undo to bring it back." });
    },
    [apply, toast]
  );

  const duplicateLecture = useCallback(
    (
      id: string,
      day: number,
      start: string,
      room?: string,
      opts?: OpOptions
    ): boolean => {
      const tt = ttRef.current;
      if (!tt) return false;
      const src = tt.lectures.find((l) => l.id === id);
      if (!src) return false;
      const duration = toMinutes(src.endTime) - toMinutes(src.startTime);
      return addLecture(
        {
          subjectId: src.subjectId,
          dayOfWeek: day,
          startTime: start,
          endTime: fromMinutes(toMinutes(start) + duration),
          room: room ?? src.room,
          type: src.type,
          notes: src.notes,
        },
        opts
      );
    },
    [addLecture]
  );

  const clearAllLectures = useCallback(() => {
    apply((tt) => ({ ...tt, lectures: [] }));
    toast({ title: "All lectures cleared", description: "Use Undo to restore them." });
  }, [apply, toast]);

  /* ---------- settings ---------- */
  const updateSettings = useCallback(
    (patch: Partial<TimetableSettings>): boolean => {
      const tt = ttRef.current;
      if (!tt) return false;
      const next = { ...tt.settings, ...patch };
      const problem = validateSettingsChange(tt.lectures, tt.settings, next);
      if (problem) {
        toast({
          title: "Can't apply this change",
          description: problem,
          variant: "destructive",
        });
        return false;
      }
      apply((t) => ({ ...t, settings: next }));
      return true;
    },
    [apply, toast]
  );

  /* ---------- derived ---------- */
  const subjects = timetable?.subjects ?? [];
  const lectures = timetable?.lectures ?? [];

  const quotas = useMemo(
    () => computeQuotas(subjects, lectures),
    [subjects, lectures]
  );
  const conflicts = useMemo(
    () => (timetable ? auditTimetable(timetable, others) : []),
    [timetable, others]
  );
  const knownTeachers = useMemo(
    () => collectKnownTeachers(timetable, others),
    [timetable, others]
  );
  const checkPlacement = useCallback(
    (p: Omit<PlacementInput, "timetable" | "others">): PlacementResult =>
      timetable
        ? validatePlacement({ ...p, timetable, others })
        : { errors: [], warnings: [] },
    [timetable, others]
  );

  const value = useMemo<TimetableStore>(
    () => ({
      context,
      timetable,
      subjects,
      lectures,
      settings: timetable?.settings
        ? normalizeSettings(timetable.settings)
        : defaultSettings(),
      loading,
      isDirty,
      saveStatus,
      lastSavedAt,
      otherTimetables: others,
      othersStatus,
      refreshOthers,
      quotas,
      conflicts,
      knownTeachers,
      checkPlacement,
      pendingIssue,
      resolvePendingIssue,
      viewMode,
      setViewMode,
      changeContext,
      forceChangeContext,
      pendingContext,
      resolvePendingContext,
      saveDraft,
      publish,
      canUndo,
      undo,
      addSubject,
      updateSubject,
      removeSubject,
      duplicateSubject,
      setWeightageForAll,
      copySubjectsFrom,
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
      subjects,
      lectures,
      loading,
      isDirty,
      saveStatus,
      lastSavedAt,
      others,
      othersStatus,
      refreshOthers,
      quotas,
      conflicts,
      knownTeachers,
      checkPlacement,
      pendingIssue,
      resolvePendingIssue,
      viewMode,
      changeContext,
      forceChangeContext,
      pendingContext,
      resolvePendingContext,
      saveDraft,
      publish,
      canUndo,
      undo,
      addSubject,
      updateSubject,
      removeSubject,
      duplicateSubject,
      setWeightageForAll,
      copySubjectsFrom,
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

export function useTimetableStore(): TimetableStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimetableStore must be used within provider");
  return ctx;
}

// re-export for convenience in components
export { buildContextKey, normalizeTeacher };
