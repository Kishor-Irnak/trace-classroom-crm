import { useState, useEffect } from "react";
import { Bell, Heart, Trophy, CheckCircle2, Flame } from "lucide-react";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Activity } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function HeaderNotifications() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState<number>(() => {
    return parseInt(localStorage.getItem("lastNotificationRead") || "0");
  });

  useEffect(() => {
    if (!user) return;

    // Listen to recent activities
    // In a real app, we would filter by 'accessible' courses.
    // For this prototype, we'll listen to global 'activities' and filter client-side or assume public feed.
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

      // Filter out own activities
      const othersActivities = newActivities.filter(
        (a) => a.userId !== user.uid
      );

      setActivities(othersActivities);

      // Calculate unread count
      const count = othersActivities.filter(
        (a) => new Date(a.createdAt).getTime() > lastReadTime
      ).length;
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user, lastReadTime]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Mark as read after a short delay or immediately
      const now = Date.now();
      setLastReadTime(now);
      localStorage.setItem("lastNotificationRead", now.toString());
      setUnreadCount(0);
    }
  };

  const formatTime = (isoString: string) => {
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
                  {/* Unread indicator dot for specific items could go here if we tracked per-item read status */}
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
