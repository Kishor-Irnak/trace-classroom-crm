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
import type { Subject } from "@/services/timetable-service";
import { useTimetableStore } from "./timetable-store";

export function PublishConfirmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { context, publish } = useTimetableStore();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
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
              <p className="mt-3">
                Students will eventually receive this timetable when student
                synchronization is enabled.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await publish();
              onOpenChange(false);
            }}
          >
            Publish Timetable
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
  const { removeSubject } = useTimetableStore();
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
            also delete every lecture scheduled from it. This cannot be undone
            once saved.
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
