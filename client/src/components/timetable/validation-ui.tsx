import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DAY_SHORT,
  buildContextKey,
  formatTimeLabel,
  type Lecture,
} from "@/services/timetable-service";
import type {
  PlacementIssue,
  PlacementResult,
} from "@/services/timetable-validation";
import { useTimetableStore } from "./timetable-store";

/* ------------------------------------------------------------------ */
/* Blocking / confirmation dialog                                      */
/* ------------------------------------------------------------------ */

/**
 * Single dialog for every scheduling problem:
 *  - "blocked"  → the action is impossible (teacher busy, quota used up…)
 *  - "confirm"  → the action is allowed but must be intentional
 *                 (back-to-back lectures, room double-booked…)
 */
export function IssueDialog() {
  const { pendingIssue, resolvePendingIssue } = useTimetableStore();
  const open = !!pendingIssue;
  const blocked = pendingIssue?.kind === "blocked";
  const issues = pendingIssue?.issues ?? [];

  const headline =
    pendingIssue?.title ??
    (blocked
      ? issues.length === 1
        ? issues[0].title
        : "This can't be scheduled"
      : issues.length === 1
        ? issues[0].title
        : "Please confirm before placing");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resolvePendingIssue(false);
      }}
    >
      <AlertDialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-hidden p-0 sm:rounded-xl">
        <div className="flex max-h-[90vh] flex-col">
          <AlertDialogHeader className="space-y-3 p-5 pb-3 text-left sm:text-left">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  blocked
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                )}
              >
                {blocked ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base leading-snug">
                  {headline}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-sm">
                  {blocked
                    ? "Nothing was changed. Fix the issue below and try again."
                    : "This was flagged on purpose so it can't happen by mistake. Continue only if you really want it."}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4">
            {issues.map((issue, i) => (
              <IssueCard key={`${issue.code}-${i}`} issue={issue} blocked={blocked} showTitle={issues.length > 1 || !!pendingIssue?.title} />
            ))}
          </div>

          <AlertDialogFooter className="gap-2 border-t border-border bg-muted/30 p-4 sm:justify-end">
            {blocked ? (
              <AlertDialogAction onClick={() => resolvePendingIssue(false)}>
                Got it
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel
                  className="mt-0"
                  onClick={() => resolvePendingIssue(false)}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => resolvePendingIssue(true)}>
                  {pendingIssue?.confirmLabel ?? "Yes, continue"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function IssueCard({
  issue,
  blocked,
  showTitle,
}: {
  issue: PlacementIssue;
  blocked: boolean;
  showTitle: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        blocked
          ? "border-destructive/30 bg-destructive/5"
          : "border-amber-500/30 bg-amber-500/10"
      )}
    >
      {showTitle && <p className="mb-0.5 font-semibold">{issue.title}</p>}
      <p className="leading-relaxed text-muted-foreground">{issue.message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline live hint (shown inside dialogs before the user clicks save) */
/* ------------------------------------------------------------------ */

export function PlacementHint({ result }: { result: PlacementResult | null }) {
  if (!result) return null;
  const { errors, warnings } = result;
  if (errors.length === 0 && warnings.length === 0) return null;
  const isError = errors.length > 0;
  const list = isError ? errors : warnings;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex gap-2 rounded-lg border p-3 text-xs sm:col-span-2",
        isError
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      )}
    >
      {isError ? (
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="min-w-0 space-y-1">
        {list.slice(0, 2).map((i, idx) => (
          <p key={idx} className="leading-relaxed">
            {i.message}
          </p>
        ))}
        {!isError && (
          <p className="font-medium">You'll be asked to confirm when you save.</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Conflict banner (conflicts that exist in the saved/edited timetable) */
/* ------------------------------------------------------------------ */

export function ConflictBanner({
  onEdit,
}: {
  onEdit?: (l: Lecture) => void;
}) {
  const { conflicts } = useTimetableStore();
  const [open, setOpen] = useState(false);
  if (conflicts.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:p-4"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-destructive">
            {conflicts.length} scheduling conflict
            {conflicts.length > 1 ? "s" : ""} need attention
          </span>
          <span className="block text-xs text-muted-foreground">
            Highlighted in red on the timetable. Publishing is disabled until
            they are fixed.
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {conflicts.slice(0, 20).map((c, i) => (
            <li
              key={`${c.lectureId}-${i}`}
              className="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-background p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {c.lecture.subjectName} · {DAY_SHORT[c.lecture.dayOfWeek]}{" "}
                  {formatTimeLabel(c.lecture.startTime)}
                </p>
                <p className="mt-0.5 text-muted-foreground">{c.issue.message}</p>
              </div>
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => onEdit(c.lecture)}
                >
                  Fix
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cross-class checking status                                         */
/* ------------------------------------------------------------------ */

export function OthersStatusBanner() {
  const { othersStatus, otherTimetables, context, refreshOthers } =
    useTimetableStore();
  const [retrying, setRetrying] = useState(false);

  if (othersStatus === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200 sm:text-sm">
            Couldn't load your other class timetables, so teacher clashes with
            other years / divisions can't be checked right now.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-2"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            await refreshOthers();
            setRetrying(false);
          }}
        >
          {retrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Retry
        </Button>
      </div>
    );
  }

  if (othersStatus !== "ready") return null;

  const currentId = buildContextKey(context);
  const count = otherTimetables.filter(
    (t) => t.id !== currentId && (t.lectures?.length ?? 0) > 0
  ).length;

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      {count > 0
        ? `Teacher availability is checked against ${count} other class${count > 1 ? "es" : ""}.`
        : "No other classes saved yet — teacher clashes will be checked once you save more timetables."}
    </p>
  );
}
