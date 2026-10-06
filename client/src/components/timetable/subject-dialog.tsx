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
import { cn } from "@/lib/utils";
import {
  COLOR_KEYS,
  colorHex,
  type Subject,
} from "@/services/timetable-service";
import {
  MAX_WEIGHTAGE,
  normalizeWeightage,
  totalWeightage,
  weeklySlotCapacity,
} from "@/services/timetable-validation";
import { useTimetableStore } from "./timetable-store";

export function SubjectDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Subject | null;
}) {
  const {
    addSubject,
    updateSubject,
    subjects,
    lectures,
    settings,
    knownTeachers,
  } = useTimetableStore();
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState("");
  const [color, setColor] = useState("blue");
  const [shortCode, setShortCode] = useState("");
  const [weightage, setWeightage] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setTeacher(editing?.teacherName ?? "");
      setRoom(editing?.defaultRoom ?? "");
      setColor(editing?.color ?? "blue");
      setShortCode(editing?.shortCode ?? "");
      const w = normalizeWeightage(editing?.weightage);
      setWeightage(w > 0 ? String(w) : "");
    }
  }, [open, editing]);

  const trimmed = weightage.trim();
  const parsed = trimmed === "" ? 0 : Number(trimmed);
  const weightageValid =
    trimmed === "" ||
    (Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_WEIGHTAGE);
  const placed = editing
    ? lectures.filter((l) => l.subjectId === editing.id).length
    : 0;
  const belowPlaced = weightageValid && parsed > 0 && parsed < placed;

  // Capacity: total weekly lectures requested vs lecture slots that exist.
  const capacity = weeklySlotCapacity(settings);
  const otherTotal = totalWeightage(
    subjects.filter((s) => s.id !== editing?.id)
  );
  const projectedTotal = otherTotal + (weightageValid ? parsed : 0);
  const overCapacity = capacity > 0 && projectedTotal > capacity;

  const canSubmit =
    name.trim().length > 0 &&
    teacher.trim().length > 0 &&
    weightageValid &&
    !belowPlaced;

  const submit = () => {
    if (!canSubmit) return;
    if (editing) {
      const ok = updateSubject(editing.id, {
        name: name.trim(),
        teacherName: teacher.trim(),
        defaultRoom: room.trim(),
        color,
        shortCode: shortCode.trim(),
        weightage: parsed,
      });
      if (!ok) return;
    } else {
      const ok = addSubject({
        name: name.trim(),
        teacherName: teacher.trim(),
        defaultRoom: room.trim(),
        color,
        shortCode: shortCode.trim(),
        weightage: parsed,
      });
      if (!ok) return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Subject" : "Add Subject"}</DialogTitle>
          <DialogDescription>
            Subjects become draggable cards you can schedule into the week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subj-name">Subject Name</Label>
            <Input
              id="subj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mathematics"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subj-teacher">Teacher</Label>
            <Input
              id="subj-teacher"
              list="subj-teacher-suggestions"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Shubhanshree Mam"
              autoComplete="off"
            />
            <datalist id="subj-teacher-suggestions">
              {knownTeachers.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="text-[11px] text-muted-foreground">
              Use the exact same name in every class so clashes are detected.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subj-weightage">
              Weightage (lectures per week)
            </Label>
            <Input
              id="subj-weightage"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_WEIGHTAGE}
              step={1}
              value={weightage}
              onChange={(e) => setWeightage(e.target.value)}
              placeholder="Leave empty for no limit"
              aria-invalid={!weightageValid || belowPlaced}
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeightage(String(n))}
                  className={cn(
                    "h-7 min-w-7 rounded-md border px-2 text-xs font-medium transition-colors",
                    parsed === n && trimmed !== ""
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setWeightage("")}
                className={cn(
                  "h-7 rounded-md border px-2 text-xs font-medium transition-colors",
                  trimmed === ""
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                No limit
              </button>
            </div>
            {!weightageValid && (
              <p className="text-xs text-destructive">
                Enter a whole number between 0 and {MAX_WEIGHTAGE}.
              </p>
            )}
            {belowPlaced && (
              <p className="text-xs text-destructive">
                {placed} lecture{placed > 1 ? "s are" : " is"} already scheduled —
                weightage can't be lower than {placed}.
              </p>
            )}
            {weightageValid && !belowPlaced && overCapacity && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Total weightage would be {projectedTotal}, but this timetable only
                has {capacity} lecture slots per week.
              </p>
            )}
            {weightageValid && !belowPlaced && !overCapacity && parsed > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {parsed} lecture{parsed > 1 ? "s" : ""} per week · total weightage{" "}
                {projectedTotal}
                {capacity > 0 ? ` of ${capacity} weekly slots` : ""}.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subj-room">Default Room</Label>
              <Input
                id="subj-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="FF110"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subj-code">Short Code</Label>
              <Input
                id="subj-code"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                placeholder="MAT"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  aria-label={`color ${key}`}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    color === key ? "border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: colorHex(key) }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {editing ? "Save Changes" : "Add Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Set the same weightage for every subject in one go                  */
/* ------------------------------------------------------------------ */
export function BulkWeightageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { subjects, settings, setWeightageForAll } = useTimetableStore();
  const [value, setValue] = useState("4");

  useEffect(() => {
    if (open) setValue("4");
  }, [open]);

  const n = value.trim() === "" ? 0 : Number(value);
  const valid = Number.isInteger(n) && n >= 0 && n <= MAX_WEIGHTAGE;
  const total = valid ? n * subjects.length : 0;
  const capacity = weeklySlotCapacity(settings);
  const over = valid && n > 0 && capacity > 0 && total > capacity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set weightage for all subjects</DialogTitle>
          <DialogDescription>
            Every subject will get this many lectures per week. You can still
            fine-tune each subject afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="bulk-weightage">Lectures per week</Label>
          <Input
            id="bulk-weightage"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_WEIGHTAGE}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Empty = no limit"
            aria-invalid={!valid}
          />
          {!valid && (
            <p className="text-xs text-destructive">
              Enter a whole number between 0 and {MAX_WEIGHTAGE}.
            </p>
          )}
          {valid && n > 0 && (
            <p
              className={cn(
                "text-xs",
                over
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              )}
            >
              {subjects.length} subjects × {n} = {total} lectures per week
              {capacity > 0 ? ` (timetable has ${capacity} slots)` : ""}
              {over ? " — more than the available slots." : "."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              if (setWeightageForAll(n)) onOpenChange(false);
            }}
          >
            Apply to all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
