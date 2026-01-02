import { Link } from "wouter";
import { BadgeList } from "@/components/badge-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal, Flame, Target, CalendarDays } from "lucide-react";
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
    candidates.push({
      badge: BADGES["5-day-consistent"],
      current: loginStreak || 1,
      target: 5,
      percentage: Math.min(((loginStreak || 1) / 5) * 100, 100),
      type: "streak" as const,
      label: "Days",
    });

    // Check 10 submissions
    candidates.push({
      badge: BADGES["10-submissions"],
      current: submissionCount,
      target: 10,
      percentage: Math.min((submissionCount / 10) * 100, 100),
      type: "submission" as const,
      label: "Submissions",
    });

    // Check Perfect Week (7 days, 100% attendance)
    // For now, we'll estimate based on a simple metric
    // This would need actual attendance data from the attendance page
    // Placeholder: assume 0% for now unless we have attendance data
    candidates.push({
      badge: BADGES["perfect-week"],
      current: 0,
      target: 7,
      percentage: 0,
      type: "attendance" as const,
      label: "Days Perfect",
    });

    // Check Attendance Champion (30 days, 90% attendance)
    candidates.push({
      badge: BADGES["attendance-champion"],
      current: 0,
      target: 30,
      percentage: 0,
      type: "attendance" as const,
      label: "Days Tracked",
    });

    // Return the one with highest progress
    return candidates.reduce((best, current) =>
      current.percentage > best.percentage ? current : best
    );
  };

  const nextBadge = badges.length === 0 ? getNextBadgeProgress() : null;

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
        ) : badges.length > 0 ? (
          <div className="flex flex-col justify-between h-full gap-2">
            <div>
              <div className="text-2xl font-semibold font-mono tracking-tight">
                {badges.length}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  Achievements
                </span>
              </div>
              <BadgeList badges={badges} limit={3} size="md" className="mt-2" />
            </div>
            <div className="pt-2 mt-auto">
              <Link href="/settings?tab=badges">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs w-full"
                >
                  View All Badges
                </Button>
              </Link>
            </div>
          </div>
        ) : nextBadge ? (
          <div className="flex flex-col gap-3 justify-between h-full">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {nextBadge.type === "streak" ? (
                  <Flame className="h-5 w-5 text-orange-500" />
                ) : nextBadge.type === "submission" ? (
                  <Target className="h-5 w-5 text-blue-500" />
                ) : (
                  <CalendarDays className="h-5 w-5 text-emerald-500" />
                )}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">
                    {nextBadge.badge.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {nextBadge.badge.description}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      nextBadge.type === "streak"
                        ? "bg-orange-500"
                        : nextBadge.type === "submission"
                        ? "bg-blue-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${nextBadge.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {Math.round(nextBadge.percentage)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold">
                    {nextBadge.current} / {nextBadge.target} {nextBadge.label}
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-2 mt-auto">
              <Link href="/settings?tab=badges">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs w-full"
                >
                  View All Badges
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 justify-between h-full">
            <span className="text-sm text-muted-foreground">
              No badges earned yet.
            </span>
            <div className="pt-2 mt-auto">
              <Link href="/settings?tab=badges">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs w-full"
                >
                  View All Badges
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
