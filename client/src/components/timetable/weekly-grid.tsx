import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, MoreVertical, Plus, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  buildTimeLabels,
  colorHex,
  DAY_NAMES,
  formatTimeShort,
  hexToRgba,
  toMinutes,
  type Lecture,
  type Subject,
  type TimetableSettings,
  type TimeBlock,
} from "@/services/timetable-service";

/** How a cell reacts while something is being dragged. */
export interface CellStatus {
  level: "ok" | "warn" | "blocked";
  /** Short reason, e.g. "Teacher busy". */
  reason?: string;
}

interface GridProps {
  settings: TimetableSettings;
  lectures: Lecture[];
  subjects: Subject[];
  onEdit: (l: Lecture) => void;
  onDuplicate: (l: Lecture) => void;
  onMove: (l: Lecture) => void;
  onDelete: (l: Lecture) => void;
  onQuickAdd: (day: number, start: string) => void;
  /** Lecture ids that currently have a scheduling conflict. */
  conflictIds?: Set<string>;
  /** Keyed `${day}:${start}`; only set while dragging. */
  cellStatus?: Record<string, CellStatus> | null;
}

const PIXELS_PER_MINUTE = 1.5;

export function WeeklyGrid({
  settings,
  lectures,
  subjects,
  onEdit,
  onDuplicate,
  onMove,
  onDelete,
  onQuickAdd,
  conflictIds,
  cellStatus,
}: GridProps) {
  const days = [...settings.workingDays].sort((a, b) => a - b);
  const startMins = toMinutes(settings.startTime);
  const endMins = toMinutes(settings.endTime);
  const totalMins = endMins - startMins;
  const gridHeight = Math.max(0, totalMins * PIXELS_PER_MINUTE);

  const timeLabels = buildTimeLabels(settings).filter(
    (t) => toMinutes(t) >= startMins && toMinutes(t) <= endMins
  );

  const subjectColor = (subjectId: string) =>
    colorHex(subjects.find((s) => s.id === subjectId)?.color || "blue");

  // Map lectures to day strings to easily render them inside day columns
  const lecturesByDay: Record<number, Lecture[]> = {};
  for (const d of days) lecturesByDay[d] = [];
  for (const l of lectures) {
    if (lecturesByDay[l.dayOfWeek]) lecturesByDay[l.dayOfWeek].push(l);
  }

  // Pre-calculate occupied times per day to hide the "+ Add" button
  const isOccupied = (day: number, blockStart: string, blockEnd: string) => {
    const s = toMinutes(blockStart);
    const e = toMinutes(blockEnd);
    return lecturesByDay[day].some((l) => {
      const ls = toMinutes(l.startTime);
      const le = toMinutes(l.endTime);
      return s < le && e > ls;
    });
  };

  const gridTemplate = `64px repeat(${days.length}, minmax(120px, 1fr))`;

  return (
    <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm" style={{ maxHeight: "calc(100vh - 200px)" }}>
      <div
        className="grid min-w-[600px]"
        style={{
          gridTemplateColumns: gridTemplate,
          gridTemplateRows: `44px 1fr`,
        }}
      >
        {/* Header row */}
        <div className="sticky left-0 top-0 z-40 flex items-center justify-center border-b border-r border-border bg-card text-xs font-semibold text-muted-foreground">
          Time
        </div>
        {days.map((d) => (
          <div
            key={`h-${d}`}
            className="sticky top-0 z-30 flex items-center justify-center border-b border-border bg-card text-sm font-semibold"
          >
            {DAY_NAMES[d]}
          </div>
        ))}

        {/* Body Container */}
        <div className="relative border-r border-border bg-muted/20 overflow-hidden" style={{ height: gridHeight }}>
          {/* Time axis labels */}
          {timeLabels.map((time) => {
            const top = (toMinutes(time) - startMins) * PIXELS_PER_MINUTE;
            return (
              <div
                key={`label-${time}`}
                className="absolute w-full px-2 text-right text-[11px] font-medium text-muted-foreground"
                style={{ top: top - 8 }} // shift up slightly to center on line
              >
                {formatTimeShort(time)}
              </div>
            );
          })}
        </div>

        {/* Day Columns */}
        {days.map((d) => (
          <div key={`col-${d}`} className="relative border-r border-border bg-card overflow-hidden" style={{ height: gridHeight }}>
            {/* Horizontal grid lines for structure blocks */}
            {(settings.timeStructure || []).map((b) => {
              const top = (toMinutes(b.startTime) - startMins) * PIXELS_PER_MINUTE;
              const h = (toMinutes(b.endTime) - toMinutes(b.startTime)) * PIXELS_PER_MINUTE;
              return (
                <div
                  key={`line-${b.id}`}
                  className="absolute w-full border-t border-border/50 pointer-events-none"
                  style={{ top, height: h }}
                />
              );
            })}

            {/* Droppable areas from timeStructure */}
            {(settings.timeStructure || []).map((b) => {
              const top = (toMinutes(b.startTime) - startMins) * PIXELS_PER_MINUTE;
              const height = (toMinutes(b.endTime) - toMinutes(b.startTime)) * PIXELS_PER_MINUTE;

              if (b.type === "break") {
                // Break block
                return (
                  <div
                    key={`break-${d}-${b.id}`}
                    className="absolute w-full flex items-center justify-center gap-2 bg-muted/70 border-y border-border/50 text-xs font-medium text-muted-foreground z-10"
                    style={{ top, height }}
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    <span className="truncate">{b.name}</span>
                  </div>
                );
              } else {
                // Lecture slot (droppable)
                const occupied = isOccupied(d, b.startTime, b.endTime);
                return (
                  <SlotCell
                    key={`slot-${d}-${b.id}`}
                    day={d}
                    start={b.startTime}
                    end={b.endTime}
                    top={top}
                    height={height}
                    invisible={occupied}
                    status={cellStatus?.[`${d}:${b.startTime}`]}
                    onQuickAdd={onQuickAdd}
                  />
                );
              }
            })}

            {/* Render actual lectures absolute positioned */}
            {lecturesByDay[d].map((l) => {
              const top = (toMinutes(l.startTime) - startMins) * PIXELS_PER_MINUTE;
              const height = (toMinutes(l.endTime) - toMinutes(l.startTime)) * PIXELS_PER_MINUTE;
              return (
                <LectureCard
                  key={l.id}
                  lecture={l}
                  color={subjectColor(l.subjectId)}
                  top={top}
                  height={height}
                  conflict={conflictIds?.has(l.id)}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onMove={onMove}
                  onDelete={onDelete}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotCell({
  day,
  start,
  end,
  top,
  height,
  invisible,
  status,
  onQuickAdd,
}: {
  day: number;
  start: string;
  end: string;
  top: number;
  height: number;
  invisible?: boolean;
  status?: CellStatus;
  onQuickAdd: (day: number, start: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${day}:${start}`,
    data: { kind: "cell", day, start, end },
  });

  const blocked = status?.level === "blocked";
  const warn = status?.level === "warn";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute w-full p-1 transition-colors z-[5]",
        warn && "bg-amber-500/10 ring-1 ring-inset ring-amber-500/40",
        blocked && "bg-destructive/10 ring-1 ring-inset ring-destructive/30",
        status?.level === "ok" && "bg-emerald-500/5",
        isOver && !blocked && !warn && "bg-primary/10 ring-2 ring-inset ring-primary/40 z-20",
        isOver && warn && "bg-amber-500/20 ring-2 ring-inset ring-amber-500 z-20",
        isOver && blocked && "bg-destructive/20 ring-2 ring-inset ring-destructive z-20"
      )}
      style={{ top, height }}
    >
      {status && !invisible && status.level !== "ok" && (
        <div
          className={cn(
            "pointer-events-none flex h-full w-full items-center justify-center gap-1 text-center text-[10px] font-medium leading-tight",
            blocked ? "text-destructive" : "text-amber-600 dark:text-amber-400"
          )}
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="truncate">{status.reason}</span>
        </div>
      )}
      {!invisible && !status && (
        <button
          type="button"
          onClick={() => onQuickAdd(day, start)}
          className="flex h-full w-full items-center justify-center rounded-md text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-muted/50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Add lecture ${DAY_NAMES[day]} ${start}`}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </button>
      )}
    </div>
  );
}

function LectureCard({
  lecture,
  color,
  top,
  height,
  conflict,
  onEdit,
  onDuplicate,
  onMove,
  onDelete,
}: {
  lecture: Lecture;
  color: string;
  top: number;
  height: number;
  conflict?: boolean;
  onEdit: (l: Lecture) => void;
  onDuplicate: (l: Lecture) => void;
  onMove: (l: Lecture) => void;
  onDelete: (l: Lecture) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `lecture:${lecture.id}`,
      data: { kind: "lecture", lectureId: lecture.id },
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        top,
        height,
        borderLeftColor: color,
        backgroundColor: hexToRgba(color, 0.1),
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 40 : 20,
      }}
      className={cn(
        "absolute left-0.5 right-0.5 overflow-hidden rounded-md border border-transparent border-l-[3px] p-1.5 text-left shadow-sm transition-shadow hover:shadow-md",
        conflict && "border-destructive ring-2 ring-destructive/60"
      )}
      title={conflict ? "This lecture has a scheduling conflict" : undefined}
    >
      <div
        {...listeners}
        {...attributes}
        role="button"
        tabIndex={0}
        onClick={() => onEdit(lecture)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit(lecture);
          }
        }}
        className="h-full w-full cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        aria-label={`${lecture.subjectName}, edit`}
      >
        <p className="flex items-center gap-1 truncate text-xs font-semibold leading-tight text-foreground">
          {conflict && <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />}
          <span className="truncate">{lecture.subjectName || "Untitled Subject"}</span>
        </p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          {lecture.teacherName}
        </p>
        {lecture.room && (
          <p className="truncate text-[10px] leading-tight text-muted-foreground/80">
            {lecture.room}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-0.5 h-5 w-5 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
            style={{ opacity: undefined }}
            aria-label={`${lecture.subjectName} options`}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(lecture)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDuplicate(lecture)}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onMove(lecture)}>
            Move
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete(lecture)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
