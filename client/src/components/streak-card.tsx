import { useEffect, useState } from "react";
import { Link } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame } from "lucide-react";

export function StreakCard() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, "leaderboards", "all-courses", "students", user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setStreak(data.loginStreak || 0);
        } else {
          setStreak(0);
        }
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  return (
    <Card className="flex flex-col h-full" data-testid="card-streak">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Current Streak
        </CardTitle>
        <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <div>
            <div className="text-3xl font-semibold font-mono tracking-tight flex items-baseline gap-2">
              {streak}
              <span className="text-sm font-normal text-muted-foreground">
                Days
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {streak && streak > 0
                ? "You're on fire! Keep coming back."
                : "Log in daily to build your streak!"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
