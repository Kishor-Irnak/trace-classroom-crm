import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import type { Subject } from "@/services/timetable-service";
import { useTimetableStore } from "./timetable-store";

export function PublishConfirmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { context, publish, conflicts, subjects, quotas, lectures } =
    useTimetableStore();
  const [busy, setBusy] = useState(false);

  const shortfalls = subjects
    .map((s) => ({ s, q: quotas[s.id] }))
    .filter((x) => x.q && x.q.status === "open");
  const empty = lectures.length === 0;
  const blocked = empty || conflicts.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Publish Timetable?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>You are about to publish the timetable for:</p>
              <ul className="mt-3 space-y-1 font-medium text-foreground">
                <li>{context.department}</li>
                <li>{context.year}</li>
                <li>Division {context.division}</li>
                <li>Semester {context.semester}</li>
              </ul>

              {/* Pre-flight checks */}
              <div className="mt-4 space-y-2 text-sm">
                {empty && (
                  <Check tone="error" icon={ShieldAlert}>
                    The timetable has no lectures yet.
                  </Check>
                )}
                {conflicts.length > 0 && (
                  <Check tone="error" icon={ShieldAlert}>
                    {conflicts.length} scheduling conflict
                    {conflicts.length > 1 ? "s" : ""} must be fixed first (highlighted
                    in red on the timetable).
                  </Check>
                )}
                {shortfalls.length > 0 && (
                  <Check tone="warn" icon={AlertTriangle}>
                    Weightage not fully scheduled:{" "}
                    {shortfalls
                      .map((x) => `${x.s.name} (${x.q!.remaining} left)`)
                      .join(", ")}
                    .
                  </Check>
                )}
                {!blocked && shortfalls.length === 0 && (
                  <Check tone="ok" icon={CheckCircle2}>
                    No conflicts found{subjects.some((s) => quotas[s.id]?.weightage) ? " and every weightage is fully scheduled" : ""}.
                  </Check>
                )}
              </div>

              <p className="mt-3">
                Students will eventually receive this timetable when student
                synchronization is enabled.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={blocked || busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await publish();
              } finally {
                setBusy(false);
                onOpenChange(false);
              }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {shortfalls.length > 0 ? "Publish anyway" : "Publish Timetable"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Check({
  tone,
  icon: Icon,
  children,
}: {
  tone: "ok" | "warn" | "error";
  icon: typeof AlertTriangle;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-2.5 text-xs sm:text-sm",
        tone === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
        tone === "warn" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "ok" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function ClearAllConfirmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { clearAllLectures } = useTimetableStore();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all lectures?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every scheduled lecture from the weekly grid. Your
            subjects are kept. This can be undone by not saving, but the change
            is immediate.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              clearAllLectures();
              onOpenChange(false);
            }}
          >
            Clear All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RemoveSubjectConfirmDialog({
  subject,
  onOpenChange,
}: {
  subject: Subject | null;
  onOpenChange: (o: boolean) => void;
}) {
  const { removeSubject, lectures } = useTimetableStore();
  const scheduled = subject
    ? lectures.filter((l) => l.subjectId === subject.id).length
    : 0;
  return (
    <AlertDialog
      open={!!subject}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove subject?</AlertDialogTitle>
          <AlertDialogDescription>
            Removing <span className="font-semibold">{subject?.name}</span> will
            also delete {scheduled > 0 ? `its ${scheduled} scheduled lecture${scheduled > 1 ? "s" : ""}` : "every lecture scheduled from it"}.
            You can bring it back with Undo until you leave this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (subject) removeSubject(subject.id);
              onOpenChange(false);
            }}
          >
            Remove Subject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UnsavedChangesDialog() {
  const { resolvePendingContext } = useTimetableStore();
  return (
    <AlertDialog
      open={true}
      onOpenChange={(o) => {
        if (!o) resolvePendingContext("stay");
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Changing the class context will load a different timetable. Would
            you like to save your current changes first?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
          <AlertDialogCancel onClick={() => resolvePendingContext("stay")}>
            Stay
          </AlertDialogCancel>
          <div className="flex gap-2">
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => resolvePendingContext("discard")}
            >
              Leave without saving
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => resolvePendingContext("saveAndLeave")}
            >
              Save Draft
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
