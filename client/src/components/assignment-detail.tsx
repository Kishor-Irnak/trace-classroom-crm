import { useState } from "react";
import {
  X,
  Calendar,
  ExternalLink,
  Plus,
  Star,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Assignment, Note } from "@shared/schema";
import { useClassroom } from "@/lib/classroom-context";
import { cn } from "@/lib/utils";

interface AssignmentDetailProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not set";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  return ` at ${timeStr}`;
}

function StatusTimeline({ assignment }: { assignment: Assignment }) {
  const isSubmitted =
    assignment.systemStatus === "submitted" ||
    assignment.systemStatus === "graded" ||
    !!assignment.submittedAt;

  const isGraded =
    assignment.systemStatus === "graded" ||
    !!assignment.gradedAt ||
    assignment.grade !== null;

  const steps = [
    {
      id: "created",
      label: "Created",
      completed: true,
      date: assignment.createdAt,
    },
    {
      id: "submitted",
      label: "Submitted",
      completed: isSubmitted,
      date: assignment.submittedAt,
    },
    {
      id: "graded",
      label:
        assignment.grade !== null
          ? `Graded (${assignment.grade}${
              assignment.maxPoints ? `/${assignment.maxPoints}` : ""
            })`
          : "Graded",
      completed: isGraded,
      date: assignment.gradedAt,
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Status Timeline</h4>
      <div className="relative">
        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3 relative">
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 shrink-0 mt-0.5",
                  step.completed
                    ? "bg-foreground border-foreground"
                    : "bg-background border-muted-foreground"
                )}
              >
                {step.completed && (
                  <CheckCircle className="h-3 w-3 text-background absolute top-0.5 left-0.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm",
                    step.completed ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.date && step.completed && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(step.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteItem({
  note,
  onUpdate,
  onDelete,
}: {
  note: Note;
  onUpdate: (content: string, isImportant: boolean) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = () => {
    onUpdate(editContent, note.isImportant);
    setIsEditing(false);
  };

  return (
    <div className="p-3 rounded-md border space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {note.isImportant && (
            <Star className="h-3.5 w-3.5 fill-current text-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(note.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdate(note.content, !note.isImportant)}
            data-testid={`button-toggle-important-${note.id}`}
          >
            <Star
              className={cn("h-3.5 w-3.5", note.isImportant && "fill-current")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsEditing(!isEditing)}
            data-testid={`button-edit-note-${note.id}`}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={onDelete}
            data-testid={`button-delete-note-${note.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px] text-sm"
            data-testid={`textarea-edit-note-${note.id}`}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              data-testid={`button-save-note-${note.id}`}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
      )}
    </div>
  );
}

export function AssignmentDetail({
  assignment,
  isOpen,
  onClose,
}: AssignmentDetailProps) {
  const { getNotesForAssignment, addNote, updateNote, deleteNote } =
    useClassroom();
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  if (!assignment) return null;

  const notes = getNotesForAssignment(assignment.id);
  const isOverdue = assignment.systemStatus === "overdue";

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      addNote(assignment.id, newNoteContent.trim());
      setNewNoteContent("");
      setIsAddingNote(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[400px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <Badge variant="secondary" className="text-xs mb-2">
                {assignment.courseName}
              </Badge>
              <SheetTitle className="text-lg font-semibold leading-tight">
                {assignment.title}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className={cn(isOverdue && "text-destructive")}>
                {formatDate(assignment.dueDate)}
                {formatTime(assignment.dueTime)}
              </span>
              {isOverdue && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>

            {assignment.maxPoints && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Points:</span>
                {assignment.grade !== null ? (
                  <span className="font-mono font-medium">
                    {assignment.grade} / {assignment.maxPoints}
                  </span>
                ) : (
                  <span className="font-mono">{assignment.maxPoints}</span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {assignment.description && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {assignment.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          <StatusTimeline assignment={assignment} />

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Notes</h4>
              {!isAddingNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingNote(true)}
                  data-testid="button-add-note"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Note
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Notes are private and only visible to you.
            </p>

            {isAddingNote && (
              <div className="space-y-2">
                <Textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Add a note..."
                  className="min-h-[100px] text-sm"
                  data-testid="textarea-new-note"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNoteContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    data-testid="button-save-new-note"
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            )}

            {notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onUpdate={(content, isImportant) =>
                      updateNote(note.id, content, isImportant)
                    }
                    onDelete={() => deleteNote(note.id, assignment.id)}
                  />
                ))}
              </div>
            ) : (
              !isAddingNote && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes yet
                </p>
              )
            )}
          </div>

          {assignment.alternateLink && (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(assignment.alternateLink!, "_blank")}
                data-testid="button-open-classroom"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Classroom
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
