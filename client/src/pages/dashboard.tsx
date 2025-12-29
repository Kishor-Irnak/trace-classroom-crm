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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

// --- Loading Configuration ---

import { EnhancedLoadingScreen } from "@/components/enhanced-loading-screen";

// --- Loading Components ---

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
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
  return (
    <Card
      data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "h-5 w-5",
            variant === "default" && "text-muted-foreground",
            variant === "warning" && "text-foreground",
            variant === "danger" && "text-destructive"
          )}
        />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-semibold font-mono tracking-tight",
            variant === "danger" && "text-destructive"
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weekly Workload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 h-32">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <span className="text-xs font-mono text-muted-foreground">
                {item.count > 0 ? item.count : ""}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all",
                  item.isToday ? "bg-foreground" : "bg-muted",
                  item.count === 0 && "min-h-[4px]"
                )}
                style={{
                  height:
                    item.count > 0
                      ? `${(item.count / maxCount) * 80}px`
                      : "4px",
                }}
              />
              <span
                className={cn(
                  "text-xs",
                  item.isToday ? "font-medium" : "text-muted-foreground"
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
  } = useClassroom();
  const { signOut } = useAuth();
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const metrics = getDashboardMetrics();

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="text-center space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-lg font-medium text-destructive">
            Troubleshooting
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            It seems data isn't fetching correctly. Please log out and log in
            again to resolve this.
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

  return (
    <>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {metrics.upcoming7Days > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-md text-blue-700 dark:text-blue-300">
                <AlertCircle className="h-4 w-4" />
              </div>
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                ⚠️ {metrics.upcoming7Days} assignment
                {metrics.upcoming7Days !== 1 ? "s" : ""} due this week
              </p>
            </div>
            <Link href="/settings/notifications">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-700 dark:text-blue-300 hover:text-blue-800 hover:bg-blue-100/50 h-8"
              >
                Enable email reminders
              </Button>
            </Link>
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
