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
          Class Ranking
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
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  #{rankData.rank}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  / {rankData.total}
                </span>
              </div>

              <div className="mt-2 space-y-1">
                {/* Percentile Bar */}
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                    style={{ width: `${rankData.percentile}%` }}
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-0.5">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Top{" "}
                  {100 - rankData.percentile < 1
                    ? 1
                    : 100 - rankData.percentile}
                  % of class
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  {rankData.xp.toLocaleString()} Total XP
                </p>
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
  variant = "default",
}: {
  title: string;
  value: number;
  icon: typeof Clock;
  variant?: "default" | "warning" | "danger";
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
  };

  const styles = variantStyles[variant];

  return (
    <Card
      data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn(
        "group overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        styles.bg,
        styles.border,
        "hover:ring-1",
        styles.ring
      )}
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
      </CardContent>
    </Card>
  );
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

function WeeklyWorkload({
  data,
}: {
  data: { day: string; count: number; isToday: boolean }[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 5); // Minimum scale of 5 for visuals
  // Chart dimensions essentially percentages
  const width = 300;
  const height = 100; // viewBox units

  const pathLine = getSmoothPath(data, width, height, maxCount);
  const pathArea = `${pathLine} L ${width},${height} L 0,${height} Z`;

  return (
    <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            Weekly Workload
          </CardTitle>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">
              {data.reduce((sum, d) => sum + d.count, 0)}
            </span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Assignments
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Your assignment distribution for the next 7 days
        </p>
      </CardHeader>
      <CardContent className="pt-6 relative">
        <div className="h-40 w-full relative group">
          {/* Chart SVG */}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgb(168 85 247)"
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(168 85 247)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            {/* Area Fill */}
            <path
              d={pathArea}
              fill="url(#gradientArea)"
              className="transition-all duration-500"
            />
            {/* Line Stroke */}
            <path
              d={pathLine}
              fill="none"
              stroke="rgb(168 85 247)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm transition-all duration-500"
            />
          </svg>

          {/* Data Points & Tooltips (Aligned absolute over SVG) */}
          <div className="absolute inset-0 flex justify-between items-end pointer-events-none">
            {data.map((item, index) => {
              const relativeHeight = (item.count / maxCount) * 100;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-end h-full flex-1 relative group/point"
                >
                  {/* Tooltip-like point */}
                  <div
                    className="absolute w-full flex justify-center transition-all duration-500"
                    style={{
                      bottom: `${relativeHeight}%`,
                      marginBottom: "-6px",
                    }}
                  >
                    {/* Dot */}
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full border-2 border-background transition-transform duration-300 z-10",
                        item.isToday
                          ? "bg-purple-600 scale-125 ring-4 ring-purple-500/20"
                          : "bg-purple-400 opacity-0 group-hover/point:opacity-100 group-hover/point:scale-125"
                      )}
                    />

                    {/* Tooltip Value */}
                    <div
                      className={cn(
                        "absolute bottom-full mb-2 bg-foreground text-background text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/point:opacity-100 transition-opacity duration-200 pointer-events-auto",
                        item.isToday && "opacity-100 bg-purple-600 text-white"
                      )}
                    >
                      {item.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between mt-2 px-1">
          {data.map((item, index) => (
            <div key={index} className="flex-1 text-center">
              <span
                className={cn(
                  "text-[10px] uppercase font-bold tracking-wider transition-colors",
                  item.isToday ? "text-purple-600" : "text-muted-foreground"
                )}
              >
                {item.day}
              </span>
            </div>
          ))}
        </div>
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
  const navigate = () => {}; // Helper to just define render

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

  const topAssignments = sorted; // Show all to allow scrolling

  const getPriorityInfo = (assignment: Assignment) => {
    if (assignment.systemStatus === "overdue")
      return {
        label: "Overdue",
        color: "text-red-500",
        bg: "bg-red-500/10",
        border: "border-red-200 dark:border-red-900/50",
      };

    if (assignment.dueDate) {
      const now = new Date();
      const due = new Date(assignment.dueDate);
      const hours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hours < 24)
        return {
          label: "Due Soon",
          color: "text-amber-500",
          bg: "bg-amber-500/10",
          border: "border-amber-200 dark:border-amber-900/50",
        };
      if (hours < 72)
        return {
          label: "Upcoming",
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          border: "border-zinc-100 dark:border-zinc-800",
        };
    }

    return {
      label: "Backlog",
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-zinc-100 dark:border-zinc-800",
    };
  };

  return (
    <Card className="flex flex-col h-full border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            Next Actions
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {assignments.length} pending
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Prioritized by deadline and urgency
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <div className="p-3 space-y-2">
          {topAssignments.length > 0 ? (
            topAssignments.map((assignment) => {
              const p = getPriorityInfo(assignment);
              const dueDate = assignment.dueDate
                ? new Date(assignment.dueDate)
                : null;

              // Find the course color
              const course = courses.find((c) => c.id === assignment.courseId);
              const courseColor = course?.color;

              return (
                <div
                  key={assignment.id}
                  onClick={() => onSelectAssignment(assignment)}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 bg-card cursor-pointer relative overflow-hidden",
                    p.border
                  )}
                >
                  {/* Subtle hover background */}
                  <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-[0.02] transition-opacity" />

                  {/* Priority Indicator Pill */}
                  <div
                    className={cn(
                      "w-1 h-8 rounded-full flex-shrink-0",
                      p.bg.replace("/10", "")
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate text-foreground/90 group-hover:text-primary transition-colors">
                        {assignment.title}
                      </h4>
                      {assignment.systemStatus === "overdue" && (
                        <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-1 rounded-full">
                          <AlertCircle className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 font-medium border-0"
                        style={{
                          backgroundColor: courseColor || undefined,
                          color: courseColor
                            ? getTextColor(courseColor)
                            : undefined,
                        }}
                      >
                        {assignment.courseName}
                      </Badge>
                      {dueDate && (
                        <span
                          className={cn(
                            "text-[10px] flex items-center gap-1 font-medium",
                            p.color
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {dueDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover Action */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-foreground">
                All caught up!
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-[180px]">
                No pending actions for now. Great job staying on top of things.
              </p>
            </div>
          )}
        </div>
      </CardContent>
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {metrics.upcoming7Days > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/40 shadow-lg shadow-amber-100/50 dark:shadow-amber-950/20 animate-in slide-in-from-top-2">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 bg-grid-amber-200/20 dark:bg-grid-amber-800/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

            <div className="relative flex items-center justify-between p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-lg shadow-amber-500/30 shrink-0">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                    Weekly Focus
                    <Badge
                      variant="secondary"
                      className="bg-amber-200/60 dark:bg-amber-800/40 text-amber-900 dark:text-amber-100 border-0 text-xs font-bold"
                    >
                      {metrics.upcoming7Days}{" "}
                      {metrics.upcoming7Days === 1 ? "task" : "tasks"}
                    </Badge>
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    You have{" "}
                    <span className="font-bold text-amber-900 dark:text-amber-100">
                      {metrics.upcoming7Days} assignment
                      {metrics.upcoming7Days !== 1 ? "s" : ""}
                    </span>{" "}
                    due within the next 7 days.
                  </p>
                </div>
              </div>
              {/* Action can be context-aware, e.g., view timeline */}
              <Link href="/timeline">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex border-amber-300 dark:border-amber-700 bg-white/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm"
                >
                  View Timeline
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard
                        title="Due in 3 Days"
                        value={metrics.upcoming3Days}
                        icon={Clock}
                        variant={
                          metrics.upcoming3Days > 3 ? "warning" : "default"
                        }
                      />
                      <MetricCard
                        title="Due in 7 Days"
                        value={metrics.upcoming7Days}
                        icon={Calendar}
                      />
                      <MetricCard
                        title="Overdue"
                        value={metrics.overdue}
                        icon={AlertCircle}
                        variant={metrics.overdue > 0 ? "danger" : "default"}
                      />
                      <MetricCard
                        title="Total Active"
                        value={metrics.totalActive}
                        icon={CheckCircle}
                      />
                    </div>
                  ),
                  features: (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <ClassActivityCard
                        courses={courses}
                        assignments={assignments}
                      />
                      <OverallAttendanceCard courses={courses} />
                      <DashboardBadgesCard />
                    </div>
                  ),
                  charts: (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[340px]">
                      <div className="lg:col-span-2 h-full min-h-[300px]">
                        <WeeklyWorkload data={metrics.weeklyWorkload} />
                      </div>
                      <div className="lg:col-span-1 h-full min-h-[300px]">
                        <NextActions
                          assignments={activeAssignments}
                          onSelectAssignment={setSelectedAssignment}
                          courses={courses}
                        />
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
    </>
  );
}
