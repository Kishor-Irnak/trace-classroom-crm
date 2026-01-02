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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentCardCompact } from "@/components/assignment-card";
import { AssignmentDetail } from "@/components/assignment-detail";
import { useClassroom, fetchAllPages } from "@/lib/classroom-context";
import { useAuth } from "@/lib/auth-context";
import type { Assignment } from "@shared/schema";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { AttendanceService } from "@/services/attendance-service";
import { UserCheck } from "lucide-react";
import { BadgeList } from "@/components/badge-ui";
import { DashboardBadgesCard } from "@/components/dashboard-badges-card";
import { StreakCard } from "@/components/streak-card";
import { TokenRefreshPrompt } from "@/components/token-refresh-prompt";

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
            // Skip if not visible or no config
            if (!config || !config.isVisible || !config.sheetUrl) return;

            // Simple lock check mechanism similar to attendance page
            // For dashboard, we might only show "unlocked" data to avoid prompting for keys here,
            // OR we just try to fetch and if it fails (due to protected sheet needing logic not handled here), we skip.
            // However, the service `fetchAttendanceFromSheet` usually requires a sheetID.
            // If the sheet itself is protected by the app's 'lock' logic, it's just a client-side gate usually.
            // Let's assume we can fetch if we have the config.

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
    <Card data-testid="card-attendance-overall">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Overall Attendance
        </CardTitle>
        <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : stats ? (
          <div>
            <div
              className={cn(
                "text-3xl font-semibold font-mono tracking-tight flex items-baseline gap-2",
                stats.status === "danger"
                  ? "text-red-500"
                  : stats.status === "warning"
                  ? "text-amber-500"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {stats.percentage}%
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              <p className="text-xs font-medium text-muted-foreground">
                {stats.present}/{stats.total} Classes Attended
              </p>
              <p
                className={cn(
                  "text-[10px] uppercase tracking-wider font-bold",
                  stats.status === "safe"
                    ? "text-emerald-500"
                    : stats.status === "warning"
                    ? "text-amber-500"
                    : "text-red-500"
                )}
              >
                {stats.status === "safe" ? "On Track" : "Low Attendance"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                No Attendance Yet
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Ask your teacher to login to Trace to track real-time attendance
              </p>
            </div>
            <Link href="/attendance">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full mt-1"
              >
                View Details
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Loading Configuration ---

import { EnhancedLoadingScreen } from "@/components/enhanced-loading-screen";

// --- Loading Components ---

import { MetricSkeleton, AssignmentRowSkeleton } from "@/components/skeletons";

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
      bg: "bg-gradient-to-br from-background to-muted/30",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      valueColor: "text-foreground",
      border: "border-border hover:border-primary/50",
    },
    warning: {
      bg: "bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800 hover:border-amber-400",
    },
    danger: {
      bg: "bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10",
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
      valueColor: "text-destructive",
      border: "border-red-200 dark:border-red-800 hover:border-destructive",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card
      data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        styles.border
      )}
    >
      <CardHeader className={cn("pb-3", styles.bg)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </CardTitle>
          <div className={cn("p-2 rounded-lg", styles.iconBg)}>
            <Icon className={cn("h-4 w-4", styles.iconColor)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div
          className={cn(
            "text-3xl font-bold font-mono tracking-tight tabular-nums",
            styles.valueColor
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyWorkload({
  data,
}: {
  data: { day: string; count: number; isToday: boolean }[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Weekly Workload
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {data.reduce((sum, d) => sum + d.count, 0)} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-end justify-between gap-3 h-36">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-1 group"
            >
              <span
                className={cn(
                  "text-xs font-bold tabular-nums transition-all",
                  item.count > 0
                    ? item.isToday
                      ? "text-primary"
                      : "text-muted-foreground"
                    : "text-transparent"
                )}
              >
                {item.count > 0 ? item.count : "0"}
              </span>
              <div className="relative w-full">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-500 ease-out relative overflow-hidden",
                    item.isToday
                      ? "bg-gradient-to-t from-primary to-primary/70 shadow-lg shadow-primary/20"
                      : "bg-gradient-to-t from-muted to-muted/50",
                    item.count === 0 && "min-h-[4px] opacity-30",
                    "group-hover:scale-105 group-hover:shadow-xl"
                  )}
                  style={{
                    height:
                      item.count > 0
                        ? `${(item.count / maxCount) * 96}px`
                        : "4px",
                  }}
                >
                  {item.count > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  item.isToday
                    ? "text-primary font-bold"
                    : "text-muted-foreground group-hover:text-foreground"
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

// --- Class Activity Component ---
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
    <Card data-testid="card-class-rank">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Class Ranking
        </CardTitle>
        <Trophy className="h-5 w-5 text-amber-500" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : rankData ? (
          <div>
            <div className="text-3xl font-semibold font-mono tracking-tight flex items-baseline gap-2">
              #{rankData.rank}
              <span className="text-base text-muted-foreground font-normal">
                / {rankData.total}
              </span>
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              <p className="text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Top{" "}
                {100 - rankData.percentile < 1 ? 1 : 100 - rankData.percentile}%
                of class
              </p>
              <p className="text-[10px] text-muted-foreground">
                {rankData.xp.toLocaleString()} Total XP
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-lg font-medium text-muted-foreground">
              Unranked
            </span>
            <Link href="/leaderboard">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
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

// --- Loading Components ---

// --- Main Page Component ---

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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const metrics = getDashboardMetrics();

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
              {/* We don't have a route, better to trigger a modal or just refresh page? 
                  The TokenRefreshPrompt uses refreshAccessToken(). 
                  Let's reuse the logic via a small button here.
               */}
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
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Due in 3 Days"
            value={metrics.upcoming3Days}
            icon={Clock}
            variant={metrics.upcoming3Days > 3 ? "warning" : "default"}
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
          <ClassActivityCard courses={courses} assignments={assignments} />
          <OverallAttendanceCard courses={courses} />
          <DashboardBadgesCard />
          <StreakCard />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <WeeklyWorkload data={metrics.weeklyWorkload} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Next Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics.nextActions.length > 0 ? (
                metrics.nextActions.map((assignment) => (
                  <AssignmentCardCompact
                    key={assignment.id}
                    assignment={assignment}
                    onClick={() => setSelectedAssignment(assignment)}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mb-2" />
                  <p className="text-sm">All caught up!</p>
                </div>
              )}
            </CardContent>
          </Card>
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
