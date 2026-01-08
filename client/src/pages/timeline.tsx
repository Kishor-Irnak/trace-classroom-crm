import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Calendar,
  Filter,
  GanttChart,
  X,
  CalendarDays,
  MousePointer,
  ArrowDown,
  Lightbulb,
  Loader2,
  Mail,
  AlertCircle,
  Check,
  ZoomIn,
  ZoomOut,
  Minimize2,
} from "lucide-react";
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
import { useClassroom, getTextColor } from "@/lib/classroom-context";
import { useAuth } from "@/lib/auth-context";
import type { Assignment } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FcGoogle } from "react-icons/fc";
import { cn } from "@/lib/utils";
import { TokenRefreshPrompt } from "@/components/token-refresh-prompt";

// --- Loading Configuration ---

const LOADING_TIPS = [
  "Hold 'Right Click' and drag to navigate the timeline quickly.",
  "Switch to Calendar view to see the full monthly schedule.",
  "Use the filters at the top to focus on specific courses.",
  "The 'Today' button in Calendar view jumps you to the current date.",
  "Timeline bars are color-coded based on assignment status.",
  "Hover over an assignment card to see more details.",
];

// --- Skeleton & Loading Components ---

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

function EnhancedLoadingScreen() {
  const [progress, setProgress] = useState(10);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // Increment progress bar
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) return 100;
        const diff = Math.random() * 10;
        return Math.min(oldProgress + diff, 90);
      });
    }, 500);

    // Rotate tips
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
      {/* Background Structure (Blurred Skeleton) */}
      <div className="h-full w-full p-6 opacity-40 pointer-events-none select-none filter grayscale">
        <TimelineSkeleton />
      </div>

      {/* Foreground Overlay */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
        <div className="w-full max-w-md p-6 space-y-6">
          {/* Logo / Header */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 bg-zinc-950 rounded flex items-center justify-center text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Building Timeline
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
              <span>Mapping Schedule</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Scroll Down Indicator - Shows when there are tasks below */}
          {hasVerticalScroll && !isAtBottom && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 animate-bounce">
              <div className="bg-white border border-zinc-200 rounded-full shadow-lg px-3 py-2 flex items-center gap-2">
                <ArrowDown
                  className="h-4 w-4 text-zinc-950"
                  strokeWidth={1.5}
                />
                <span className="text-xs font-medium text-zinc-900">
                  More tasks below
                </span>
              </div>
            </div>
          )}
          {/* Tips Section */}
          <div className="flex gap-3 items-start bg-white border border-zinc-200 p-4 rounded-md shadow-sm max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Lightbulb className="h-4 w-4 text-zinc-900 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                Navigation Tip
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

// --- Configuration ---

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
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    timelineStyle: "bg-slate-100 border-slate-300 text-slate-700",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    border: "border-blue-100 dark:border-blue-800",
    timelineStyle: "bg-blue-100 border-blue-300 text-blue-800",
  },
  submitted: {
    label: "Submitted",
    color:
      "bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
    border: "border-purple-100 dark:border-purple-800",
    timelineStyle: "bg-purple-100 border-purple-300 text-purple-800",
  },
  graded: {
    label: "Graded",
    color:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    border: "border-emerald-100 dark:border-emerald-800",
    timelineStyle: "bg-emerald-100 border-emerald-300 text-emerald-800",
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200",
    border: "border-red-100 dark:border-red-800",
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

// Utility to check if a date is today
const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// --- Main Page Component ---

export default function TimelinePage() {
  const {
    getTimelineGroups,
    courses,
    isLoading,
    isSyncing,
    assignments,
    syncClassroom,
  } = useClassroom();
  const { user, signOut } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [currentView, setCurrentView] = useState<"timeline" | "calendar">(
    "timeline"
  );
  const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2
  const [compactView, setCompactView] = useState(false);

  const [emailEvents] = useState<Assignment[]>([]);

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments, ...emailEvents];
    if (selectedCourse) {
      filtered = filtered.filter((a) => a.courseId === selectedCourse);
    }
    if (selectedStatus) {
      filtered = filtered.filter((a) => a.systemStatus === selectedStatus);
    }
    return filtered;
  }, [assignments, emailEvents, selectedCourse, selectedStatus]);

  const clearFilters = () => {
    setSelectedCourse(null);
    setSelectedStatus(null);
  };

  const hasFilters = selectedCourse || selectedStatus;

  // Timeline View Component
  const TimelineView = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, left: 0 });
    const baseDayWidth = 60;
    const dayWidth = baseDayWidth * zoomLevel; // Dynamic width based on zoom

    const { earliestDate, latestDate, initialScrollPosition } = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let minDate = new Date();
      let maxDate = new Date();

      if (filteredAssignments.length > 0) {
        const relevantDates = filteredAssignments.flatMap((a) => {
          const dates = [];
          if (a.dueDate) dates.push(new Date(a.dueDate));
          if (a.createdAt) dates.push(new Date(a.createdAt));
          return dates;
        });

        if (relevantDates.length > 0) {
          minDate = new Date(
            Math.min(...relevantDates.map((d) => d.getTime()))
          );
          maxDate = new Date(
            Math.max(...relevantDates.map((d) => d.getTime()))
          );
        }
      }

      const bufferedMinDate = new Date(minDate);
      bufferedMinDate.setDate(bufferedMinDate.getDate() - 30);
      const bufferedMaxDate = new Date(maxDate);
      bufferedMaxDate.setDate(bufferedMaxDate.getDate() + 30);

      // Find nearest upcoming assignment or today
      let scrollTarget = today;
      const upcomingAssignments = filteredAssignments
        .filter((a) => a.dueDate && new Date(a.dueDate) >= today)
        .sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
        );

      if (upcomingAssignments.length > 0) {
        scrollTarget = new Date(upcomingAssignments[0].dueDate!);
      }

      const daysFromStartToTarget = Math.ceil(
        (scrollTarget.getTime() - bufferedMinDate.getTime()) /
          (1000 * 3600 * 24)
      );

      // Calculate scroll to center the target (nearest task or today)
      const initialScroll =
        daysFromStartToTarget * dayWidth + dayWidth / 2 - window.innerWidth / 2;

      return {
        earliestDate: bufferedMinDate,
        latestDate: bufferedMaxDate,
        initialScrollPosition: Math.max(0, initialScroll),
      };
    }, [filteredAssignments, dayWidth]);

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

    // Scroll detection for vertical overflow
    const [hasVerticalScroll, setHasVerticalScroll] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(false);
    const verticalScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const checkScroll = () => {
        if (verticalScrollRef.current) {
          const { scrollHeight, clientHeight, scrollTop } =
            verticalScrollRef.current;
          setHasVerticalScroll(scrollHeight > clientHeight);
          setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
        }
      };

      checkScroll();
      const scrollEl = verticalScrollRef.current;
      scrollEl?.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);

      return () => {
        scrollEl?.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }, [filteredAssignments, compactView]);

    return (
      <div className="flex-1 overflow-hidden relative flex flex-col h-full bg-background">
        <div
          ref={(el) => {
            scrollContainerRef.current = el;
            verticalScrollRef.current = el;
          }}
          className={cn(
            "flex-1 overflow-auto relative select-none",
            isDragging ? "cursor-grabbing" : "cursor-default"
          )}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="min-w-max pb-20 relative"
            style={{ width: `${dates.length * dayWidth}px` }}
          >
            {/* 1. STICKY HEADER WITH DATE CIRCLE */}
            <div className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-40 border-b shadow-sm h-16">
              {dates.map((date, i) => {
                const isCurrentDay = isToday(date);
                return (
                  <div
                    key={i}
                    className="flex-shrink-0 flex flex-col items-center justify-end pb-3 relative"
                    style={{ width: dayWidth }}
                  >
                    {/* Day Name (Mon, Tue) */}
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold tracking-wider mb-1",
                        isCurrentDay
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {date.toLocaleDateString("en-US", { weekday: "narrow" })}
                    </span>

                    {/* Date Number Circle */}
                    <span
                      className={cn(
                        "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-all",
                        isCurrentDay
                          ? "bg-foreground text-background shadow-md z-10 scale-110"
                          : "text-foreground"
                      )}
                    >
                      {date.getDate()}
                    </span>

                    {/* Right Border for header cells */}
                    <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-border"></div>
                  </div>
                );
              })}
            </div>

            {/* 2. MAIN CONTENT AREA (GRID + TASKS) */}
            <div
              className="relative pt-6"
              style={{
                minHeight: compactView
                  ? `${Math.max(
                      300,
                      filteredAssignments.filter((a) => a.dueDate).length * 40
                    )}px`
                  : `${Math.max(
                      400,
                      filteredAssignments.filter((a) => a.dueDate).length * 60
                    )}px`,
              }}
            >
              {/* Vertical Grid Lines & TODAY LINE */}
              <div className="absolute inset-0 flex pointer-events-none h-full z-0">
                {dates.map((date, i) => {
                  const isCurrentDay = isToday(date);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 h-full border-r border-border relative",
                        isCurrentDay ? "bg-accent/50" : ""
                      )}
                      style={{ width: dayWidth }}
                    >
                      {/* --- THE TODAY LINE --- */}
                      {isCurrentDay && (
                        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-foreground -translate-x-1/2 z-20 shadow-[0_0_10px_rgba(255,255,255,0.2)]"></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Assignments Layer */}
              <div
                className={cn(
                  "px-0 relative z-10 mt-2",
                  compactView ? "space-y-1" : "space-y-3"
                )}
              >
                {filteredAssignments
                  .filter((a) => a.dueDate)
                  .map((assignment) => {
                    const course = courses.find(
                      (c) => c.id === assignment.courseId
                    );
                    const courseColor = course?.color;

                    const isCompleted =
                      assignment.systemStatus === "submitted" ||
                      assignment.systemStatus === "graded";

                    // Determine visual start date: createdAt or earliest timeline date
                    const startDate = assignment.createdAt
                      ? new Date(assignment.createdAt)
                      : new Date();
                    const dueDate = new Date(assignment.dueDate!);

                    // Calculate position and width
                    // Start relative to earliestDate
                    const startDiff =
                      (startDate.getTime() - earliestDate.getTime()) /
                      (1000 * 3600 * 24);

                    // Duration from Start to Due
                    const duration =
                      (dueDate.getTime() - startDate.getTime()) /
                      (1000 * 3600 * 24);

                    const left = Math.max(0, startDiff * dayWidth);
                    const width = Math.max(dayWidth, duration * dayWidth);

                    const style = {
                      left: `${left}px`,
                      width: `${width}px`,
                      minWidth: compactView ? "100px" : "140px",
                      backgroundColor: isCompleted ? undefined : courseColor,
                      borderColor: isCompleted
                        ? undefined
                        : courseColor
                        ? "rgba(0,0,0,0.1)"
                        : undefined,
                      color: isCompleted
                        ? undefined
                        : courseColor
                        ? getTextColor(courseColor)
                        : undefined,
                    };

                    const statusConfig =
                      STATUS_CONFIG[assignment.systemStatus] ||
                      STATUS_CONFIG.backlog;

                    const completedStyle =
                      "bg-green-100/80 border-green-300 text-green-800";

                    const defaultStyle = "bg-card border shadow-sm";

                    const taskHeight = compactView ? "h-8" : "h-12";
                    const containerHeight = compactView ? "h-9" : "h-14";

                    return (
                      <div
                        key={assignment.id}
                        className={cn("relative group", containerHeight)}
                      >
                        <div
                          onClick={() => setSelectedAssignment(assignment)}
                          className={cn(
                            "absolute top-0 rounded-lg border transition-all cursor-pointer flex flex-col justify-center overflow-hidden group hover:scale-[1.01] z-10 hover:z-30 hover:shadow-md",
                            taskHeight,
                            compactView ? "px-2" : "px-3",
                            isCompleted ? completedStyle : defaultStyle
                          )}
                          style={style}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span
                              className={cn(
                                "truncate font-bold leading-none flex items-center gap-1",
                                compactView ? "text-[10px]" : "text-xs"
                              )}
                            >
                              {assignment.courseId === "system" && (
                                <Mail
                                  className={cn(
                                    "inline-block",
                                    compactView ? "h-2.5 w-2.5" : "h-3 w-3"
                                  )}
                                />
                              )}
                              {isCompleted && (
                                <Check
                                  className={cn(
                                    "inline-block mr-0.5",
                                    compactView ? "h-2.5 w-2.5" : "h-3 w-3"
                                  )}
                                />
                              )}
                              {assignment.title}
                            </span>
                          </div>
                          {!compactView && (
                            <div className="flex items-center justify-between opacity-80">
                              <span className="text-[10px] font-semibold truncate max-w-[80px]">
                                {assignment.courseName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Down Indicator - Shows when there are tasks below */}
        {hasVerticalScroll && !isAtBottom && filteredAssignments.length > 0 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 animate-bounce pointer-events-none">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-lg px-3 py-2 flex items-center gap-2">
              <ArrowDown
                className="h-4 w-4 text-zinc-950 dark:text-zinc-50"
                strokeWidth={1.5}
              />
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                More tasks below
              </span>
            </div>
          </div>
        )}

        {/* Zoom Controls - Bottom Right */}
        <div className="absolute bottom-20 right-6 z-40 flex flex-col gap-2">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-1 flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              onClick={() => {
                // Save current scroll position
                const scrollEl = scrollContainerRef.current;
                const scrollLeft = scrollEl?.scrollLeft || 0;
                const scrollTop = scrollEl?.scrollTop || 0;

                const newZoom = Math.min(2, zoomLevel + 0.25);
                setZoomLevel(newZoom);

                // Disable compact view when zooming in past 75%
                if (newZoom > 0.75) {
                  setCompactView(false);
                }

                // Restore scroll position after zoom
                setTimeout(() => {
                  if (scrollEl) {
                    scrollEl.scrollLeft = scrollLeft * (newZoom / zoomLevel);
                    scrollEl.scrollTop = scrollTop;
                  }
                }, 0);
              }}
              disabled={zoomLevel >= 2}
              title="Zoom In (Normal View)"
            >
              <ZoomIn
                className="h-4 w-4 text-zinc-950 dark:text-zinc-50"
                strokeWidth={1.5}
              />
            </Button>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              onClick={() => {
                // Save current scroll position
                const scrollEl = scrollContainerRef.current;
                const scrollLeft = scrollEl?.scrollLeft || 0;
                const scrollTop = scrollEl?.scrollTop || 0;

                const newZoom = Math.max(0.5, zoomLevel - 0.25);
                setZoomLevel(newZoom);

                // Enable compact view when zooming out to 75% or less
                if (newZoom <= 0.75) {
                  setCompactView(true);
                }

                // Restore scroll position after zoom
                setTimeout(() => {
                  if (scrollEl) {
                    scrollEl.scrollLeft = scrollLeft * (newZoom / zoomLevel);
                    scrollEl.scrollTop = scrollTop;
                  }
                }, 0);
              }}
              disabled={zoomLevel <= 0.5}
              title="Zoom Out (Compact View)"
            >
              <ZoomOut
                className="h-4 w-4 text-zinc-950 dark:text-zinc-50"
                strokeWidth={1.5}
              />
            </Button>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm px-2 py-1 text-center">
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            {compactView && (
              <div className="text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                Compact
              </div>
            )}
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
          minDate = new Date(
            Math.min(...datesWithDueDates.map((d) => d.getTime()))
          );
          maxDate = new Date(
            Math.max(...datesWithDueDates.map((d) => d.getTime()))
          );
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
        const dayIndex =
          days.length - (firstDay.getDay() + lastDay.getDate()) + 1;
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
                              isToday && day.isCurrentMonth
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground"
                            )}
                          >
                            {day.date.getDate()}
                          </span>
                          <div className="flex-1 flex flex-col gap-1.5">
                            {dayTasks.map((task) => {
                              const course = courses.find(
                                (c) => c.id === task.courseId
                              );
                              const courseColor = course?.color;
                              const isCompleted = [
                                "submitted",
                                "graded",
                              ].includes(task.systemStatus);
                              const useCustomColor =
                                !isCompleted && courseColor;

                              const statusConfig =
                                STATUS_CONFIG[task.systemStatus] ||
                                STATUS_CONFIG.backlog;

                              return (
                                <div
                                  key={task.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAssignment(task);
                                  }}
                                  className={cn(
                                    "text-[10px] px-2 py-1 rounded-md border cursor-pointer truncate shadow-sm hover:scale-[1.02] transition-transform font-medium",
                                    !useCustomColor && statusConfig.color,
                                    !useCustomColor && statusConfig.border,
                                    useCustomColor &&
                                      "text-slate-900 border-transparent/20"
                                  )}
                                  style={
                                    useCustomColor
                                      ? { backgroundColor: courseColor }
                                      : undefined
                                  }
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

  // Error handling logic
  // If "session" error and NO data => blocking prompt
  // If "session" error and HAS data => show banner + content
  if (
    useClassroom().error &&
    useClassroom().error!.toLowerCase().includes("session")
  ) {
    const { assignments, courses } = useClassroom();
    if (!assignments.length && !courses.length) {
      return <TokenRefreshPrompt />;
    }
  }

  const { error: classroomError } = useClassroom();

  return (
    <>
      {classroomError && classroomError.toLowerCase().includes("session") && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-3 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              <span>
                Sync is paused. Cached data is shown. Sign in to update.
              </span>
            </div>
            <Link href="/auth/refresh">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={() => window.location.reload()}
              >
                Reconnect
              </Button>
            </Link>
          </div>
        </div>
      )}
      <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
        <div className="border-b px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/95 backdrop-blur z-20 shrink-0 transition-all">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <h1 className="text-2xl font-bold tracking-tight hidden md:block">
              Timeline
            </h1>
            <div className="flex bg-muted p-1 rounded-lg shrink-0 w-full md:w-auto grid grid-cols-2 md:flex">
              <button
                onClick={() => setCurrentView("timeline")}
                className={cn(
                  "px-3 py-1.5 md:py-1 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2",
                  currentView === "timeline"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <GanttChart className="h-3.5 w-3.5" />
                Timeline
              </button>
              <button
                onClick={() => setCurrentView("calendar")}
                className={cn(
                  "px-3 py-1.5 md:py-1 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2",
                  currentView === "calendar"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-6 py-2 border-b flex items-center gap-3 bg-muted/30 shrink-0 overflow-x-auto no-scrollbar">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
          <Select
            value={selectedCourse || "all"}
            onValueChange={(val) =>
              setSelectedCourse(val === "all" ? null : val)
            }
          >
            <SelectTrigger
              className="w-[140px] sm:w-[240px] h-8 text-xs"
              data-testid="select-course-filter"
            >
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
            onValueChange={(val) =>
              setSelectedStatus(val === "all" ? null : val)
            }
          >
            <SelectTrigger
              className="w-[110px] sm:w-[140px] h-8 text-xs"
              data-testid="select-status-filter"
            >
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
              className="text-muted-foreground h-8 px-2"
              data-testid="button-clear-filters"
            >
              <X className="h-3.5 w-3.5 md:mr-1" />
              <span className="hidden md:inline">Clear filters</span>
            </Button>
          )}

          <div className="ml-auto pl-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/settings/integrations">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-all font-medium whitespace-nowrap h-8"
                    >
                      <FcGoogle className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        Sync with Google Calendar
                      </span>
                      <span className="sm:hidden">Sync</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="font-medium">Google Calendar Sync</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically sync your assignments and exam deadlines to
                    your Google Calendar.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex-1 overflow-hidden h-full">
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
