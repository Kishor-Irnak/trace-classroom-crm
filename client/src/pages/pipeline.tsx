import { useState, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentCard } from "@/components/assignment-card";
import { AssignmentDetail } from "@/components/assignment-detail";
import { useClassroom } from "@/lib/classroom-context";
import type { Assignment, AssignmentStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

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
        <SortableContext items={assignments.map(a => a.id)} strategy={verticalListSortingStrategy}>
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

function PipelineSkeleton() {
  return (
    <div className="flex gap-4 h-full overflow-x-auto p-6">
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

export default function PipelinePage() {
  const { getPipelineColumns, updateAssignmentStatus, isLoading, notes, assignments, syncClassroom } = useClassroom();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const columns = getPipelineColumns();
  const activeAssignment = activeId ? assignments.find(a => a.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const assignmentId = active.id as string;
    const targetColumnId = over.id as AssignmentStatus;

    if (["backlog", "in_progress", "submitted", "graded", "overdue"].includes(targetColumnId)) {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment && assignment.systemStatus !== targetColumnId) {
        if (targetColumnId === "in_progress") {
          updateAssignmentStatus(assignmentId, "in_progress");
        } else {
          updateAssignmentStatus(assignmentId, "backlog");
        }
      }
    }
  };

  if (isLoading) {
    return <PipelineSkeleton />;
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-medium">No assignments yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Sync your Google Classroom to see your assignments organized in a Kanban-style board.
          </p>
        </div>
        <button
          onClick={syncClassroom}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-sync-empty"
        >
          Sync Google Classroom
        </button>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full overflow-x-auto p-6">
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
