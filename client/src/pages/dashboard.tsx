import { useState, useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Lightbulb,
  Loader2,
  Trophy,
  ArrowUpRight,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentCardCompact } from "@/components/assignment-card";
import { AssignmentDetail } from "@/components/assignment-detail";
import {
  useClassroom,
  fetchAllPages,
  getTextColor,
} from "@/lib/classroom-context";
import { useAuth } from "@/lib/auth-context";
import type { Assignment } from "@shared/schema";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { OnboardingGuide } from "@/components/onboarding-guide";
import { AttendanceService } from "@/services/attendance-service";
import { UserCheck } from "lucide-react";
import { BadgeList } from "@/components/badge-ui";
import { DashboardBadgesCard } from "@/components/dashboard-badges-card";

import { TokenRefreshPrompt } from "@/components/token-refresh-prompt";
import { MetricSkeleton, AssignmentRowSkeleton } from "@/components/skeletons";

function ClassActivityCard({
  courses,
  assignments,
}: {
  courses: import("@shared/schema").Course[];
  assignments: import("@shared/schema").Assignment[];
}) {
  const { user } = useAuth();
  const [rankData, setRankData] = useState<{
    rank: number;
    total: number;
    percentile: number;
    xp: number;
    badges: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // We need to listen to 'all-courses' AND every specific course the user is enrolled in.
    const uniqueSourceIds = Array.from(
      new Set(["all-courses", ...courses.map((c) => c.id)])
    );

    const unsubscribers: (() => void)[] = [];
    const studentMap = new Map<string, any>();

    const updateRankState = () => {
      const rawStudents = Array.from(studentMap.values());

      // --- FILTERING LOGIC MATCHING LEADERBOARD.TSX (Class View) ---
      const userDomain = user.email ? user.email.split("@")[1] : null;
      const userCourseIds = courses.map((c) => c.id);
      const validAssignmentIds = new Set(assignments.map((a) => a.id));

      const filteredStudents = rawStudents.filter((student) => {
        // 1. Data Preparation
        const studentEmail = student.email || "";
        const studentDomain =
          student.emailDomain ||
          (studentEmail.includes("@") ? studentEmail.split("@")[1] : "");
        const studentSubjects = student.enrolledCourseIds || [];
        const processedIds = student.processedAssignmentIds || [];

        // 2. Logic
        const isSameDomain =
          userDomain && studentDomain && userDomain === studentDomain;
        const hasCommonSubject = userCourseIds.some((id) =>
          studentSubjects.includes(id)
        );

        // Legacy User Logic (for data migrated or created before domain tracking)
        const isLegacyUser = !studentDomain;
        const hasSharedAssignment =
          isLegacyUser &&
          processedIds.some((id: string) => validAssignmentIds.has(id));

        // Strict Class Match OR Proven Classmate (Legacy)
        if (student.id === user.uid) return true;

        return (isSameDomain && hasCommonSubject) || hasSharedAssignment;
      });

      // Sort by XP Descending
      filteredStudents.sort((a, b) => b.totalXP - a.totalXP);

      const total = filteredStudents.length;

      if (total === 0) {
        setRankData(null);
        setIsLoading(false);
        return;
      }

      const myIndex = filteredStudents.findIndex((s) => s.id === user.uid);

      if (myIndex !== -1) {
        const rank = myIndex + 1;
        const percentile = Math.round(((total - rank + 1) / total) * 100);
        const myData = filteredStudents[myIndex];

        setRankData({
          rank,
          total,
          percentile,
          xp: myData.totalXP || 0,
          badges: myData.badges || [],
        });
      } else {
        setRankData(null);
      }
      setIsLoading(false);
    };

    uniqueSourceIds.forEach((sourceId) => {
      const q = query(
        collection(db, "leaderboards", sourceId, "students"),
        orderBy("totalXP", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const newStudent = {
              id: doc.id,
              ...data,
              // Ensure essential fields exist
              email: data.email || "",
              emailDomain:
                data.emailDomain ||
                (data.email ? data.email.split("@")[1] : ""),
              enrolledCourseIds: data.enrolledCourseIds || data.subjects || [],
              processedAssignmentIds:
                data.processedAssignmentIds || data.completedTasks || [],
              totalXP: data.totalXP || data.xp || 0,
              badges: data.badges || [],
            };

            const existing = studentMap.get(doc.id);
            // Merge strategy: Keep highest XP
            if (!existing || newStudent.totalXP >= existing.totalXP) {
              studentMap.set(doc.id, newStudent);
            }
          });
          updateRankState();
        },
        (error) => {
          console.error(
            `Error fetching leaderboard source ${sourceId}:`,
            error
          );
          updateRankState();
        }
      );
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, courses, assignments]);

  return (
    <Card
      data-testid="card-class-rank"
      className="flex flex-col h-full border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Ranking
        </CardTitle>
        <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-500 shadow-sm group-hover:scale-110 transition-transform">
          <Trophy className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between pt-0 relative">
        {isLoading ? (
          <div className="space-y-3 mt-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : rankData ? (
          <>
            <div className="mt-2">
              <div className="mt-2 text-center sm:text-left">
                <p className="text-xl font-bold text-foreground leading-tight">
                  {rankData.total - rankData.rank > 0
                    ? `You are ahead of ${
                        rankData.total - rankData.rank
                      } classmates`
                    : "You are leading the class!"}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground font-medium">
                  <span>Rank #{rankData.rank}</span>
                  <span>•</span>
                  <span>{rankData.xp.toLocaleString()} XP</span>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  <span>Class Performance</span>
                  <span>Top {100 - rankData.percentile}%</span>
                </div>
                {/* Percentile Bar */}
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                    style={{ width: `${rankData.percentile}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <Link href="/leaderboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs w-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
                >
                  View Leaderboard
                  <ArrowUpRight className="ml-1.5 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 justify-between flex-1 mt-2">
            <span className="text-lg font-medium text-muted-foreground">
              Unranked
            </span>
            <Link href="/leaderboard" className="mt-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs w-full"
              >
                Join Leaderboard
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverallAttendanceCard({
  courses,
}: {
  courses: import("@shared/schema").Course[];
}) {
  const { user, accessToken } = useAuth();
  const [stats, setStats] = useState<{
    percentage: number;
    status: "safe" | "warning" | "danger";
    present: number;
    total: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!courses.length || !user?.email || !accessToken) {
        setIsLoading(false);
        return;
      }

      let totalAttended = 0;
      let totalClasses = 0;
      let loadedCount = 0;

      await Promise.all(
        courses.map(async (course) => {
          try {
            const config = await AttendanceService.getCourseConfig(course.id);
            if (!config || !config.isVisible || !config.sheetUrl) return;

            const sheetId = AttendanceService.extractSheetId(config.sheetUrl);
            if (!sheetId) return;

            const data = await AttendanceService.fetchAttendanceFromSheet(
              sheetId,
              accessToken,
              user.email!,
              config.emailColumn || "A"
            );

            if (data) {
              totalAttended += data.stats.attendedClasses;
              totalClasses += data.stats.totalClasses;
              loadedCount++;
            }
          } catch (e) {
            // value not loaded, ignore
          }
        })
      );

      if (loadedCount === 0 || totalClasses === 0) {
        setStats(null);
      } else {
        const percentage = Math.round((totalAttended / totalClasses) * 100);
        let status: "safe" | "warning" | "danger" = "safe";
        if (percentage < 70) status = "danger";
        else if (percentage < 75) status = "warning";

        setStats({
          percentage,
          status,
          present: totalAttended,
          total: totalClasses,
        });
      }
      setIsLoading(false);
    }
    fetchData();
  }, [courses, user, accessToken]);

  return (
    <Card
      data-testid="card-attendance-overall"
      className="flex flex-col h-full border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative group"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <UserCheck className="w-24 h-24 text-emerald-500" />
      </div>

      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 relative z-10">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Overall Attendance
        </CardTitle>
        <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
          <UserCheck className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10 flex-1 flex flex-col justify-end">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : stats ? (
          <div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "text-4xl font-bold tracking-tight",
                  stats.status === "danger"
                    ? "text-red-500"
                    : stats.status === "warning"
                    ? "text-amber-500"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {stats.percentage}
              </span>
              <span className="text-xl font-medium text-muted-foreground">
                %
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    stats.status === "danger"
                      ? "bg-red-500"
                      : stats.status === "warning"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  )}
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                <span>
                  {stats.present}/{stats.total} Classes
                </span>
                <span
                  className={cn(
                    "font-bold uppercase text-[10px]",
                    stats.status === "safe"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : stats.status === "warning"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {stats.status === "safe" ? "On Track" : "Low"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                No Data Yet
              </p>
              <p className="text-[10px] text-muted-foreground/70 leading-snug">
                Ask your teacher to use Trace for attendance.
              </p>
            </div>
            <Link href="/attendance">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs w-full bg-transparent border-dashed hover:border-solid hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 hover:border-emerald-200 transition-all"
              >
                Check Details
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            {[1, 2, 3].map((i) => (
              <AssignmentRowSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  onClick,
  className,
}: {
  title: string;
  value: number;
  icon: typeof Clock;
  description?: string;
  variant?: "default" | "warning" | "danger" | "success";
  onClick?: () => void;
  className?: string;
}) {
  const variantStyles = {
    default: {
      bg: "bg-white dark:bg-zinc-950",
      iconBg: "bg-zinc-100 dark:bg-zinc-800",
      iconColor: "text-zinc-600 dark:text-zinc-400",
      valueColor: "text-zinc-900 dark:text-zinc-50",
      border: "border-zinc-200 dark:border-zinc-800",
      ring: "group-hover:ring-zinc-200 dark:group-hover:ring-zinc-800",
    },
    warning: {
      bg: "bg-amber-50/30 dark:bg-amber-950/10",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-400",
      border: "border-amber-200/60 dark:border-amber-800/60",
      ring: "group-hover:ring-amber-200 dark:group-hover:ring-amber-800/50",
    },
    danger: {
      bg: "bg-red-50/30 dark:bg-red-950/10",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      valueColor: "text-red-700 dark:text-red-400",
      border: "border-red-200/60 dark:border-red-800/60",
      ring: "group-hover:ring-red-200 dark:group-hover:ring-red-800/50",
    },
    success: {
      bg: "bg-emerald-50/30 dark:bg-emerald-950/10",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      valueColor: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-200/60 dark:border-emerald-800/60",
      ring: "group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800/50",
    },
  };

  const styles =
    variantStyles[variant as keyof typeof variantStyles] ||
    variantStyles.default;

  const content = (
    <Card
      data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn(
        "group overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        styles.bg,
        styles.border,
        onClick && "cursor-pointer active:scale-95 transition-transform",
        "hover:ring-1",
        styles.ring,
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3">
        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {title}
        </CardTitle>
        <div
          className={cn(
            "p-1.5 rounded-lg transition-all duration-300 group-hover:scale-110",
            styles.iconBg
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", styles.iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <div
              className={cn(
                "text-2xl font-bold tracking-tight tabular-nums",
                styles.valueColor
              )}
            >
              {value}
            </div>
            {/* Optional trend indicator could go here if available */}
          </div>
          {description && (
            <p className="text-[10px] font-medium text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Click to see filtered assignments</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// --- Chart Helpers ---
function getSmoothPath(
  data: { count: number }[],
  width: number,
  height: number,
  maxVal: number
) {
  if (data.length < 2) return "";

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.count / maxVal) * height; // Invert Y
    return [x, y];
  });

  // Start path
  let d = `M ${points[0][0]},${points[0][1]}`;

  // Simple cubic bezier smoothing
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = i > 0 ? points[i - 1] : points[0];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] =
      i < points.length - 2 ? points[i + 2] : points[points.length - 1];

    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;

    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
  }

  return d;
}

function WeeklyWorkload({ assignments }: { assignments: Assignment[] }) {
  // 1. Filter assignments due in next 7 days
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  const upcoming = assignments.filter((a) => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate);
    return due >= now && due <= nextWeek;
  });

  // 2. Group by day
  const grouped = upcoming.reduce((acc, curr) => {
    if (!curr.dueDate) return acc;
    const date = new Date(curr.dueDate);
    const dateKey = date.toDateString(); // "Fri Jan 10 2025" or similar

    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: date,
        dayLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
        items: [],
      };
    }
    acc[dateKey].items.push(curr);
    return acc;
  }, {} as Record<string, { date: Date; dayLabel: string; items: Assignment[] }>);

  // 3. Sort by date and take top 3 active days
  const sortedDays = Object.values(grouped)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  return (
    <Card className="overflow-hidden border-zinc-100 dark:border-zinc-800/60 shadow-none bg-card/60 flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            This Week
          </CardTitle>
          <Link href="/timeline">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
            >
              View Full Timeline <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
        {sortedDays.length > 0 ? (
          <div className="space-y-4">
            {sortedDays.map((dayGroup, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {dayGroup.dayLabel}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    {dayGroup.items.length} assignment
                    {dayGroup.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1 ml-2 border-l-2 border-muted pl-3">
                  {dayGroup.items.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="text-sm text-foreground/90 truncate"
                    >
                      {assignment.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-60">
            <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              No assignments due fast.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NextActions({
  assignments,
  onSelectAssignment,
  courses,
}: {
  assignments: Assignment[];
  onSelectAssignment: (assignment: Assignment) => void;
  courses: import("@shared/schema").Course[];
}) {
  const [showAll, setShowAll] = useState(false);

  // Custom priority sort
  const sorted = [...assignments].sort((a, b) => {
    // 1. Status: Overdue first
    if (a.systemStatus === "overdue" && b.systemStatus !== "overdue") return -1;
    if (b.systemStatus === "overdue" && a.systemStatus !== "overdue") return 1;

    // 2. Due Date
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const heroAssignment = sorted[0];
  const nextAssignments = sorted.slice(1);
  const visibleNext = showAll ? nextAssignments : nextAssignments.slice(0, 3);

  const getDueDateLabel = (dateStr?: string | null) => {
    if (!dateStr) return "No Due Date";
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Due Tomorrow";
    return `Due ${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  };

  if (!heroAssignment) {
    return (
      <Card className="flex flex-col h-full border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[300px]">
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            All caught up!
          </h3>
          <p className="text-sm text-muted-foreground max-w-[250px] mt-2">
            No pending assignments. Take a break or check upcoming work in the
            timeline.
          </p>
        </div>
      </Card>
    );
  }

  const heroCourse = courses.find((c) => c.id === heroAssignment.courseId);
  const heroIsOverdue = heroAssignment.systemStatus === "overdue";

  return (
    <Card className="flex flex-col h-full border-zinc-300 dark:border-zinc-700 shadow-md ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded bg-primary/10 text-primary">
              <Lightbulb className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">
              Next Action
            </h2>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {sorted.length} pending
          </Badge>
        </div>

        {/* Hero Card */}
        <div
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all cursor-pointer group bg-card hover:border-primary/50",
            heroIsOverdue
              ? "border-red-500/20 bg-red-500/5"
              : "border-primary/20 bg-primary/5"
          )}
          onClick={() => onSelectAssignment(heroAssignment)}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <Badge
                  variant="secondary"
                  className="mb-2 text-[10px] px-2 py-0.5 border-0"
                  style={{
                    backgroundColor: heroCourse?.color || undefined,
                    color: heroCourse?.color
                      ? getTextColor(heroCourse.color)
                      : undefined,
                  }}
                >
                  {heroAssignment.courseName}
                </Badge>
                <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                  {heroAssignment.title}
                </h3>
              </div>
              {heroIsOverdue && (
                <Badge variant="destructive" className="shrink-0 animate-pulse">
                  Overdue
                </Badge>
              )}
            </div>

            <div className="flex flex-col items-center mt-6 gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className={heroIsOverdue ? "text-red-500 font-bold" : ""}>
                  {getDueDateLabel(heroAssignment.dueDate)}
                </span>
              </div>
              <Button
                size="sm"
                className="w-[60%] gap-2 shadow-lg hover:translate-y-[-2px] transition-transform"
              >
                Start Next Task <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Up Next List */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-4">
        {nextAssignments.length > 0 && (
          <div className="mt-6 mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Up Next
            </h4>
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2">
          {visibleNext.map((assignment) => {
            const course = courses.find((c) => c.id === assignment.courseId);
            const isOverdue = assignment.systemStatus === "overdue";

            return (
              <div
                key={assignment.id}
                onClick={() => onSelectAssignment(assignment)}
                className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors cursor-pointer group/item"
              >
                <div
                  className={cn(
                    "w-1 h-8 rounded-full shrink-0",
                    isOverdue ? "bg-red-500" : "bg-muted-foreground/30"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover/item:text-primary transition-colors">
                    {assignment.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate max-w-[120px]">
                      {assignment.courseName}
                    </span>
                    <span>•</span>
                    <span>{getDueDateLabel(assignment.dueDate)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {nextAssignments.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `View All (${nextAssignments.length})`}
          </Button>
        )}
      </div>
    </Card>
  );
}

// Sortable Section Wrapper
function SortableSection({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity z-10"
      >
        <div className="bg-muted border border-border rounded p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const {
    getDashboardMetrics,
    isLoading,
    isSyncing,
    assignments,
    syncClassroom,
    courses,
    error,
  } = useClassroom();
  const { signOut } = useAuth();
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  // Dashboard section order state
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("dashboard_section_order");
    return saved ? JSON.parse(saved) : ["metrics", "features", "charts"];
  });

  const [activeFilter, setActiveFilter] = useState<{
    type: "urgent" | "upcoming" | "active";
    label: string;
  } | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(
          "dashboard_section_order",
          JSON.stringify(newOrder)
        );
        return newOrder;
      });
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const metrics = getDashboardMetrics();

  // Combine active assignments for Next Actions
  const activeAssignments = assignments.filter(
    (a) => a.systemStatus !== "graded" && a.systemStatus !== "submitted"
  );

  const filteredAssignments = activeFilter
    ? assignments
        .filter((a) => {
          const isFinished =
            a.systemStatus === "graded" || a.systemStatus === "submitted";

          if (activeFilter.type === "active") return !isFinished;

          if (isFinished) return false;

          const now = new Date();
          const due = a.dueDate ? new Date(a.dueDate) : null;

          // "Urgent" = Overdue OR Due in next 3 days
          if (activeFilter.type === "urgent") {
            if (a.systemStatus === "overdue") return true;
            if (!due) return false;
            const limit = new Date(now);
            limit.setDate(limit.getDate() + 3);
            return due <= limit; // Include past due (overdue status handles it, but just in case)
          }

          // "Upcoming" = Due in next 7 days (broad view)
          if (activeFilter.type === "upcoming") {
            if (!due) return false;
            const limit = new Date(now);
            limit.setDate(limit.getDate() + 7);
            return due >= now && due <= limit;
          }
          return false;
        })
        .sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
    : [];

  // Check if there's a token-related error
  // If we have no data at all, we must block.
  // If we have data, we just show a banner.
  if (error && error.toLowerCase().includes("session")) {
    const hasData =
      assignments.length > 0 || courses.length > 0 || metrics.upcoming7Days > 0;

    if (!hasData) {
      return <TokenRefreshPrompt />;
    }
  }

  return (
    <>
      {error && error.toLowerCase().includes("session") && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              <span>Sync is paused. Sign in to update your assignments.</span>
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        {activeAssignments.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/40 shadow-lg shadow-amber-100/50 dark:shadow-amber-950/20 animate-in slide-in-from-top-2">
            <div className="absolute inset-0 bg-grid-amber-200/20 dark:bg-grid-amber-800/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

            <div className="relative flex items-center justify-between p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-lg shadow-amber-500/30 shrink-0">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                    This Week's Focus
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    Complete{" "}
                    <span className="font-bold text-foreground">
                      "{activeAssignments[0]?.title || "Upcoming tasks"}"
                    </span>{" "}
                    by{" "}
                    {activeAssignments[0]?.dueDate
                      ? new Date(
                          activeAssignments[0].dueDate
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "the deadline"}
                  </p>
                </div>
              </div>
              {activeAssignments[0] && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAssignment(activeAssignments[0])}
                  className="hidden sm:flex border-amber-300 dark:border-amber-700 bg-white/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  View Assignment
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Draggable Dashboard Sections */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sectionOrder}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {sectionOrder.map((sectionId) => {
                // Define each section
                const sections: Record<string, React.ReactNode> = {
                  metrics: (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                      <div className="lg:col-span-3 h-full">
                        {/* Urgent: Overdue + 3 Days */}
                        <MetricCard
                          title="Urgent"
                          value={metrics.overdue + metrics.upcoming3Days}
                          description={
                            metrics.overdue + metrics.upcoming3Days === 0
                              ? "You're all caught up"
                              : "Overdue + due in 3 days"
                          }
                          icon={
                            metrics.overdue + metrics.upcoming3Days === 0
                              ? CheckCircle
                              : AlertCircle
                          }
                          variant={
                            metrics.overdue + metrics.upcoming3Days === 0
                              ? "success"
                              : "danger"
                          }
                          className="h-full"
                          onClick={() =>
                            setActiveFilter({
                              type: "urgent",
                              label: "Urgent Assignments",
                            })
                          }
                        />
                      </div>
                      <div className="lg:col-span-2 h-full">
                        {/* Upcoming: Next 7 Days */}
                        <MetricCard
                          title="Upcoming"
                          value={metrics.upcoming7Days}
                          description="Due this week"
                          icon={Calendar}
                          variant="default"
                          className="h-full"
                          onClick={() =>
                            setActiveFilter({
                              type: "upcoming",
                              label: "Upcoming (7 Days)",
                            })
                          }
                        />
                      </div>
                    </div>
                  ),
                  features: (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-10 gap-6">
                      <div className="lg:col-span-4 h-full">
                        <ClassActivityCard
                          courses={courses}
                          assignments={assignments}
                        />
                      </div>
                      <div className="lg:col-span-3 h-full">
                        <OverallAttendanceCard courses={courses} />
                      </div>
                      <div className="lg:col-span-3 h-full">
                        <DashboardBadgesCard />
                      </div>
                    </div>
                  ),
                  charts: (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:h-[450px]">
                      {/* Hero (NextActions) moved to Left (60%) */}
                      <div className="lg:col-span-3 h-full min-h-[300px]">
                        <NextActions
                          assignments={activeAssignments}
                          onSelectAssignment={setSelectedAssignment}
                          courses={courses}
                        />
                      </div>
                      {/* Charts moved to Right (40%) */}
                      <div className="lg:col-span-2 h-full min-h-[300px]">
                        <WeeklyWorkload assignments={activeAssignments} />
                      </div>
                    </div>
                  ),
                };

                return (
                  <SortableSection key={sectionId} id={sectionId}>
                    {sections[sectionId]}
                  </SortableSection>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <AssignmentDetail
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />

      <Sheet
        open={!!activeFilter}
        onOpenChange={(open) => !open && setActiveFilter(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              {activeFilter?.type === "urgent" && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              {activeFilter?.type === "upcoming" && (
                <Calendar className="h-5 w-5 text-blue-500" />
              )}
              {activeFilter?.type === "active" && (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              )}
              {activeFilter?.label}
            </SheetTitle>
            <SheetDescription>
              You have {filteredAssignments.length} assignments in this
              category.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {filteredAssignments.length > 0 ? (
              filteredAssignments.map((assignment) => (
                <AssignmentCardCompact
                  key={assignment.id}
                  assignment={assignment}
                  onClick={() => {
                    setActiveFilter(null);
                    setSelectedAssignment(assignment);
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p>No assignments found.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <OnboardingGuide />
    </>
  );
}
