import { useState, useEffect } from "react";
import { Bell, Trophy, CheckCircle2, Flame } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  doc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Activity } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function HeaderNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState<number>(() => {
    return parseInt(localStorage.getItem("lastNotificationRead") || "0");
  });

  useEffect(() => {
    if (!user) return;

    // 2. Listen to recent activities (Public Feed)
    const q = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newActivities = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Activity[];

      // Filter activities based on privacy and scope
      const filteredActivities = newActivities.filter((a) => {
        // 1. Filter out own activities (actions I took)
        if (!a.userId) return false;
        if (a.userId === user.uid) return false;

        // 3. Handle Scoped Public Activities (Badges etc)
        // If the activity has a domain, it must match my domain
        if (a.emailDomain && user.email) {
          const myDomain = user.email.split("@")[1];
          if (a.emailDomain !== myDomain) {
            return false;
          }
        }

        return true;
      });

      setActivities(filteredActivities);

      // Unread count is calculated in a separate effect below
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Effect to update total unread count
  useEffect(() => {
    const unreadActivities = activities.filter(
      (a) => new Date(a.createdAt).getTime() > lastReadTime
    ).length;
    setUnreadCount(unreadActivities);
  }, [activities, lastReadTime]);

  // Auto-cleanup: Delete old data to save storage
  useEffect(() => {
    if (!user) return;

    const cleanupOldData = async () => {
      try {
        // 1. Delete activities older than 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const activitiesRef = collection(db, "activities");
        const oldActivitiesQuery = query(
          activitiesRef,
          where("createdAt", "<", twentyFourHoursAgo.toISOString())
        );

        const activitiesSnapshot = await getDocs(oldActivitiesQuery);
        const deleteActivitiesPromises = activitiesSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref)
        );
        await Promise.all(deleteActivitiesPromises);

        if (activitiesSnapshot.docs.length > 0) {
          console.log(
            `Cleaned up ${activitiesSnapshot.docs.length} old activities`
          );
        }
      } catch (error) {
        console.error("Error cleaning up old data:", error);
      }
    };

    // Run cleanup immediately
    cleanupOldData();

    // Run cleanup every hour
    const intervalId = setInterval(cleanupOldData, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const now = Date.now();
      setLastReadTime(now);
      localStorage.setItem("lastNotificationRead", now.toString());
      // We don't clear request count, they remain pending/unread until actioned.
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
  };

  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "badge_earned":
        return <Trophy className="h-3 w-3 text-white fill-amber-100" />;
      case "streak_milestone":
        return <Flame className="h-3 w-3 text-white fill-orange-100" />;
      case "assignment_completed":
        return <CheckCircle2 className="h-3 w-3 text-white" />;
      default:
        return <Bell className="h-3 w-3 text-white" />;
    }
  };

  const getIconBg = (type: Activity["type"]) => {
    switch (type) {
      case "badge_earned":
        return "bg-amber-500 border-amber-200";
      case "streak_milestone":
        return "bg-orange-500 border-orange-200";
      case "assignment_completed":
        return "bg-emerald-500 border-emerald-200";
      default:
        return "bg-blue-500 border-blue-200";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground rounded-full w-9 h-9"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 mr-2 shadow-xl border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        align="end"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {activities.length > 0 ? (
            <div className="flex flex-col">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors border-b last:border-0 relative group"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={activity.userAvatar || undefined} />
                      <AvatarFallback>
                        {activity.userName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "absolute -bottom-1 -right-1 rounded-full p-0.5 border-[2px] border-background flex items-center justify-center w-5 h-5",
                        getIconBg(activity.type)
                      )}
                    >
                      {getIcon(activity.type)}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">{activity.userName}</span>{" "}
                      <span className="text-muted-foreground font-normal">
                        {activity.content.replace(activity.userName, "").trim()}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {formatTime(activity.createdAt)}
                    </p>
                  </div>
                  {/* Unread indicator for activities */}
                  {new Date(activity.createdAt).getTime() > lastReadTime && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-2">
              <div className="p-3 bg-muted rounded-full">
                <Bell className="h-6 w-6 opacity-20" />
              </div>
              <p className="text-sm">No new activity</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
