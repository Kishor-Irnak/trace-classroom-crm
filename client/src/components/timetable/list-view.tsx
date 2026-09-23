import { useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  colorHex,
  formatTimeLabel,
  DAY_NAMES,
  type Lecture,
} from "@/services/timetable-service";
import { useTimetableStore } from "./timetable-store";

export function ListView({
  onEdit,
  onDelete,
}: {
  onEdit: (l: Lecture) => void;
  onDelete: (l: Lecture) => void;
}) {
  const { lectures, subjects } = useTimetableStore();
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");

  const teachers = useMemo(
    () =>
      Array.from(new Set(lectures.map((l) => l.teacherName))).filter(Boolean),
    [lectures],
  );
  const rooms = useMemo(
    () =>
      Array.from(
        new Set(lectures.map((l) => l.room).filter(Boolean)),
      ) as string[],
    [lectures],
  );

  const colorFor = (subjectId: string) =>
    colorHex(subjects.find((s) => s.id === subjectId)?.color || "blue");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...lectures]
      .filter((l) => {
        if (subjectFilter !== "all" && l.subjectId !== subjectFilter)
          return false;
        if (teacherFilter !== "all" && l.teacherName !== teacherFilter)
          return false;
        if (roomFilter !== "all" && l.room !== roomFilter) return false;
        if (
          q &&
          !`${l.subjectName} ${l.teacherName} ${l.room} ${l.type}`
            .toLowerCase()
            .includes(q)
        )
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
      );
  }, [lectures, query, subjectFilter, teacherFilter, roomFilter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lectures…"
            className="pl-8"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teachers</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Room" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rooms</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No lectures match your filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">
                  {DAY_NAMES[l.dayOfWeek]}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatTimeLabel(l.startTime)} – {formatTimeLabel(l.endTime)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colorFor(l.subjectId) }}
                    />
                    <span className="font-medium">{l.subjectName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {l.teacherName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {l.room || "—"}
                </TableCell>
                <TableCell>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                    {l.type}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(l)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(l)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
