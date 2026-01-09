import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { BadgeList } from "@/components/badge-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal, Target, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { BADGES } from "@/lib/badges";

export function DashboardBadgesCard() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<string[]>([]);
  const [loginStreak, setLoginStreak] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, "leaderboards", "all-courses", "students", user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setBadges(data.badges || []);
          setLoginStreak(data.loginStreak || 0);
          setSubmissionCount(data.processedAssignmentIds?.length || 0);
        }
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // Calculate next badge progress
  const getNextBadgeProgress = () => {
    const candidates = [];

    // Check 5-day streak

    // Check 10 submissions
    if (!badges.includes("10-submissions")) {
      candidates.push({
        badge: BADGES["10-submissions"],
        current: submissionCount,
        target: 10,
        percentage: Math.min((submissionCount / 10) * 100, 100),
        type: "submission" as const,
        label: "Submissions",
      });
    }

    // Check Perfect Week (7 days, 100% attendance)
    if (!badges.includes("perfect-week")) {
      candidates.push({
        badge: BADGES["perfect-week"],
        current: 0,
        target: 7,
        percentage: 0,
        type: "attendance" as const,
        label: "Days Perfect",
      });
    }

    // Check Attendance Champion (30 days, 90% attendance)
    if (!badges.includes("attendance-champion")) {
      candidates.push({
        badge: BADGES["attendance-champion"],
        current: 0,
        target: 30,
        percentage: 0,
        type: "attendance" as const,
        label: "Days Tracked",
      });
    }

    if (candidates.length === 0) return null;

    // Return the one with highest progress
    return candidates.reduce((best, current) =>
      current.percentage > best.percentage ? current : best
    );
  };

  const nextBadge = getNextBadgeProgress();

  return (
    <Card className="flex flex-col h-full" data-testid="card-dashboard-badges">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          My Badges
        </CardTitle>
        <Medal className="h-5 w-5 text-purple-500" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : nextBadge ? (
          <div className="flex flex-col gap-3 justify-between h-full">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {nextBadge.badge.imageSrc ? (
                  <img
                    src={nextBadge.badge.imageSrc}
                    alt={nextBadge.badge.label}
                    className="h-8 w-8 object-contain"
                  />
                ) : nextBadge.type === "submission" ? (
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {nextBadge.badge.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Next to unlock
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-medium text-muted-foreground">
                    Progress
                  </span>
                  <span className="font-bold text-foreground">
                    {Math.round(nextBadge.percentage)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      nextBadge.type === "submission"
                        ? "bg-blue-500"
                        : "bg-emerald-500"
                    )}
                    style={{ width: `${nextBadge.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right font-medium">
                  {nextBadge.target - nextBadge.current} more needed
                </p>
              </div>
            </div>

            <div className="pt-2 mt-auto border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {badges.length} Unlocked
                </span>
                <Link href="/settings?tab=badges">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 hover:bg-secondary"
                  >
                    View All
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          // Fallback if all badges earned or data loading issue
          <div className="flex flex-col justify-center items-center h-full text-center p-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full mb-3">
              <Medal className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-bold">All Badges Unlocked!</p>
            <p className="text-xs text-muted-foreground mt-1">
              You are a legend.
            </p>
            <Link href="/settings?tab=badges" className="mt-4 w-full">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
              >
                View Collection
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
