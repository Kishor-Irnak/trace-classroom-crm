import { useState } from "react";
import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssignmentCardCompact } from "@/components/assignment-card";
import { AssignmentDetail } from "@/components/assignment-detail";
import { useClassroom } from "@/lib/classroom-context";
import type { Assignment } from "@shared/schema";

function TimelineSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <Skeleton key={j} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TimelinePage() {
  const { getTimelineGroups, courses, isLoading, assignments, syncClassroom } = useClassroom();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const groups = getTimelineGroups({
    courseId: selectedCourse || undefined,
    status: selectedStatus || undefined,
  });

  const clearFilters = () => {
    setSelectedCourse(null);
    setSelectedStatus(null);
  };

  const hasFilters = selectedCourse || selectedStatus;

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="text-center space-y-2">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-medium">No assignments yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Sync your Google Classroom to see your assignments organized by date.
          </p>
        </div>
        <button
          onClick={syncClassroom}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-sync-empty-timeline"
        >
          Sync Google Classroom
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3 sticky top-0 bg-background py-3 z-10 border-b -mx-6 px-6">
          <Select
            value={selectedCourse || "all"}
            onValueChange={(v) => setSelectedCourse(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-course-filter">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedStatus || "all"}
            onValueChange={(v) => setSelectedStatus(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
              data-testid="button-clear-filters"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {groups.length > 0 ? (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.date} className="space-y-3">
                <h3 className="text-base font-semibold sticky top-[72px] bg-background py-2 z-[5]">
                  {group.dateLabel}
                </h3>
                <div className="space-y-2">
                  {group.assignments.map((assignment) => (
                    <AssignmentCardCompact
                      key={assignment.id}
                      assignment={assignment}
                      onClick={() => setSelectedAssignment(assignment)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Filter className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No assignments match your filters</p>
            {hasFilters && (
              <Button
                variant="link"
                size="sm"
                onClick={clearFilters}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      <AssignmentDetail
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </>
  );
}
