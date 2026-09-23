import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Plus } from "lucide-react";
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
import { useTimetableStore } from "./timetable-store";

export function SubjectPanel({
  onAddSubject,
  onEditSubject,
  onRemoveSubject,
}: {
  onAddSubject: () => void;
  onEditSubject: (s: Subject) => void;
  onRemoveSubject: (s: Subject) => void;
}) {
  const { subjects } = useTimetableStore();

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Subjects</h3>
        <Button size="sm" onClick={onAddSubject} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <div className="p-3 space-y-2 overflow-y-auto max-h-[560px]">
        {subjects.length === 0 && (
          <p className="text-sm text-muted-foreground px-1 py-6 text-center">
            No subjects yet. Add one to start building your timetable.
          </p>
        )}
        {subjects.map((s) => (
          <SubjectCard
            key={s.id}
            subject={s}
            onEdit={() => onEditSubject(s)}
            onRemove={() => onRemoveSubject(s)}
          />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <svg
            className="h-4 w-4 shrink-0 mt-0.5"
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
              Drag and drop subjects into the timetable. Click a scheduled
              lecture to edit details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  onEdit,
  onRemove,
}: {
  subject: Subject;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { duplicateSubject } = useTimetableStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `subject:${subject.id}`,
      data: { kind: "subject", subjectId: subject.id },
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
        "group flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 transition-shadow",
        !isDragging && "hover:shadow-sm",
      )}
    >
      <button
        type="button"
        aria-label={`Drag ${subject.name}`}
        className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{
          backgroundColor: hex,
          boxShadow: `0 0 0 3px ${hexToRgba(hex, 0.15)}`,
        }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {subject.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {subject.teacherName}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-60 group-hover:opacity-100"
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
