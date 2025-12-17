import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Calendar, Filter, X, CalendarDays, MousePointer, ArrowDown } from "lucide-react";
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
import { AssignmentDetail } from "@/components/assignment-detail";
import { useClassroom } from "@/lib/classroom-context";
import type { Assignment } from "@shared/schema";
import { cn } from "@/lib/utils";

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

// Status configuration for visual styling
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    border: string;
    timelineStyle: string;
  }
> = {
  backlog: {
    label: "Backlog",
    color: "bg-slate-100",
    border: "border-slate-200",
    timelineStyle: "bg-slate-100 border-slate-300 text-slate-700",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-50 text-blue-700",
    border: "border-blue-100",
    timelineStyle: "bg-blue-100 border-blue-300 text-blue-800",
  },
  submitted: {
    label: "Submitted",
    color: "bg-purple-50 text-purple-700",
    border: "border-purple-100",
    timelineStyle: "bg-purple-100 border-purple-300 text-purple-800",
  },
  graded: {
    label: "Graded",
    color: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-100",
    timelineStyle: "bg-emerald-100 border-emerald-300 text-emerald-800",
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-50 text-red-700",
    border: "border-red-100",
    timelineStyle: "bg-red-100 border-red-300 text-red-800",
  },
};

// Helper functions
const getDaysArray = (start: Date, end: Date) => {
  const arr = [];
  const dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
};

const getMonthsArray = (start: Date, end: Date) => {
  const months = [];
  const d = new Date(start);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setDate(1);
  endDate.setHours(0, 0, 0, 0);
  while (d <= endDate) {
    months.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return months;
};

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function TimelinePage() {
  const { getTimelineGroups, courses, isLoading, assignments, syncClassroom } = useClassroom();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [currentView, setCurrentView] = useState<"timeline" | "calendar">("timeline");

  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];
    if (selectedCourse) {
      filtered = filtered.filter((a) => a.courseId === selectedCourse);
    }
    if (selectedStatus) {
      filtered = filtered.filter((a) => a.systemStatus === selectedStatus);
    }
    return filtered;
  }, [assignments, selectedCourse, selectedStatus]);

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

  // Timeline View Component
  const TimelineView = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, left: 0 });
    const dayWidth = 60;

    const { earliestDate, latestDate, initialScrollPosition } = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let minDate = new Date();
      let maxDate = new Date();

      if (filteredAssignments.length > 0) {
        const datesWithDueDates = filteredAssignments
          .filter((a) => a.dueDate)
          .map((a) => new Date(a.dueDate!));
        
        if (datesWithDueDates.length > 0) {
          minDate = new Date(Math.min(...datesWithDueDates.map((d) => d.getTime())));
          maxDate = new Date(Math.max(...datesWithDueDates.map((d) => d.getTime())));
        }
      }

      const bufferedMinDate = new Date(minDate);
      bufferedMinDate.setDate(bufferedMinDate.getDate() - 30);
      const bufferedMaxDate = new Date(maxDate);
      bufferedMaxDate.setDate(bufferedMaxDate.getDate() + 30);

      const daysFromStartToToday = Math.ceil(
        (today.getTime() - bufferedMinDate.getTime()) / (1000 * 3600 * 24)
      );
      const initialScroll =
        daysFromStartToToday * dayWidth - window.innerWidth / 2;

      return {
        earliestDate: bufferedMinDate,
        latestDate: bufferedMaxDate,
        initialScrollPosition: Math.max(0, initialScroll),
      };
    }, [filteredAssignments]);

    const dates = useMemo(
      () => getDaysArray(earliestDate, latestDate),
      [earliestDate, latestDate]
    );

    useEffect(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = initialScrollPosition;
      }
    }, [initialScrollPosition]);

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

    const getTaskStyle = (dueDate: string | null) => {
      if (!dueDate) return { left: "0px", width: "0px" };
      
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      const startDiff =
        (due.getTime() - earliestDate.getTime()) / (1000 * 3600 * 24);
      
      return {
        left: `${startDiff * dayWidth}px`,
        width: `${dayWidth}px`,
      };
    };

    return (
      <div className="flex-1 overflow-hidden relative flex flex-col h-full bg-background">
        <div
          ref={scrollContainerRef}
          className={cn(
            "flex-1 overflow-auto relative select-none",
            isDragging ? "cursor-grabbing" : "cursor-default"
          )}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="min-w-max pb-20"
            style={{ width: `${dates.length * dayWidth}px` }}
          >
            <div className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b shadow-sm">
              {dates.map((date, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 flex flex-col items-center justify-end pb-2 h-14 border-r"
                  style={{ width: dayWidth }}
                >
                  <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1">
                    {date.toLocaleDateString("en-US", { weekday: "narrow" })}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                      new Date().toDateString() === date.toDateString()
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-foreground"
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative pt-6 h-full">
              <div className="absolute inset-0 flex pointer-events-none h-full">
                {dates.map((date, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 h-full border-r border-border/50"
                    style={{ width: dayWidth }}
                  ></div>
                ))}
              </div>
              <div className="space-y-3 px-0 relative z-10">
                {filteredAssignments
                  .filter((a) => a.dueDate)
                  .map((assignment) => {
                    const style = getTaskStyle(assignment.dueDate);
                    const statusConfig = STATUS_CONFIG[assignment.systemStatus] || STATUS_CONFIG.backlog;
                    
                    return (
                      <div key={assignment.id} className="relative h-14 group">
                        <div
                          onClick={() => setSelectedAssignment(assignment)}
                          className={cn(
                            "absolute top-0 h-12 rounded-lg border shadow-sm transition-all cursor-pointer flex flex-col justify-center px-3 overflow-hidden group hover:scale-[1.01] z-10",
                            statusConfig.timelineStyle
                          )}
                          style={{
                            left: style.left,
                            width: style.width,
                            minWidth: "140px",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="truncate text-xs font-bold leading-none">
                              {assignment.title}
                            </span>
                          </div>
                          <div className="flex items-center justify-between opacity-80">
                            <span className="text-[10px] font-semibold truncate max-w-[80px]">
                              {assignment.courseName}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-none p-2 border-t bg-background/70 backdrop-blur-sm flex items-center justify-center text-xs text-muted-foreground font-medium z-30 relative">
          <MousePointer size={14} className="mr-2" />
          Tip: Hold{" "}
          <kbd className="mx-1 px-1 py-0.5 rounded-md bg-muted border text-foreground font-bold text-[10px]">
            Right Click
          </kbd>{" "}
          to drag timeline
        </div>
      </div>
    );
  };

  // Calendar View Component
  const CalendarView = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ y: 0, top: 0 });
    const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [showTodayButton, setShowTodayButton] = useState(false);

    const { startMonth, endMonth } = useMemo(() => {
      let minDate = new Date();
      let maxDate = new Date();
      
      if (filteredAssignments.length > 0) {
        const datesWithDueDates = filteredAssignments
          .filter((a) => a.dueDate)
          .map((a) => new Date(a.dueDate!));
        
        if (datesWithDueDates.length > 0) {
          minDate = new Date(Math.min(...datesWithDueDates.map((d) => d.getTime())));
          maxDate = new Date(Math.max(...datesWithDueDates.map((d) => d.getTime())));
        }
      }

      const bufferedStart = new Date(minDate);
      bufferedStart.setMonth(bufferedStart.getMonth() - 2);
      bufferedStart.setDate(1);
      const bufferedEnd = new Date(maxDate);
      bufferedEnd.setMonth(bufferedEnd.getMonth() + 4);
      bufferedEnd.setDate(1);
      return { startMonth: bufferedStart, endMonth: bufferedEnd };
    }, [filteredAssignments]);

    const months = useMemo(
      () => getMonthsArray(startMonth, endMonth),
      [startMonth, endMonth]
    );

    const checkTodayVisibility = useCallback(() => {
      const todayKey = getMonthKey(new Date());
      const todayEl = monthRefs.current[todayKey];
      if (!todayEl) {
        setShowTodayButton(true);
        return;
      }
      const rect = todayEl.getBoundingClientRect();
      const containerRect = scrollContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setShowTodayButton(
          rect.bottom < containerRect.top || rect.top > containerRect.bottom
        );
      }
    }, [months]);

    useEffect(() => {
      const el = scrollContainerRef.current;
      if (el) {
        el.addEventListener("scroll", checkTodayVisibility);
        checkTodayVisibility();
      }
      return () => el?.removeEventListener("scroll", checkTodayVisibility);
    }, [checkTodayVisibility]);

    useEffect(() => {
      setTimeout(() => scrollToToday(), 100);
    }, []);

    const scrollToToday = () => {
      const todayKey = getMonthKey(new Date());
      const el = monthRefs.current[todayKey];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 2 && scrollContainerRef.current) {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = {
          y: e.pageY,
          top: scrollContainerRef.current.scrollTop,
        };
      }
    };

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const y = e.pageY;
        const walk = (y - dragStart.current.y) * 1.5;
        scrollContainerRef.current.scrollTop = dragStart.current.top - walk;
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

    const getDaysForMonth = (monthDate: Date) => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const days = [];
      
      for (let i = 0; i < firstDay.getDay(); i++) {
        days.push({
          date: new Date(year, month, -firstDay.getDay() + 1 + i),
          isCurrentMonth: false,
        });
      }
      
      for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true });
      }
      
      while (days.length % 7 !== 0) {
        const dayIndex = days.length - (firstDay.getDay() + lastDay.getDate()) + 1;
        const d: Date = new Date(year, month + 1, dayIndex);
        days.push({ date: d, isCurrentMonth: false });
      }
      return days;
    };

    return (
      <div className="flex flex-col h-full bg-background relative">
        {showTodayButton && (
          <div className="absolute top-4 right-6 z-20 animate-in fade-in zoom-in duration-300">
            <button
              onClick={scrollToToday}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:opacity-90 transition-all hover:scale-105"
            >
              <ArrowDown size={14} /> Jump to Today
            </button>
          </div>
        )}
        <div
          ref={scrollContainerRef}
          className={cn(
            "flex-1 overflow-y-auto",
            isDragging ? "cursor-grabbing" : "cursor-default"
          )}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-8 p-6 pb-20 max-w-6xl mx-auto">
            {months.map((month) => {
              const days = getDaysForMonth(month);
              const monthKey = getMonthKey(month);
              return (
                <div
                  key={monthKey}
                  ref={(el) => (monthRefs.current[monthKey] = el)}
                  className="bg-card rounded-xl shadow-sm border overflow-hidden scroll-mt-6"
                >
                  <div className="px-6 py-4 border-b bg-muted/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold">
                      {month.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                  </div>
                  <div className="grid grid-cols-7 border-b bg-muted/30">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <div
                          key={d}
                          className="py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide"
                        >
                          {d}
                        </div>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-7 auto-rows-fr">
                    {days.map((day, idx) => {
                      const dayTasks = filteredAssignments.filter((t) => {
                        if (!t.dueDate) return false;
                        const due = new Date(t.dueDate);
                        due.setHours(0, 0, 0, 0);
                        const current = new Date(day.date);
                        current.setHours(0, 0, 0, 0);
                        return current.toDateString() === due.toDateString();
                      });
                      const isToday =
                        day.date.toDateString() === new Date().toDateString();
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "min-h-[100px] border-b border-r p-1.5 flex flex-col gap-1 transition-colors",
                            !day.isCurrentMonth
                              ? "bg-muted/30 text-muted-foreground"
                              : "bg-card"
                          )}
                        >
                          <span
                            className={cn(
                              "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                              isToday
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground"
                            )}
                          >
                            {day.date.getDate()}
                          </span>
                          <div className="flex-1 flex flex-col gap-1.5">
                            {dayTasks.map((task) => {
                              const statusConfig = STATUS_CONFIG[task.systemStatus] || STATUS_CONFIG.backlog;
                              return (
                                <div
                                  key={task.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAssignment(task);
                                  }}
                                  className={cn(
                                    "text-[10px] px-2 py-1 rounded-md border cursor-pointer truncate shadow-sm hover:scale-[1.02] transition-transform font-medium",
                                    statusConfig.color,
                                    statusConfig.border
                                  )}
                                  title={task.title}
                                >
                                  {task.title}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/90 backdrop-blur-md border-t flex items-center justify-center text-xs text-muted-foreground font-medium z-10">
          <MousePointer size={14} className="mr-2" />
          Tip: Hold{" "}
          <kbd className="mx-1 px-1 py-0.5 rounded-md bg-muted border text-foreground font-bold text-[10px]">
            Right Click
          </kbd>{" "}
          to drag vertically
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col min-h-full">
        <div className="flex flex-wrap items-center gap-3 sticky top-0 bg-background py-3 z-10 border-b px-6">
          <div className="flex items-center gap-2">
            <Button
              variant={currentView === "timeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("timeline")}
              className="gap-2"
            >
              <Calendar size={14} />
              Timeline
            </Button>
            <Button
              variant={currentView === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("calendar")}
              className="gap-2"
            >
              <CalendarDays size={14} />
              Calendar
            </Button>
          </div>

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

        <div className="flex-1 overflow-hidden">
          {currentView === "timeline" ? <TimelineView /> : <CalendarView />}
        </div>
      </div>

      <AssignmentDetail
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </>
  );
}
