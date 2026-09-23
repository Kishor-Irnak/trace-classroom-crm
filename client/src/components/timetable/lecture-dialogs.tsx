import { useEffect, useState } from "react";
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
  buildTimeLabels,
  DAY_NAMES,
  formatTimeLabel,
  LECTURE_TYPES,
  toMinutes,
  type Lecture,
  type LectureType,
} from "@/services/timetable-service";
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
  preset: { day: number; start: string } | null;
}) {
  const { subjects, settings, addLecture, updateLecture, deleteLecture } =
    useTimetableStore();

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
      const first = subjects[0];
      setSubjectId(first?.id || "");
      setTeacher(first?.teacherName || "");
      setDay(preset?.day ?? days[0] ?? 1);
      const s = preset?.start ?? "09:00";
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
      if (!room) setRoom(s.defaultRoom || "");
    }
  };

  const save = () => {
    if (!subjectId) return;
    if (lecture) {
      const ok = updateLecture(lecture.id, {
        subjectId,
        subjectName:
          subjects.find((s) => s.id === subjectId)?.name ?? lecture.subjectName,
        teacherName: teacher,
        dayOfWeek: day,
        startTime: start,
        endTime: end,
        room,
        type,
        notes,
      });
      if (ok) onOpenChange(false);
    } else {
      const ok = addLecture({
        subjectId,
        dayOfWeek: day,
        startTime: start,
        endTime: end,
        room,
        type,
        notes,
      });
      if (ok) onOpenChange(false);
    }
  };

  const days = [...settings.workingDays].sort((a, b) => a - b);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lecture ? "Edit Lecture" : "Add Lecture"}</DialogTitle>
          <DialogDescription>
            Schedule a subject into a specific day and time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={onSubjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lec-teacher">Teacher</Label>
            <Input
              id="lec-teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Teacher name"
            />
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
                if (toMinutes(e.target.value) >= toMinutes(end)) {
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

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="lec-notes">Notes</Label>
            <Textarea
              id="lec-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this lecture"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
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
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!subjectId}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultEnd(start: string, slotDuration: number): string {
  const total = toMinutes(start) + (slotDuration || 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
  const { settings, subjects, duplicateLecture } = useTimetableStore();
  const slots = buildTimeLabels(settings);
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

  if (!lecture) return null;
  const color = subjects.find((s) => s.id === lecture.subjectId)?.color;

  const save = () => {
    const ok = duplicateLecture(lecture.id, day, start, room);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Duplicate</Button>
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
  const { settings, moveLecture } = useTimetableStore();
  const slots = buildTimeLabels(settings);
  const days = [...settings.workingDays].sort((a, b) => a - b);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");

  useEffect(() => {
    if (open && lecture) {
      setDay(lecture.dayOfWeek);
      setStart(lecture.startTime);
    }
  }, [open, lecture]);

  if (!lecture) return null;

  const save = () => {
    const ok = moveLecture(lecture.id, day, start);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
