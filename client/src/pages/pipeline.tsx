import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentCard } from "@/components/assignment-card";
import { AssignmentDetail } from "@/components/assignment-detail";
import { useClassroom } from "@/lib/classroom-context";
import type { Assignment, AssignmentStatus } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Lightbulb, Loader2, AlertCircle, MousePointer } from "lucide-react"; // Added Icons
import { useAuth } from "@/lib/auth-context";
import { TokenRefreshPrompt } from "@/components/token-refresh-prompt";

// --- Loading Data & Components ---

const LOADING_TIPS = [
  "Drag and drop assignments between columns to update their status.",
  "Trace automatically syncs changes with your Google Classroom.",
  "Click on any assignment card to view details and add private notes.",
  "Use the Timeline view to visualize deadlines chronologically.",
  "Keep your 'In Progress' column manageable for better focus.",
  "Assignments marked as 'Done' in Classroom appear in the Completed column.",
];

function PipelineColumn({
  id,
  title,
  assignments,
  onCardClick,
  notes,
}: {
  id: AssignmentStatus;
  title: string;
  assignments: Assignment[];
  onCardClick: (assignment: Assignment) => void;
  notes: Map<string, unknown[]>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] w-[280px] h-full",
        isOver && "bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between gap-2 p-3 sticky top-0 bg-background z-10 border-b">
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge variant="secondary" className="text-xs font-mono">
          {assignments.length}
        </Badge>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        <SortableContext
          items={assignments.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onClick={() => onCardClick(assignment)}
                hasNotes={(notes.get(assignment.id)?.length || 0) > 0}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border border-dashed rounded-md">
              No assignments
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// Background Skeleton Structure
function PipelineSkeleton() {
  return (
    <div className="flex gap-4 h-full overflow-x-auto p-6 opacity-40 pointer-events-none select-none filter grayscale">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col min-w-[280px] w-[280px]">
          <div className="flex items-center justify-between p-3 border-b">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-32 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// New Enhanced Loading Screen
function EnhancedLoadingScreen() {
  const [progress, setProgress] = useState(10);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // Increment progress bar to simulate loading
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) return 100;
        const diff = Math.random() * 10;
        return Math.min(oldProgress + diff, 90); // Stall at 90% until real data loads
      });
    }, 500);

    // Rotate tips every 2.5 seconds
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(tipTimer);
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-background overflow-hidden">
      {/* Background Structure (Blurred) */}
      <PipelineSkeleton />

      {/* Foreground Overlay */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
        <div className="w-full max-w-md p-6 space-y-6">
          {/* Logo / Header */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 bg-zinc-950 rounded flex items-center justify-center text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Syncing Workspace
            </h2>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-950 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
              <span>Retrieving Assignments</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Tips Section */}
          <div className="flex gap-3 items-start bg-white border border-zinc-200 p-4 rounded-md shadow-sm max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Lightbulb className="h-4 w-4 text-zinc-900 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                Did you know?
              </span>
              <p className="text-xs text-zinc-500 leading-relaxed min-h-[40px]">
                {LOADING_TIPS[tipIndex]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function PipelinePage() {
  const {
    getPipelineColumns,
    updateAssignmentStatus,
    isLoading,
    isSyncing,
    notes,
    assignments,
    syncClassroom,
    error,
  } = useClassroom();
  const { signOut } = useAuth();
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Check if there's a token-related error
  if (error && error.toLowerCase().includes("session")) {
    const hasData = assignments.length > 0;
    if (!hasData) {
      return <TokenRefreshPrompt />;
    }
  }

  if (isLoading) {
    return <PipelineSkeleton />;
  }

  // Drag scroll functionality (from timeline)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, left: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const columns = getPipelineColumns();
  const activeAssignment = activeId
    ? assignments.find((a) => a.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const assignmentId = active.id as string;
    const targetColumnId = over.id as AssignmentStatus;

    if (
      ["backlog", "in_progress", "submitted", "graded", "overdue"].includes(
        targetColumnId
      )
    ) {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (assignment && assignment.systemStatus !== targetColumnId) {
        if (targetColumnId === "in_progress") {
          updateAssignmentStatus(assignmentId, "in_progress");
        } else {
          updateAssignmentStatus(assignmentId, "backlog");
        }
      }
    }
  };

  // Drag scroll handlers (from timeline)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 && scrollContainerRef.current) {
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = {
        x: e.pageX,
        left: scrollContainerRef.current.scrollLeft,
      };
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !scrollContainerRef.current) return;
      e.preventDefault();
      const x = e.pageX;
      const walk = (x - dragStart.current.x) * 1.5;
      scrollContainerRef.current.scrollLeft = dragStart.current.left - walk;
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <>
      {error && error.toLowerCase().includes("session") && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-3 shrink-0">
          <div className="flex items-center justify-between gap-4 max-w-full">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              <span>
                Sync is paused. Cached data is shown. Sign in to update.
              </span>
            </div>
            <a
              href="/auth/refresh"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                Reconnect
              </Button>
            </a>
          </div>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="relative h-full flex flex-col">
          <div
            ref={scrollContainerRef}
            className={cn(
              "flex gap-4 flex-1 overflow-x-auto p-6 pb-0 select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => e.preventDefault()}
          >
            {columns.map((column) => (
              <PipelineColumn
                key={column.id}
                id={column.id}
                title={column.title}
                assignments={column.assignments}
                onCardClick={setSelectedAssignment}
                notes={notes}
              />
            ))}
          </div>

          {/* Tip UI (exact copy from timeline) */}
          <div className="flex-none p-2 border-t bg-background/70 backdrop-blur-sm flex items-center justify-center text-xs text-muted-foreground font-medium z-30 relative">
            <MousePointer size={14} className="mr-2" />
            Tip: Hold{" "}
            <kbd className="mx-1 px-1 py-0.5 rounded-md bg-muted border text-foreground font-bold text-[10px]">
              Right Click
            </kbd>{" "}
            to drag timeline
          </div>
        </div>

        <DragOverlay>
          {activeAssignment && (
            <AssignmentCard
              assignment={activeAssignment}
              isDragging
              hasNotes={(notes.get(activeAssignment.id)?.length || 0) > 0}
            />
          )}
        </DragOverlay>
      </DndContext>

      <AssignmentDetail
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </>
  );
}
