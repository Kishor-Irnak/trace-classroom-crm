import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "wouter";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  LogOut,
  RefreshCw,
  Download,
  Smartphone,
  Moon,
  Sun,
  Loader2,
  Lightbulb,
  Mail,
  Calendar,
  Medal, // Added
} from "lucide-react";
import { BadgeShowroom } from "@/components/badge-showroom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useClassroom } from "@/lib/classroom-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useTheme } from "@/lib/theme-context";

function SettingsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const LOADING_TIPS = [
  "Customizing your profile makes the experience more personal.",
  "Enable background sync to keep your assignments always up to date.",
  "Dark mode is easier on the eyes during late-night study sessions.",
  "Installing the app gives you valid offline access to your data.",
];

function EnhancedLoadingScreen() {
  const [progress, setProgress] = useState(10);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) return 100;
        const diff = Math.random() * 10;
        return Math.min(oldProgress + diff, 90);
      });
    }, 500);

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
      <div className="opacity-40 pointer-events-none select-none filter grayscale">
        <SettingsSkeleton />
      </div>
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
        <div className="w-full max-w-md p-6 space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 bg-zinc-950 rounded flex items-center justify-center text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Syncing Settings
            </h2>
          </div>
          <div className="space-y-2">
            <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-950 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
              <span>Updating Preferences</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="flex gap-3 items-start bg-white border border-zinc-200 p-4 rounded-md shadow-sm max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Lightbulb className="h-4 w-4 text-zinc-900 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                Quick Tip
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

interface CalendarIntegrationSettings {
  enabled: boolean;
  syncAssignments: boolean;
  syncExams: boolean;
  syncPersonal: boolean;
  connectedAt?: any;
  lastSyncedAt?: any;
}

function IntegrationsTabContent() {
  const { user, requestCalendarPermissions } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendarSettings, setCalendarSettings] =
    useState<CalendarIntegrationSettings>({
      enabled: false,
      syncAssignments: true,
      syncExams: true,
      syncPersonal: false,
    });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "settings", "calendar"),
      (snapshot) => {
        if (snapshot.exists()) {
          setCalendarSettings(snapshot.data() as CalendarIntegrationSettings);
        }
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleConnectCalendar = async () => {
    setIsConnecting(true);
    try {
      const success = await requestCalendarPermissions();
      if (success) {
        await setDoc(
          doc(db, "users", user!.uid, "settings", "calendar"),
          {
            ...calendarSettings,
            enabled: true,
            connectedAt: new Date(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await setDoc(
        doc(db, "users", user!.uid, "settings", "calendar"),
        {
          enabled: false,
        },
        { merge: true }
      );
    } catch (error) {
      console.error(error);
    }
  };

  const updateCalendarSetting = async (
    key: keyof CalendarIntegrationSettings,
    value: boolean
  ) => {
    setCalendarSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await setDoc(
        doc(db, "users", user!.uid, "settings", "calendar"),
        {
          [key]: value,
        },
        { merge: true }
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Calendar Card */}
      <Card
        className={`rounded-md border shadow-sm transition-all duration-200 ${
          calendarSettings.enabled
            ? "ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50"
            : "hover:border-zinc-300 dark:hover:border-zinc-700"
        }`}
      >
        <div className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground shrink-0 border border-border">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    Google Calendar
                  </h3>
                  {calendarSettings.enabled && (
                    <Badge
                      variant="outline"
                      className="rounded-sm px-1.5 py-0 text-[10px] font-medium bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700"
                    >
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sync deadlines and exams directly to your calendar.
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {calendarSettings.enabled ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectCalendar}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md h-9 px-4"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleConnectCalendar}
                disabled={isConnecting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md h-9 px-4 shadow-sm w-full sm:w-auto"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            )}
          </div>
        </div>

        {calendarSettings.enabled && (
          <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-300">
            <div className="h-px w-full bg-border mb-6" />

            <div className="space-y-4 pl-[3.25rem]">
              {" "}
              {/* Indent to align with text */}
              <div className="grid gap-3 max-w-xl">
                <div className="flex items-center justify-between p-3 rounded-md border border-border bg-background/50 hover:bg-accent/5 transition-colors">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-foreground">
                      Assignment Deadlines
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Create events for assignment due dates
                    </p>
                  </div>
                  <Switch
                    checked={calendarSettings.syncAssignments}
                    onCheckedChange={(c) =>
                      updateCalendarSetting("syncAssignments", c)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border border-border bg-background/50 hover:bg-accent/5 transition-colors">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-foreground">
                      Exams
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Create events for scheduled exams
                    </p>
                  </div>
                  <Switch
                    checked={calendarSettings.syncExams}
                    onCheckedChange={(c) =>
                      updateCalendarSetting("syncExams", c)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>
                  Last synced:{" "}
                  {calendarSettings.lastSyncedAt
                    ? new Date(
                        calendarSettings.lastSyncedAt.seconds * 1000
                      ).toLocaleString()
                    : "Pending..."}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Notifications Card */}
      <Card className="rounded-md border shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
        <div className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground shrink-0 border border-border">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Notifications
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage email alerts for due assignments and updates.
                </p>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <Link href="/settings/notifications">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md h-9 px-4 w-full sm:w-auto"
              >
                Configure
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut, updateUserProfile } = useAuth();
  const { lastSyncedAt, isSyncing, syncClassroom, isLoading, courses } =
    useClassroom();
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const { theme, setTheme } = useTheme();
  const [backgroundSync, setBackgroundSync] = useState(true);
  const [timezone, setTimezone] = useState("auto");

  const [isInstalling, setIsInstalling] = useState(false);
  const [myBadges, setMyBadges] = useState<string[]>([]);
  const [loginStreak, setLoginStreak] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState<
    { total: number; attended: number } | undefined
  >();
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["general", "badges", "integrations"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, "leaderboards", "all-courses", "students", user.uid),
      (docCb) => {
        if (docCb.exists()) {
          const data = docCb.data();
          setMyBadges(data.badges || []);
          setLoginStreak(data.loginStreak || 0);
          setSubmissionCount(data.processedAssignmentIds?.length || 0);
        } else {
          setMyBadges([]);
          setLoginStreak(0);
          setSubmissionCount(0);
        }
      }
    );
    return () => unsub();
  }, [user]);

  // Calculate attendance stats from courses
  useEffect(() => {
    if (!courses || courses.length === 0) return;

    let totalClasses = 0;
    let attendedClasses = 0;

    courses.forEach((course) => {
      // Check if course has attendance data
      if (course.attendanceData && typeof course.attendanceData === "object") {
        const records = Object.values(course.attendanceData);
        totalClasses += records.length;
        attendedClasses += records.filter((r: any) => {
          // Handle different formats: 'present', 'PRESENT', true, 1
          if (typeof r === "string") {
            return r.toLowerCase() === "present";
          }
          return r === true || r === 1;
        }).length;
      }
    });

    if (totalClasses > 0) {
      setAttendanceStats({ total: totalClasses, attended: attendedClasses });
    }
  }, [courses]);

  // Auto-award badges based on current stats
  useEffect(() => {
    if (!user || activeTab !== "badges") return;

    const checkAndAwardBadges = async () => {
      const userRef = doc(
        db,
        "leaderboards",
        "all-courses",
        "students",
        user.uid
      );
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const currentBadges = new Set(data.badges || []);
      let badgesChanged = false;

      // Check streak badges
      const streak = data.loginStreak || 0;
      if (streak >= 5 && !currentBadges.has("5-day-consistent")) {
        currentBadges.add("5-day-consistent");
        badgesChanged = true;
      }
      if (streak >= 10 && !currentBadges.has("10-day-consistent")) {
        currentBadges.add("10-day-consistent");
        badgesChanged = true;
      }
      if (streak >= 30 && !currentBadges.has("30-day-consistent")) {
        currentBadges.add("30-day-consistent");
        badgesChanged = true;
      }

      // Check submission badges
      const submissions = data.processedAssignmentIds?.length || 0;
      if (submissions >= 10 && !currentBadges.has("10-submissions")) {
        currentBadges.add("10-submissions");
        badgesChanged = true;
      }
      if (submissions >= 25 && !currentBadges.has("25-submissions")) {
        currentBadges.add("25-submissions");
        badgesChanged = true;
      }
      if (submissions >= 50 && !currentBadges.has("50-submissions")) {
        currentBadges.add("50-submissions");
        badgesChanged = true;
      }

      // Update if badges changed
      if (badgesChanged) {
        await setDoc(
          userRef,
          {
            badges: Array.from(currentBadges),
          },
          { merge: true }
        );

        // Define new badges locally to track strictly what was added in this run
        // We can infer it by checking difference, but simpler to track inline above.
        // Actually, let's just re-run the logic cleanly or track in a Set.

        const addedBadges: string[] = [];
        const originalBadges = new Set(data.badges || []);
        currentBadges.forEach((b) => {
          if (!originalBadges.has(b as string)) addedBadges.push(b as string);
        });

        // Log activities
        const { BADGES } = await import("@/lib/badges"); // Dynamic import to avoid top-level cycle if any

        for (const badgeId of addedBadges) {
          await addDoc(collection(db, "activities"), {
            userId: user.uid,
            userName: user.displayName || "User",
            userAvatar: user.photoURL,
            type: "badge_earned",
            content: `${user.displayName || "User"} earned the '${
              BADGES[badgeId]?.label || "New Badge"
            }' badge!`,
            courseId: "all-courses",
            createdAt: new Date().toISOString(),
          });
        }
      }
    };

    checkAndAwardBadges();
  }, [user, activeTab]);

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.[0].toUpperCase() ||
    "U";

  const formatLastSync = () => {
    if (!lastSyncedAt) return "Never";
    return lastSyncedAt.toLocaleString();
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await promptInstall();
    } catch (error) {
      console.error("Install failed:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent
          value="general"
          className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connected Account</CardTitle>
              <CardDescription>
                Your Google account linked to this app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={user?.photoURL || undefined}
                    alt={user?.displayName || "User"}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user?.displayName}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5" />
                  Connected
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Profile Avatar</Label>
                <div className="flex gap-4 items-center flex-wrap">
                  {[
                    {
                      id: "google",
                      src: user?.providerData[0]?.photoURL || user?.photoURL,
                      label: "Google",
                    },
                    {
                      id: "male",
                      src: "/avatars/avatar_male.png",
                      label: "Avatar 1",
                    },
                    {
                      id: "female",
                      src: "/avatars/avatar_female.png",
                      label: "Avatar 2",
                    },
                    {
                      id: "male_men",
                      src: "/avatars/avatar_male_men.png",
                      label: "Avatar 3",
                    },
                    {
                      id: "male_women",
                      src: "/avatars/avatar_male_women.png",
                      label: "Avatar 4",
                    },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={async () => {
                        if (option.src && option.src !== user?.photoURL) {
                          try {
                            await updateUserProfile({ photoURL: option.src });
                          } catch (e) {
                            console.error("Failed to update avatar", e);
                          }
                        }
                      }}
                      className={`relative group rounded-full p-1 transition-all ${
                        user?.photoURL === option.src
                          ? "ring-2 ring-primary ring-offset-2 bg-background"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage src={option.src || undefined} />
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      {user?.photoURL === option.src && (
                        <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center border-2 border-background">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose an avatar to represent you across the app.
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Google Classroom</p>
                  <p className="text-xs text-muted-foreground">
                    Last synced: {formatLastSync()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    syncClassroom().catch((err) => {
                      console.error("Sync failed:", err);
                    });
                  }}
                  disabled={isSyncing}
                  data-testid="button-sync-settings"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isSyncing ? "animate-spin" : ""
                    }`}
                  />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sync Settings</CardTitle>
              <CardDescription>
                Configure how your data syncs with Google Classroom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="background-sync"
                    className="text-sm font-medium"
                  >
                    Background Sync
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically refresh assignment data periodically
                  </p>
                </div>
                <Switch
                  id="background-sync"
                  checked={backgroundSync}
                  onCheckedChange={setBackgroundSync}
                  data-testid="switch-background-sync"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Clear Cache</Label>
                  <p className="text-xs text-muted-foreground">
                    Clear all locally stored data. Use this if you're
                    experiencing issues after switching accounts.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Cache & Refresh
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Clear all cached data?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear all locally stored data and refresh the
                        page. You'll need to re-sync your assignments. Your
                        theme preference will be preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          const {
                            clearUserData,
                            handleUserSwitch,
                          } = require("@/lib/storage-manager");
                          if (user) {
                            clearUserData();
                            handleUserSwitch(user.uid);
                          }
                          window.location.reload();
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Clear & Refresh
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription>
                Choose your preferred color theme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="theme" className="text-sm font-medium">
                    Appearance
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Select light or dark mode
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4" />
                Install App
              </CardTitle>
              <CardDescription>
                Install this app on your device for quick access - works on
                phones and desktops
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstalled ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                      App Installed
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      This app is installed on your device. You can access it
                      from your home screen.
                    </p>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Install Available</p>
                      <p className="text-xs text-muted-foreground">
                        Click the button below to install this app on your
                        device for a better experience.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="w-full"
                    size="lg"
                    data-testid="button-install-app"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isInstalling ? "Installing..." : "Install App"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    After installation, you can access the app from your home
                    screen or app drawer
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Install Not Available
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {typeof window !== "undefined" &&
                        window.matchMedia("(display-mode: standalone)").matches
                          ? "This app is already installed."
                          : "Installation prompt will appear when the app meets PWA requirements. Make sure you're using Chrome, Edge, or Safari on a supported device."}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium mb-2">
                      Manual Installation:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>
                        <strong>Chrome/Edge:</strong> Click the install icon in
                        the address bar
                      </li>
                      <li>
                        <strong>iOS Safari:</strong> Tap Share → Add to Home
                        Screen
                      </li>
                      <li>
                        <strong>Android Chrome:</strong> Tap Menu → Install App
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="timezone" className="text-sm font-medium">
                    Time Zone
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Used for displaying due dates and deadlines
                  </p>
                </div>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger
                    className="w-[180px]"
                    data-testid="select-timezone"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="America/New_York">
                      Eastern Time
                    </SelectItem>
                    <SelectItem value="America/Chicago">
                      Central Time
                    </SelectItem>
                    <SelectItem value="America/Denver">
                      Mountain Time
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      Pacific Time
                    </SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Account Actions
              </CardTitle>
              <CardDescription>Manage your session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Sign Out</p>
                  <p className="text-xs text-muted-foreground">
                    Sign out of your account on this device
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="button-signout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will sign you out of your account. You will need to
                        sign in again to access your data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={signOut}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0 border-none shadow-none ring-0 focus:ring-0 outline-none"
                      >
                        Sign Out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="badges"
          className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-500" />
                Achievements & Badges
              </CardTitle>
              <CardDescription>
                Track your progress and unlock rewards by staying consistent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BadgeShowroom
                earnedBadges={myBadges}
                currentStreak={loginStreak}
                submissionCount={submissionCount}
                attendanceStats={attendanceStats}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="integrations"
          className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in"
        >
          <IntegrationsTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
