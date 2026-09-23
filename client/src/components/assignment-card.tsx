import {
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Assignment } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useClassroom, getTextColor } from "@/lib/classroom-context";

interface AssignmentCardProps {
  assignment: Assignment;
  onClick?: () => void;
  hasNotes?: boolean;
  isDragging?: boolean;
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "No due date";

  const date = new Date(dueDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateStr = date.toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  if (dateStr === todayStr) return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

export function AssignmentCard({
  assignment,
  onClick,
  hasNotes,
}: AssignmentCardProps) {
  const { courses } = useClassroom();

  const daysUntil = getDaysUntilDue(assignment.dueDate);
  const isUrgent = daysUntil !== null && daysUntil <= 1 && daysUntil >= 0;
  const isOverdue =
    assignment.systemStatus === "overdue" ||
    (daysUntil !== null && daysUntil < 0);

  // Find the course color
  const course = courses.find((c) => c.id === assignment.courseId);
  const courseColor = course?.color;

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all duration-200 hover-elevate group",
        isOverdue && "border-destructive/30"
      )}
      onClick={onClick}
      data-testid={`card-assignment-${assignment.id}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium truncate max-w-[180px] border-0"
                  style={{
                    backgroundColor: courseColor || undefined,
                    color: courseColor ? getTextColor(courseColor) : undefined,
                  }}
                >
                  {assignment.courseName}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{assignment.courseName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <h3 className="text-sm font-medium leading-snug line-clamp-2">
          {assignment.title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span
            className={cn(
              isOverdue && "text-destructive",
              isUrgent && !isOverdue && "text-foreground font-medium"
            )}
          >
            {formatDueDate(assignment.dueDate)}
          </span>
          {isOverdue && (
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          {isUrgent && !isOverdue && (
            <Clock className="h-3.5 w-3.5 text-foreground" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {assignment.systemStatus === "graded" &&
              assignment.grade !== null && (
                <div className="flex items-center gap-1 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">
                    {assignment.grade}/{assignment.maxPoints}
                  </span>
                </div>
              )}
            {assignment.systemStatus === "submitted" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Submitted</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasNotes && (
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function AssignmentCardCompact({
  assignment,
  onClick,
}: {
  assignment: Assignment;
  onClick?: () => void;
}) {
  const daysUntil = getDaysUntilDue(assignment.dueDate);
  const isOverdue =
    assignment.systemStatus === "overdue" ||
    (daysUntil !== null && daysUntil < 0);
  const isUrgent = daysUntil !== null && daysUntil <= 1 && daysUntil >= 0;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-md border hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`card-assignment-compact-${assignment.id}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{assignment.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {assignment.courseName}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs shrink-0">
        <span
          className={cn(
            "text-muted-foreground",
            isOverdue && "text-destructive",
            isUrgent && !isOverdue && "font-medium text-foreground"
          )}
        >
          {formatDueDate(assignment.dueDate)}
        </span>
        {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
      </div>
    </div>
  );
}
