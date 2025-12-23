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

const LOADING_TIPS = [
  "Check the 'Weekly Workload' graph to balance your study schedule.",
  "Assignments due in less than 3 days appear in the warning card.",
  "The 'Next Actions' list prioritizes your most urgent tasks.",
  "Syncing automatically refreshes assignment status from Google Classroom.",
  "Click on any assignment in the list to view full details.",
  "Overdue items are highlighted in red to grab your attention.",
];

// --- Metric & Chart Components ---

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
function ClassActivityCard({ courses }: { courses: import("@shared/schema").Course[] }) {
  const { user } = useAuth();
  const [rankData, setRankData] = useState<{rank: number; total: number; percentile: number; xp: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;

    // Listen to the global leaderboard
    const q = query(
      collection(db, "leaderboards", "all-courses", "students"), 
      orderBy("totalXP", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const total = students.length;
        
        if (total === 0) {
            setRankData(null);
            setIsLoading(false);
            return;
        }

        const myIndex = students.findIndex((s) => s.id === user.uid);
        
        if (myIndex !== -1) {
            const rank = myIndex + 1;
            // Percentile calculation: High percentile = Top of class
            // Rank 1/100 -> 99th percentile (Top 1%) ? 
            // Usually "Top 1%" means 99th percentile.
            // Let's stick to the previous formula: (total - rank + 1) / total * 100
            const percentile = Math.round(((total - rank + 1) / total) * 100);
            const myData = students[myIndex];

            setRankData({
                rank,
                total,
                percentile,
                xp: myData.totalXP || 0
            });
        } else {
            // User not in leaderboard yet
            setRankData(null);
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching leaderboard for dashboard:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
                    <span className="text-base text-muted-foreground font-normal">/ {rankData.total}</span>
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                    <p className="text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                        Top {100 - rankData.percentile < 1 ? 1 : 100 - rankData.percentile}% of class
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {rankData.xp.toLocaleString()} Total XP
                    </p>
                </div>
            </div>
        ) : (
             <div className="flex flex-col gap-2">
                 <span className="text-lg font-medium text-muted-foreground">Unranked</span>
                 <Link href="/leaderboard">
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full">
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
    <div className="relative min-h-[calc(100vh-4rem)] w-full bg-background">
      {/* Background Structure (Your DashboardSkeleton) */}
      <div className="opacity-40 pointer-events-none select-none filter grayscale">
        <DashboardSkeleton />
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
              Analyzing Metrics
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
              <span>Calculating Stats</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Tips Section */}
          <div className="flex gap-3 items-start bg-white border border-zinc-200 p-4 rounded-md shadow-sm max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Lightbulb className="h-4 w-4 text-zinc-900 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                Pro Tip
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

export default function DashboardPage() {
  const { getDashboardMetrics, isLoading, isSyncing, assignments, syncClassroom, courses } =
    useClassroom();
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const metrics = getDashboardMetrics();

  // Updated to use the new Enhanced Loader


  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="text-center space-y-2">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-medium">No data yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Sync your Google Classroom to see your dashboard with metrics and
            insights.
          </p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            syncClassroom().catch((err) => {
              console.error("Sync failed:", err);
            });
          }}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-sync-empty-dashboard"
        >
          Sync Google Classroom
        </button>
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
                        ⚠️ {metrics.upcoming7Days} assignment{metrics.upcoming7Days !== 1 ? 's' : ''} due this week
                    </p>
                </div>
                <Link href="/settings/notifications">
                    <Button variant="ghost" size="sm" className="text-blue-700 dark:text-blue-300 hover:text-blue-800 hover:bg-blue-100/50 h-8">
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
          <ClassActivityCard courses={courses} />
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
