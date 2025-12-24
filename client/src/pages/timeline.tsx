import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Calendar,
  Filter,
  X,
  CalendarDays,
  MousePointer,
  ArrowDown,
  Lightbulb,
  Loader2,
  Mail, // Added Mail icon
  AlertCircle,
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
import { useClassroom } from "@/lib/classroom-context";
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
  const { getTimelineGroups, courses, isLoading, isSyncing, assignments, syncClassroom } =
    useClassroom();
  const { user, signOut } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [currentView, setCurrentView] = useState<"timeline" | "calendar">(
    "timeline"
  );
  
  const [emailEvents, setEmailEvents] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!user) return;
    try {
        const key = `trace_email_events_${user.uid}`;
        const events = JSON.parse(localStorage.getItem(key) || '[]');
        // Map to Assignment shape
        const mapped = events.map((e: any) => ({
            id: e.id,
            uniqueId: e.id,
            userId: user.uid,
            courseId: 'system',
            courseName: 'System', 
            classroomId: 'system',
            title: e.title,
            description: e.body,
            dueDate: e.timestamp,
            dueTime: null,
            maxPoints: null,
            systemStatus: 'submitted', // Visual hack: 'submitted' = purple
            userStatus: null,
            submissionId: null,
            submittedAt: null,
            gradedAt: null,
            grade: null,
            alternateLink: null,
            createdAt: e.timestamp,
            lastSyncedAt: e.timestamp
        }));
        setEmailEvents(mapped);
    } catch (e) {}
  }, [user]);

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

  // UPDATED: Now returns EnhancedLoadingScreen


  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="text-center space-y-2">
           <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-lg font-medium text-destructive">Troubleshooting</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            It seems data isn't fetching correctly. Please log out and log in again to resolve this.
          </p>
        </div>
        <Button
          onClick={() => signOut()}
          variant="destructive"
          className="px-4 py-2"
        >
          Log Out
        </Button>
      </div>
    );
  }

  // Timeline View Component
  const TimelineView = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, left: 0 });
    const dayWidth = 60; // Keep fixed width for alignment

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
          minDate = new Date(
            Math.min(...datesWithDueDates.map((d) => d.getTime()))
          );
          maxDate = new Date(
            Math.max(...datesWithDueDates.map((d) => d.getTime()))
          );
        }
      }

      const bufferedMinDate = new Date(minDate);
      bufferedMinDate.setDate(bufferedMinDate.getDate() - 30);
      const bufferedMaxDate = new Date(maxDate);
      bufferedMaxDate.setDate(bufferedMaxDate.getDate() + 30);

      const daysFromStartToToday = Math.ceil(
        (today.getTime() - bufferedMinDate.getTime()) / (1000 * 3600 * 24)
      );

      // Calculate scroll to center 'Today'
      const initialScroll =
        daysFromStartToToday * dayWidth + dayWidth / 2 - window.innerWidth / 2;

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
                        isCurrentDay ? "text-foreground" : "text-muted-foreground"
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
                    <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-border/50"></div>
                  </div>
                );
              })}
            </div>

            {/* 2. MAIN CONTENT AREA (GRID + TASKS) */}
            <div className="relative pt-6 min-h-[500px]">
              {/* Vertical Grid Lines & TODAY LINE */}
              <div className="absolute inset-0 flex pointer-events-none h-full z-0">
                {dates.map((date, i) => {
                  const isCurrentDay = isToday(date);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 h-full border-r border-border/40 relative",
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
              <div className="space-y-3 px-0 relative z-10 mt-2">
                {filteredAssignments
                  .filter((a) => a.dueDate)
                  .map((assignment) => {
                    const style = getTaskStyle(assignment.dueDate);
                    const statusConfig =
                      STATUS_CONFIG[assignment.systemStatus] ||
                      STATUS_CONFIG.backlog;

                    return (
                      <div key={assignment.id} className="relative h-14 group">
                        <div
                          onClick={() => setSelectedAssignment(assignment)}
                          className={cn(
                            "absolute top-0 h-12 rounded-lg border shadow-sm transition-all cursor-pointer flex flex-col justify-center px-3 overflow-hidden group hover:scale-[1.01] z-10 hover:z-30 hover:shadow-md",
                            statusConfig.timelineStyle
                          )}
                          style={{
                            left: style.left,
                            width: style.width,
                            minWidth: "140px",
                          }}
                        >
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="truncate text-xs font-bold leading-none flex items-center gap-1">
                              {assignment.courseId === 'system' && <Mail className="h-3 w-3 inline-block" />}
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
                              isToday
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground"
                            )}
                          >
                            {day.date.getDate()}
                          </span>
                          <div className="flex-1 flex flex-col gap-1.5">
                            {dayTasks.map((task) => {
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
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 sticky top-0 bg-background py-3 z-10 border-b px-4 sm:px-6">
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
            <SelectTrigger
              className="w-[140px] sm:w-[180px]"
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
            onValueChange={(v) => setSelectedStatus(v === "all" ? null : v)}
          >
            <SelectTrigger
              className="w-[120px] sm:w-[140px]"
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
              className="text-muted-foreground"
              data-testid="button-clear-filters"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear filters
            </Button>
          )}
          
          <div className="ml-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/settings/integrations">
                        <Button variant="outline" size="sm" className="gap-2 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-all font-medium whitespace-nowrap">
                            <FcGoogle className="h-4 w-4" />
                            Sync with Google Calendar
                        </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="font-medium">Google Calendar Sync</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically sync your assignments and exam deadlines to your Google Calendar.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
          </div>
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
