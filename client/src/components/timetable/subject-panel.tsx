import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  CheckCircle2,
  GripVertical,
  Lock,
  MoreVertical,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
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
  colorHex,
  hexToRgba,
  type Subject,
} from "@/services/timetable-service";
import {
  totalWeightage,
  weeklySlotCapacity,
  type SubjectQuota,
} from "@/services/timetable-validation";
import { useTimetableStore } from "./timetable-store";

/* ------------------------------------------------------------------ */
/* Weightage meter: "2 / 4 placed · 2 left"                            */
/* ------------------------------------------------------------------ */
export function QuotaMeter({
  quota,
  color,
  compact = false,
}: {
  quota?: SubjectQuota;
  color: string;
  compact?: boolean;
}) {
  if (!quota) return null;
  const hex = colorHex(color);

  if (quota.status === "unlimited") {
    return (
      <p className="text-[11px] text-muted-foreground">
        {quota.placed} placed · no weekly limit
      </p>
    );
  }

  const pct = Math.min(100, Math.round((quota.placed / quota.weightage) * 100));
  const full = quota.status === "full";
  const over = quota.status === "over";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px]">
        <span className="font-medium tabular-nums text-foreground">
          {quota.placed} / {quota.weightage} placed
        </span>
        {over ? (
          <span className="flex items-center gap-1 font-medium text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {quota.placed - quota.weightage} over
          </span>
        ) : full ? (
          <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </span>
        ) : (
          <span className="font-medium tabular-nums" style={{ color: hex }}>
            {quota.remaining} left
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={quota.weightage}
        aria-valuenow={quota.placed}
        aria-label={`${quota.placed} of ${quota.weightage} lectures placed`}
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          compact ? "h-1" : "h-1.5"
        )}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: over
              ? "hsl(var(--destructive))"
              : full
                ? "#22c55e"
                : hex,
          }}
        />
      </div>
    </div>
  );
}

export function SubjectPanel({
  onAddSubject,
  onEditSubject,
  onRemoveSubject,
  onBulkWeightage,
}: {
  onAddSubject: () => void;
  onEditSubject: (s: Subject) => void;
  onRemoveSubject: (s: Subject) => void;
  onBulkWeightage: () => void;
}) {
  const { subjects, quotas, settings } = useTimetableStore();

  const limited = subjects.filter((s) => (quotas[s.id]?.weightage ?? 0) > 0);
  const requested = totalWeightage(subjects);
  const placedOfLimited = limited.reduce(
    (sum, s) => sum + (quotas[s.id]?.placed ?? 0),
    0
  );
  const left = Math.max(0, requested - placedOfLimited);
  const capacity = weeklySlotCapacity(settings);
  const overCapacity = capacity > 0 && requested > capacity;
  const pct = requested > 0 ? Math.min(100, Math.round((placedOfLimited / requested) * 100)) : 0;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Subjects</h3>
        <div className="flex items-center gap-1.5">
          {subjects.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkWeightage}
              className="gap-1.5 px-2.5"
              title="Set the same weightage for every subject"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Weightage</span>
            </Button>
          )}
          <Button size="sm" onClick={onAddSubject} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Subject
          </Button>
        </div>
      </div>

      {requested > 0 && (
        <div className="space-y-1.5 border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Weekly progress</span>
            <span className="tabular-nums text-muted-foreground">
              {placedOfLimited} / {requested} placed
              {left > 0 ? ` · ${left} left` : " · all placed"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {overCapacity && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              Subjects need {requested} lectures but the timetable only has{" "}
              {capacity} slots per week.
            </p>
          )}
        </div>
      )}

      <div className="max-h-[560px] space-y-2 overflow-y-auto p-3">
        {subjects.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            No subjects yet. Add one to start building your timetable.
          </p>
        )}
        {subjects.map((s) => (
          <SubjectCard
            key={s.id}
            subject={s}
            quota={quotas[s.id]}
            onEdit={() => onEditSubject(s)}
            onRemove={() => onRemoveSubject(s)}
          />
        ))}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
          </svg>
          <div>
            <p className="font-medium text-foreground">Tip</p>
            <p>
              Drag a subject into the timetable. Red cells are blocked (teacher
              busy, slot taken); amber cells ask you to confirm first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  quota,
  onEdit,
  onRemove,
}: {
  subject: Subject;
  quota?: SubjectQuota;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { duplicateSubject } = useTimetableStore();
  const exhausted = quota?.status === "full" || quota?.status === "over";
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `subject:${subject.id}`,
      data: { kind: "subject", subjectId: subject.id },
      disabled: exhausted,
    });

  const hex = colorHex(subject.color);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        "group flex items-start gap-2 rounded-lg border border-border bg-background px-2.5 py-2 transition-shadow",
        !isDragging && !exhausted && "hover:shadow-sm",
        exhausted && "bg-muted/40"
      )}
    >
      <button
        type="button"
        aria-label={
          exhausted
            ? `${subject.name} — all lectures placed`
            : `Drag ${subject.name}`
        }
        disabled={exhausted}
        title={
          exhausted
            ? "All weekly lectures are placed. Raise the weightage to add more."
            : "Drag into the timetable"
        }
        className={cn(
          "mt-0.5 touch-none text-muted-foreground",
          exhausted ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing"
        )}
        {...listeners}
        {...attributes}
      >
        {exhausted ? <Lock className="h-4 w-4" /> : <GripVertical className="h-4 w-4" />}
      </button>

      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full"
        style={{
          backgroundColor: hex,
          boxShadow: `0 0 0 3px ${hexToRgba(hex, 0.15)}`,
        }}
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div>
          <p className="truncate text-sm font-medium leading-tight">
            {subject.name || "Untitled Subject"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {subject.teacherName}
          </p>
        </div>
        <QuotaMeter quota={quota} color={subject.color} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-60 group-hover:opacity-100"
            aria-label={`${subject.name} options`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>Edit Subject</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateSubject(subject.id)}>
            Duplicate Subject
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={onRemove}
          >
            Remove Subject
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
