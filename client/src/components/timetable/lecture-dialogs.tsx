import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DAY_NAMES,
  formatTimeLabel,
  fromMinutes,
  LECTURE_TYPES,
  toMinutes,
  type Lecture,
  type LectureType,
} from "@/services/timetable-service";
import { lectureSlotStarts } from "@/services/timetable-validation";
import { QuotaMeter } from "./subject-panel";
import { PlacementHint } from "./validation-ui";
import { useTimetableStore } from "./timetable-store";

/* ------------------------------------------------------------------ */
/* Lecture editor (create via + Add, or edit existing)                 */
/* ------------------------------------------------------------------ */
export function LectureEditorDialog({
  open,
  onOpenChange,
  lecture,
  preset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lecture: Lecture | null;
  preset: { day: number; start: string; subjectId?: string } | null;
}) {
  const {
    subjects,
    settings,
    quotas,
    knownTeachers,
    checkPlacement,
    addLecture,
    updateLecture,
    deleteLecture,
  } = useTimetableStore();

  const [subjectId, setSubjectId] = useState("");
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [room, setRoom] = useState("");
  const [type, setType] = useState<LectureType>("Lecture");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const days = [...settings.workingDays].sort((a, b) => a - b);
    if (lecture) {
      setSubjectId(lecture.subjectId);
      setTeacher(lecture.teacherName);
      setDay(lecture.dayOfWeek);
      setStart(lecture.startTime);
      setEnd(lecture.endTime);
      setRoom(lecture.room || "");
      setType(lecture.type);
      setNotes(lecture.notes || "");
    } else {
      // Prefer the requested subject, then one that still has lectures left.
      const first =
        subjects.find((s) => s.id === preset?.subjectId) ??
        subjects.find((s) => {
          const q = quotas[s.id];
          return !q || q.remaining === null || q.remaining > 0;
        }) ??
        subjects[0];
      setSubjectId(first?.id || "");
      setTeacher(first?.teacherName || "");
      setDay(preset?.day ?? days[0] ?? 1);
      const s = preset?.start ?? settings.startTime ?? "09:00";
      setStart(s);
      setEnd(defaultEnd(s, settings.defaultLectureDuration));
      setRoom(first?.defaultRoom || "");
      setType("Lecture");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lecture]);

  const onSubjectChange = (id: string) => {
    setSubjectId(id);
    const s = subjects.find((x) => x.id === id);
    if (s) {
      setTeacher(s.teacherName);
      setRoom(s.defaultRoom || "");
    }
  };

  // Live validation — the teacher sees problems before pressing save.
  const live = useMemo(
    () =>
      open && subjectId
        ? checkPlacement({
            subjectId,
            teacherName: teacher,
            room,
            dayOfWeek: day,
            startTime: start,
            endTime: end,
            excludeLectureId: lecture?.id,
          })
        : null,
    [open, subjectId, teacher, room, day, start, end, lecture, checkPlacement]
  );
  const hasErrors = (live?.errors.length ?? 0) > 0;

  const save = () => {
    if (!subjectId || hasErrors) return;
    const done = { onDone: () => onOpenChange(false) };
    if (lecture) {
      updateLecture(
        lecture.id,
        {
          subjectId,
          subjectName:
            subjects.find((s) => s.id === subjectId)?.name ?? lecture.subjectName,
          teacherName: teacher.trim(),
          dayOfWeek: day,
          startTime: start,
          endTime: end,
          room,
          type,
          notes,
        },
        done
      );
    } else {
      addLecture(
        {
          subjectId,
          dayOfWeek: day,
          startTime: start,
          endTime: end,
          room,
          type,
          notes,
        },
        done
      );
    }
  };

  const days = [...settings.workingDays].sort((a, b) => a - b);
  const selected = subjects.find((s) => s.id === subjectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lecture ? "Edit Lecture" : "Add Lecture"}</DialogTitle>
          <DialogDescription>
            Schedule a subject into a specific day and time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={onSubjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => {
                  const q = quotas[s.id];
                  const exhausted =
                    (q?.status === "full" || q?.status === "over") &&
                    s.id !== lecture?.subjectId;
                  return (
                    <SelectItem key={s.id} value={s.id} disabled={exhausted}>
                      {s.name}
                      {q && q.remaining !== null
                        ? exhausted
                          ? " — all placed"
                          : ` — ${q.remaining} left`
                        : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selected && quotas[selected.id] && (
              <div className="pt-1">
                <QuotaMeter
                  quota={quotas[selected.id]}
                  color={selected.color}
                  compact
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lec-teacher">Teacher</Label>
            <Input
              id="lec-teacher"
              list="lec-teacher-suggestions"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Teacher name"
              autoComplete="off"
            />
            <datalist id="lec-teacher-suggestions">
              {knownTeachers.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label>Day</Label>
            <Select
              value={String(day)}
              onValueChange={(v) => setDay(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {days.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {DAY_NAMES[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lec-start">Start Time</Label>
            <Input
              id="lec-start"
              type="time"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (
                  e.target.value &&
                  toMinutes(e.target.value) >= toMinutes(end)
                ) {
                  setEnd(defaultEnd(e.target.value, settings.defaultLectureDuration));
                }
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lec-end">End Time</Label>
            <Input
              id="lec-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lec-room">Room</Label>
            <Input
              id="lec-room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="FF110 / Lab 2"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Lecture Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as LectureType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LECTURE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lec-notes">Notes</Label>
            <Textarea
              id="lec-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this lecture"
              rows={2}
            />
          </div>

          <PlacementHint result={live} />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {lecture ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                deleteLecture(lecture.id);
                onOpenChange(false);
              }}
            >
              Delete Lecture
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!subjectId || hasErrors}>
              {lecture ? "Save Changes" : "Add Lecture"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultEnd(start: string, slotDuration: number): string {
  if (!start) return "";
  return fromMinutes(toMinutes(start) + (slotDuration || 60));
}

/* ------------------------------------------------------------------ */
/* Duplicate lecture (pick day / time / room)                          */
/* ------------------------------------------------------------------ */
export function DuplicateDialog({
  open,
  onOpenChange,
  lecture,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lecture: Lecture | null;
}) {
  const { settings, subjects, duplicateLecture, checkPlacement } =
    useTimetableStore();
  const slots = lectureSlotStarts(settings);
  const days = [...settings.workingDays].sort((a, b) => a - b);

  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");
  const [room, setRoom] = useState("");

  useEffect(() => {
    if (open && lecture) {
      setDay(lecture.dayOfWeek);
      setStart(lecture.startTime);
      setRoom(lecture.room || "");
    }
  }, [open, lecture]);

  const live = useMemo(() => {
    if (!open || !lecture) return null;
    const duration = toMinutes(lecture.endTime) - toMinutes(lecture.startTime);
    return checkPlacement({
      subjectId: lecture.subjectId,
      teacherName: lecture.teacherName,
      room,
      dayOfWeek: day,
      startTime: start,
      endTime: fromMinutes(toMinutes(start) + duration),
    });
  }, [open, lecture, day, start, room, checkPlacement]);

  if (!lecture) return null;
  const color = subjects.find((s) => s.id === lecture.subjectId)?.color;
  const hasErrors = (live?.errors.length ?? 0) > 0;

  const save = () => {
    if (hasErrors) return;
    duplicateLecture(lecture.id, day, start, room, {
      onDone: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate Lecture</DialogTitle>
          <DialogDescription>
            Place another copy of{" "}
            <span className={color ? "font-semibold" : "font-semibold"}>
              {lecture.subjectName}
            </span>{" "}
            at a different time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Day</Label>
            <Select
              value={String(day)}
              onValueChange={(v) => setDay(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {days.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {DAY_NAMES[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Time</Label>
            <Select value={start} onValueChange={setStart}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatTimeLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dup-room">Room</Label>
            <Input
              id="dup-room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="FF110"
            />
          </div>

          <PlacementHint result={live} />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={hasErrors}>
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Move lecture (keyboard / non-drag alternative)                      */
/* ------------------------------------------------------------------ */
export function MoveDialog({
  open,
  onOpenChange,
  lecture,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lecture: Lecture | null;
}) {
  const { settings, moveLecture, checkPlacement } = useTimetableStore();
  const slots = lectureSlotStarts(settings);
  const days = [...settings.workingDays].sort((a, b) => a - b);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");

  useEffect(() => {
    if (open && lecture) {
      setDay(lecture.dayOfWeek);
      setStart(lecture.startTime);
    }
  }, [open, lecture]);

  const live = useMemo(() => {
    if (!open || !lecture) return null;
    const unchanged = lecture.dayOfWeek === day && lecture.startTime === start;
    if (unchanged) return null;
    const duration = toMinutes(lecture.endTime) - toMinutes(lecture.startTime);
    return checkPlacement({
      subjectId: lecture.subjectId,
      teacherName: lecture.teacherName,
      room: lecture.room,
      dayOfWeek: day,
      startTime: start,
      endTime: fromMinutes(toMinutes(start) + duration),
      excludeLectureId: lecture.id,
    });
  }, [open, lecture, day, start, checkPlacement]);

  if (!lecture) return null;
  const hasErrors = (live?.errors.length ?? 0) > 0;

  const save = () => {
    if (hasErrors) return;
    moveLecture(lecture.id, day, start, {
      onDone: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Lecture</DialogTitle>
          <DialogDescription>
            Move <span className="font-semibold">{lecture.subjectName}</span> to
            a new day and time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Day</Label>
            <Select
              value={String(day)}
              onValueChange={(v) => setDay(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {days.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {DAY_NAMES[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Select value={start} onValueChange={setStart}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatTimeLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PlacementHint result={live} />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={hasErrors}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
