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
  const { addSubject, updateSubject } = useTimetableStore();
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState("");
  const [color, setColor] = useState("blue");
  const [shortCode, setShortCode] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setTeacher(editing?.teacherName ?? "");
      setRoom(editing?.defaultRoom ?? "");
      setColor(editing?.color ?? "blue");
      setShortCode(editing?.shortCode ?? "");
    }
  }, [open, editing]);

  const canSubmit = name.trim().length > 0 && teacher.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    if (editing) {
      updateSubject(editing.id, {
        name: name.trim(),
        teacherName: teacher.trim(),
        defaultRoom: room.trim(),
        color,
        shortCode: shortCode.trim(),
      });
    } else {
      const ok = addSubject({
        name: name.trim(),
        teacherName: teacher.trim(),
        defaultRoom: room.trim(),
        color,
        shortCode: shortCode.trim(),
      });
      if (!ok) return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Shubhanshree Mam"
            />
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
