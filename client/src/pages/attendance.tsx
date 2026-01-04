import { useState, useMemo, useEffect } from "react";
import {
  RotateCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  Clock,
  BookOpen,
  ArrowUpRight,
  MoreHorizontal,
  Lock,
  EyeOff,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDoc,
  updateDoc, // Added
  arrayUnion, // Added
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useClassroom } from "@/lib/classroom-context";
import { useAuth } from "@/lib/auth-context";
import {
  AttendanceService,
  CourseAttendanceData,
  CourseAttendanceConfig,
} from "@/services/attendance-service";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { TokenRefreshPrompt } from "@/components/token-refresh-prompt";

// --- Helper Functions ---

/**
 * Calculate the current academic year based on the current date.
 * Academic years typically run from June/July to May/June of the next year.
 * If current month is January-May, we're in the previous year's academic year.
 * If current month is June-December, we're in the current year's academic year.
 */
function getCurrentAcademicYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = January, 11 = December)

  // If we're in January-May (months 0-4), the academic year started last year
  // If we're in June-December (months 5-11), the academic year started this year
  const startYear = currentMonth < 5 ? currentYear - 1 : currentYear;
  const endYear = startYear + 1;

  // Format as "2024-25"
  return `${startYear}-${endYear.toString().slice(-2)}`;
}

// --- Types ---
type CourseStateStr =
  | "loading"
  | "hidden"
  | "locked"
  | "loaded"
  | "error"
  | "no-config";

interface EnrichedCourseData {
  courseId: string;
  state: CourseStateStr;
  error?: string;
  data?: CourseAttendanceData;
}

// --- Helper Stats ---
const getStats = (attended: number, total: number) => {
  if (total === 0)
    return {
      percentage: 0,
      status: "safe",
      color: "text-muted-foreground",
      progressColor: "bg-muted",
    };

  const percentage = Math.round((attended / total) * 100);
  let status: "safe" | "warning" | "danger" = "safe";
  let color =
    "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  let progressColor = "bg-emerald-500 dark:bg-emerald-500";

  if (percentage < 70) {
    status = "danger";
    color =
      "text-red-700 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    progressColor = "bg-red-500 dark:bg-red-500";
  } else if (percentage < 75) {
    status = "warning";
    color =
      "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    progressColor = "bg-amber-500 dark:bg-amber-500";
  }

  return { percentage, status, color, progressColor };
};

// --- Loading Components ---
function AttendanceSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto w-full p-6 space-y-8 animate-pulse">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const { courses, error, isLoading } = useClassroom();

  if (isLoading) {
    return <AttendanceSkeleton />;
  }

  // Create a blocking state only if we have NO courses (no cache) AND a session error
  if (
    error &&
    error.toLowerCase().includes("session") &&
    courses.length === 0
  ) {
    return <TokenRefreshPrompt />;
  }
  const { accessToken, user } = useAuth();
  const { toast } = useToast();

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [courseStates, setCourseStates] = useState<
    Record<string, EnrichedCourseData>
  >({});
  const [unlockingCourseId, setUnlockingCourseId] = useState<string | null>(
    null
  );
  const [unlockKey, setUnlockKey] = useState("");

  // Calculate current academic year
  const academicYear = useMemo(() => getCurrentAcademicYear(), []);

  // Initialize course states
  useEffect(() => {
    if (!courses || !user || !accessToken) return;

    const initCourses = async () => {
      // Parallel fetch configs
      const results = await Promise.all(
        courses.map(async (c) => {
          const config = await AttendanceService.getCourseConfig(c.id);

          if (!config) {
            return { courseId: c.id, state: "no-config" } as EnrichedCourseData;
          } else if (!config.isVisible) {
            return { courseId: c.id, state: "hidden" } as EnrichedCourseData;
          } else {
            // Mark as loading, then fetch
            return { courseId: c.id, state: "loading" } as EnrichedCourseData;
          }
        })
      );

      const newStateMap: Record<string, EnrichedCourseData> = {};
      results.forEach((r) => {
        newStateMap[r.courseId] = r;
      });
      setCourseStates((prev) => ({ ...prev, ...newStateMap }));

      // Now fetch attendance for all visible courses
      for (const c of courses) {
        const config = await AttendanceService.getCourseConfig(c.id);
        if (config && config.isVisible) {
          fetchAttendance(c.id, config.sheetUrl);
        }
      }
    };

    initCourses();
  }, [courses, user, accessToken]); // Removed courseStates dependency to avoid infinite loops

  // Select first available course on load
  useEffect(() => {
    if (courses.length > 0 && !selectedSubject) {
      setSelectedSubject(courses[0].id);
    }
  }, [courses, selectedSubject]);

  const fetchAttendance = async (courseId: string, sheetUrl: string) => {
    if (!accessToken || !user?.email) {
      console.log("Missing accessToken or user email");
      return;
    }

    const sheetId = AttendanceService.extractSheetId(sheetUrl);
    if (!sheetId) {
      setCourseStates((prev) => ({
        ...prev,
        [courseId]: {
          courseId,
          state: "error",
          error: "Invalid configuration",
        },
      }));
      return;
    }

    // Get the email column from config
    const config = await AttendanceService.getCourseConfig(courseId);
    const emailColumn = config?.emailColumn || "A";

    try {
      const data = await AttendanceService.fetchAttendanceFromSheet(
        sheetId,
        accessToken,
        user.email,
        emailColumn
      );
      setCourseStates((prev) => ({
        ...prev,
        [courseId]: { courseId, state: "loaded", data },
      }));
    } catch (err: any) {
      console.error("Attendance fetch error:", err);
      setCourseStates((prev) => ({
        ...prev,
        [courseId]: {
          courseId,
          state: "error",
          error: err.message || "Failed to load",
        },
      }));
    }
  };

  const handleUnlock = async () => {
    if (!unlockingCourseId || !user) return;

    const isValid = await AttendanceService.validatePassKey(
      unlockingCourseId,
      unlockKey
    );

    if (isValid) {
      setUnlockingCourseId(null);
      setUnlockKey("");
      toast({
        title: "Course Unlocked",
        description: "Fetching attendance details...",
      });

      setCourseStates((prev) => ({
        ...prev,
        [unlockingCourseId]: { courseId: unlockingCourseId, state: "loading" },
      }));

      const config = await AttendanceService.getCourseConfig(unlockingCourseId);
      if (config) fetchAttendance(unlockingCourseId, config.sheetUrl);
    } else {
      toast({
        title: "Incorrect Key",
        description: "Please ask your teacher for the correct pass key.",
        variant: "destructive",
      });
    }
  };

  // --- Derived Stats ---
  const loadedCourses = Object.values(courseStates).filter(
    (cs) => cs.state === "loaded" && cs.data
  );
  const overallAttended = loadedCourses.reduce(
    (acc, curr) => acc + (curr.data?.stats.attendedClasses || 0),
    0
  );
  const overallTotal = loadedCourses.reduce(
    (acc, curr) => acc + (curr.data?.stats.totalClasses || 0),
    0
  );
  const overallStats = getStats(overallAttended, overallTotal);

  const currentCourseState = courseStates[selectedSubject];
  const currentSubject = courses.find((s) => s.id === selectedSubject);
  const currentData = currentCourseState?.data;

  // Attendance Badge Awarding Logic
  useEffect(() => {
    if (!user || overallTotal < 5) return; // Min threshold to start checking

    const checkAndAwardBadges = async () => {
      const badgesToAward: string[] = [];
      const attended = overallAttended;
      const total = overallTotal;
      const percentage = total > 0 ? attended / total : 0;

      // Criteria 1: Perfect Week (Approximation: 100% with reasonable volume)
      if (total >= 10 && percentage === 1) {
        badgesToAward.push("perfect-week");
      }

      // Criteria 2: Attendance Champion (High volume consistency)
      if (total >= 30 && percentage >= 0.95) {
        badgesToAward.push("attendance-champion");
      }

      if (badgesToAward.length > 0) {
        try {
          const userRef = doc(
            db,
            "leaderboards",
            "all-courses",
            "students",
            user.uid
          );
          await updateDoc(userRef, {
            badges: arrayUnion(...badgesToAward),
          });
        } catch (error) {
          console.debug("Could not award attendance badges:", error);
        }
      }
    };

    const timer = setTimeout(checkAndAwardBadges, 3000);
    return () => clearTimeout(timer);
  }, [user, overallTotal, overallAttended]);

  // --- Render ---
  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header - Hidden on mobile since AppHeader shows the page title */}
      <div className="hidden sm:flex flex-none px-4 sm:px-6 py-4 border-b border-border z-10 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto w-full gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground whitespace-nowrap">
              Attendance
            </h1>
            <span className="hidden sm:block h-4 w-px bg-border mx-1" />
            <span className="hidden sm:inline text-sm text-muted-foreground font-medium whitespace-nowrap">
              Academic Year {academicYear}
            </span>
          </div>
        </div>
      </div>

      {error && error.toLowerCase().includes("session") && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-3 shrink-0">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Sync is paused. Cached courses shown. Sign in to update.
              </span>
            </div>
            <a
              href="/auth/refresh"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                Reconnect
              </Button>
            </a>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto w-full p-6 space-y-8">
          {/* ZONE A: HERO */}
          <section>
            {loadedCourses.length > 0 ? (
              <Card className="border-border shadow-sm bg-card transition-all duration-300 hover:shadow-md hover:scale-[1.002]">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 w-fit mb-2">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600/80">
                        Realtime
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Overall Attendance
                      </span>
                      <Badge
                        variant={
                          overallStats.status === "safe"
                            ? "outline"
                            : "destructive"
                        }
                        className={cn(
                          "ml-2 h-5 text-[10px] px-1.5 uppercase transition-transform duration-300 hover:scale-105",
                          overallStats.color
                        )}
                      >
                        {overallStats.status === "safe"
                          ? "Safe Status"
                          : "Attention Needed"}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground transition-colors duration-300 hover:text-primary">
                        {overallStats.percentage}%
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground font-medium">
                        Average across {loadedCourses.length} active courses
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border shadow-sm bg-card">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-4">
                  <div className="p-4 bg-muted/50 rounded-full">
                    <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h3 className="text-lg font-semibold text-foreground">
                      No Attendance Configured Yet
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Invite your teacher to login to{" "}
                      <span className="font-semibold">Trace</span> to start
                      tracking real-time attendance for your courses.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70 bg-muted/30 px-3 py-2 rounded-md">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>
                      Once configured, attendance will appear here automatically
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* ZONE B: COURSE CARDS */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => {
                const cState = courseStates[course.id];
                const stateType = cState?.state || "loading";
                const stats = cState?.data
                  ? getStats(
                      cState.data.stats.attendedClasses,
                      cState.data.stats.totalClasses
                    )
                  : null;
                const isSelected = selectedSubject === course.id;

                return (
                  <Card
                    key={course.id}
                    className={cn(
                      "group cursor-pointer border-border shadow-sm bg-card active:scale-[0.99]",
                      "transition-all duration-300 ease-out",
                      "hover:shadow-md hover:-translate-y-1 hover:border-primary/30",
                      isSelected &&
                        "ring-1 ring-primary border-primary shadow-md"
                    )}
                    onClick={() => setSelectedSubject(course.id)}
                  >
                    <CardContent className="p-5 h-full flex flex-col justify-between gap-4 min-h-[140px]">
                      {/* Header part */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h3 className="font-semibold text-foreground truncate pr-2">
                                {course.name}
                              </h3>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{course.name}</p>
                            </TooltipContent>
                          </Tooltip>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {course.section || "No Section"}
                          </p>
                        </div>

                        {stateType === "loaded" && stats && (
                          <span
                            className={cn(
                              "text-lg font-bold tabular-nums",
                              stats.percentage < 75
                                ? "text-destructive"
                                : "text-muted-foreground/70"
                            )}
                          >
                            {stats.percentage}%
                          </span>
                        )}
                        {stateType === "hidden" && (
                          <EyeOff className="h-5 w-5 text-muted-foreground/50" />
                        )}
                        {stateType === "locked" && (
                          <Lock className="h-5 w-5 text-amber-500/80" />
                        )}
                        {stateType === "error" && (
                          <AlertTriangle className="h-5 w-5 text-destructive/80" />
                        )}
                      </div>

                      {/* Footer/State part */}
                      <div className="mt-auto">
                        {stateType === "loaded" && stats && (
                          <div className="space-y-3">
                            <div className="flex justify-between text-xs text-muted-foreground font-medium">
                              <span>
                                {cState.data?.stats.attendedClasses}/
                                {cState.data?.stats.totalClasses} classes
                              </span>
                              <span
                                className={
                                  stats.status === "safe"
                                    ? "text-emerald-500"
                                    : "text-red-500"
                                }
                              >
                                {stats.status === "safe"
                                  ? "On Track"
                                  : "Low Attendance"}
                              </span>
                            </div>
                            <div className="h-1 w-full bg-secondary/80 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  stats.progressColor
                                )}
                                style={{ width: `${stats.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {stateType === "locked" && (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-muted-foreground">
                              Attendance is password protected.
                            </p>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUnlockingCourseId(course.id);
                              }}
                            >
                              <KeyRound className="w-3 h-3 mr-2" />
                              Unlock
                            </Button>
                          </div>
                        )}

                        {stateType === "hidden" && (
                          <p className="text-xs text-muted-foreground italic">
                            Attendance hidden by teacher.
                          </p>
                        )}

                        {stateType === "no-config" && (
                          <p className="text-xs text-muted-foreground italic">
                            Not configured.
                          </p>
                        )}

                        {stateType === "error" && (
                          <p className="text-xs text-destructive">
                            {cState?.error}
                          </p>
                        )}

                        {stateType === "loading" && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <RotateCw className="w-3 h-3 animate-spin" />{" "}
                            Fetching...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ZONE C: HISTORY */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> History
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                    {currentSubject?.section ||
                      currentSubject?.name.slice(0, 3).toUpperCase()}
                  </span>
                </div>

                <Card className="border-border shadow-sm bg-card overflow-hidden h-[400px]">
                  {!currentData ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                      {currentCourseState?.state === "locked" && (
                        <>
                          <Lock className="h-8 w-8 mb-3 opacity-20" />
                          <p className="text-sm">
                            Unlock this course to view history.
                          </p>
                        </>
                      )}
                      {currentCourseState?.state === "hidden" && (
                        <>
                          <EyeOff className="h-8 w-8 mb-3 opacity-20" />
                          <p className="text-sm">History is hidden.</p>
                        </>
                      )}
                      {(currentCourseState?.state === "error" ||
                        currentCourseState?.state === "no-config") && (
                        <>
                          <AlertCircle className="h-8 w-8 mb-3 opacity-20" />
                          <p className="text-sm">No data available.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden p-4">
                      <div className="relative border-l border-muted/60 ml-1.5 space-y-3 pb-2">
                        {currentData.history.map((record, i) => {
                          const isPresent = record.status === "Present";
                          const showRecentLabel = i === 0;
                          const showEarlierLabel = i === 5;

                          return (
                            <div key={i} className="group">
                              {/* Visual Grouping Labels */}
                              {showRecentLabel && (
                                <div className="ml-5 mb-3 mt-1">
                                  <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest pl-1">
                                    Recent Activity
                                  </span>
                                </div>
                              )}
                              {showEarlierLabel && (
                                <div className="ml-5 mb-3 mt-4 pt-4 border-t border-dashed border-border/60">
                                  <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest pl-1">
                                    Earlier
                                  </span>
                                </div>
                              )}

                              <div className="relative pl-5 select-none">
                                {/* Timeline Dot */}
                                <div
                                  className={cn(
                                    "absolute -left-[4.5px] top-2.5 h-2.5 w-2.5 rounded-full ring-[3px] ring-card transition-all duration-300 z-10",
                                    "group-hover:scale-110 group-hover:shadow-sm",
                                    isPresent
                                      ? "bg-emerald-500 group-hover:bg-emerald-600"
                                      : "bg-rose-500 group-hover:bg-rose-600"
                                  )}
                                />

                                {/* Connecting Line Highlight */}
                                {i !== currentData.history.length - 1 && (
                                  <div className="absolute left-[0px] top-4 bottom-[-12px] w-[1px] bg-muted/40 group-hover:bg-foreground/10 transition-colors duration-300 block" />
                                )}

                                <div className="flex flex-col gap-1 sm:gap-0.5 transition-transform duration-300 ease-out group-hover:translate-x-1 pb-3">
                                  {/* Mobile & Desktop Unified: Status First */}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                                    {/* Status Pill - Dominant */}
                                    <div
                                      className={cn(
                                        "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase transition-all duration-200 w-full sm:w-fit cursor-default",
                                        "shadow-sm border",
                                        isPresent
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 group-hover:border-emerald-200"
                                          : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 group-hover:border-rose-200"
                                      )}
                                    >
                                      {record.status}
                                    </div>

                                    {/* Date - Muted/Secondary */}
                                    <span className="text-[10px] text-muted-foreground font-mono pl-0.5 sm:pl-0">
                                      {record.date}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
