import { useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  MoreVertical,
  Pencil,
  Save,
  Send,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  colorHex,
  DAY_NAMES,
  DAY_SHORT,
  formatTimeLabel,
  hexToRgba,
  toMinutes,
  type Lecture,
  type TimetableSettings,
} from "@/services/timetable-service";
import { useTimetableStore } from "./timetable-store";

interface MobileProps {
  onEditLecture: (l: Lecture) => void;
  onMoveLecture: (l: Lecture) => void;
  onDeleteLecture: (l: Lecture) => void;
  onPreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onChangeContext: () => void;
}

function currentWeekDays(): { dow: number; dayNum: number }[] {
  const today = new Date();
  const jsDay = today.getDay(); // 0 Sun .. 6 Sat
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((jsDay + 6) % 7));
  return [1, 2, 3, 4, 5, 6].map((dow) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + (dow - 1));
    return { dow, dayNum: date.getDate() };
  });
}

export function MobileTimetable({
  onEditLecture,
  onMoveLecture,
  onDeleteLecture,
  onPreview,
  onSaveDraft,
  onPublish,
  onChangeContext,
}: MobileProps) {
  const { context, lectures, subjects, settings } = useTimetableStore();

  const week = useMemo(currentWeekDays, []);
  const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const working = [...settings.workingDays].sort((a, b) => a - b);
  const initialDay = working.includes(todayDow) ? todayDow : (working[0] ?? 1);

  const [selectedDay, setSelectedDay] = useState<number>(initialDay);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  const colorFor = (subjectId: string) =>
    colorHex(subjects.find((s) => s.id === subjectId)?.color || "blue");

  const dayLectures = lectures
    .filter((l) => l.dayOfWeek === selectedDay)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  // Merge breaks into the selected day's timeline.
  type TimelineItem =
    | { kind: "lecture"; time: number; lecture: Lecture }
    | { kind: "break"; time: number; name: string; start: string; end: string };
  const timeline: TimelineItem[] = [
    ...dayLectures.map<TimelineItem>((l) => ({
      kind: "lecture",
      time: toMinutes(l.startTime),
      lecture: l,
    })),
    ...(settings.timeStructure || [])
      .filter((b) => b.type === "break")
      .map<TimelineItem>((b) => ({
        kind: "break",
        time: toMinutes(b.startTime),
        name: b.name || "Break",
        start: b.startTime,
        end: b.endTime,
      })),
  ].sort((a, b) => a.time - b.time);

  const todayLectures = lectures
    .filter((l) => l.dayOfWeek === todayDow)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Timetable</h1>
            <p className="text-xs text-muted-foreground">
              {context.year} • Div {context.division} • Sem {context.semester}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onChangeContext}
            className="gap-1.5"
          >
            Change
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="flex-1 gap-1.5"
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            className="flex-1 gap-1.5"
          >
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button size="sm" onClick={onPublish} className="flex-1 gap-1.5">
            <Send className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      {/* Day pills */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {week
          .filter((w) => settings.workingDays.includes(w.dow))
          .map((w) => (
            <button
              key={w.dow}
              onClick={() => setSelectedDay(w.dow)}
              className={cn(
                "flex min-w-[52px] shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors",
                selectedDay === w.dow
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground",
              )}
            >
              <span className="text-[11px] opacity-80">{DAY_SHORT[w.dow]}</span>
              <span className="text-base font-semibold">{w.dayNum}</span>
            </button>
          ))}
      </div>

      {/* Lectures */}
      <div className="flex-1 space-y-3 px-4 pb-28">
        <p className="text-sm font-semibold text-muted-foreground">
          {DAY_NAMES[selectedDay]}
        </p>
        {dayLectures.length === 0 &&
          (settings.timeStructure || []).filter((b) => b.type === "break").length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No lectures on {DAY_NAMES[selectedDay]}.
          </div>
        )}
        {timeline.map((item, i) =>
          item.kind === "break" ? (
            <MobileBreakCard
              key={`b-${i}`}
              name={item.name}
              startTime={item.start}
              endTime={item.end}
            />
          ) : (
            <MobileLectureCard
              key={item.lecture.id}
              lecture={item.lecture}
              color={colorFor(item.lecture.subjectId)}
              settings={settings}
              onEdit={() => onEditLecture(item.lecture)}
              onMove={() => onMoveLecture(item.lecture)}
              onDelete={() => onDeleteLecture(item.lecture)}
            />
          ),
        )}
      </div>

      {/* Quick edit */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background p-4">
        <Button className="w-full gap-2" onClick={() => setQuickEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Quick Edit (Today)
        </Button>
      </div>

      <Drawer open={quickEditOpen} onOpenChange={setQuickEditOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Quick Edit — Today</DrawerTitle>
            <DrawerDescription>
              Change room, time, teacher or move a lecture to another day.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2 overflow-y-auto px-4 pb-6">
            {todayLectures.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing scheduled today.
              </p>
            )}
            {todayLectures.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <span
                  className="h-8 w-1 rounded-full"
                  style={{ backgroundColor: colorFor(l.subjectId) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {l.subjectName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatTimeLabel(l.startTime)} –{" "}
                    {formatTimeLabel(l.endTime)} • {l.room || "—"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuickEditOpen(false);
                    onEditLecture(l);
                  }}
                >
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function MobileLectureCard({
  lecture,
  color,
  settings,
  onEdit,
  onMove,
  onDelete,
}: {
  lecture: Lecture;
  color: string;
  settings: TimetableSettings;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const overlapsBreak = (settings.timeStructure || []).some(
    (b) =>
      b.type === "break" &&
      toMinutes(lecture.startTime) < toMinutes(b.endTime) &&
      toMinutes(lecture.endTime) > toMinutes(b.startTime),
  );
  void overlapsBreak;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 0 3px ${hexToRgba(color, 0.15)}`,
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{lecture.subjectName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatTimeLabel(lecture.startTime)} –{" "}
          {formatTimeLabel(lecture.endTime)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {lecture.teacherName}
          {lecture.room ? ` • ${lecture.room}` : ""}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${lecture.subjectName} options`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem onSelect={onMove}>
            Move to another day
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={onDelete}
          >
            Cancel lecture
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Break card used inline in the day list when a break overlaps the selected day.
export function MobileBreakCard({
  name,
  startTime,
  endTime,
}: {
  name: string;
  startTime: string;
  endTime: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 p-3">
      <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatTimeLabel(startTime)} – {formatTimeLabel(endTime)}
        </p>
      </div>
    </div>
  );
}
