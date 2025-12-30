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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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

export default function AttendancePage() {
  const { courses } = useClassroom();
  const { accessToken, user } = useAuth();
  const { toast } = useToast();

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [courseStates, setCourseStates] = useState<
    Record<string, EnrichedCourseData>
  >({});
  const [unlockKey, setUnlockKey] = useState("");
  const [unlockingCourseId, setUnlockingCourseId] = useState<string | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize course states
  useEffect(() => {
    if (!courses) return;

    const initCourses = async () => {
      // Parallel fetch configs
      const results = await Promise.all(
        courses.map(async (c) => {
          // If already loaded successfully, don't overwrite with initial state unless forcing refresh
          if (courseStates[c.id]?.state === "loaded") {
            return courseStates[c.id];
          }

          const config = await AttendanceService.getCourseConfig(c.id);
          console.log(`[DEBUG] Course ${c.name} (${c.id}): Config =`, config);

          if (!config) {
            return { courseId: c.id, state: "no-config" } as EnrichedCourseData;
          } else if (!config.isVisible) {
            return { courseId: c.id, state: "hidden" } as EnrichedCourseData;
          } else {
            // Check if already unlocked locally (mimicking session cache)
            const isUnlocked =
              sessionStorage.getItem(`unlocked_${c.id}`) === "true";
            if (isUnlocked) {
              // Trigger fetch immediately if unlocked
              fetchAttendance(c.id, config.sheetUrl);
              return { courseId: c.id, state: "loading" } as EnrichedCourseData;
            } else {
              return { courseId: c.id, state: "locked" } as EnrichedCourseData;
            }
          }
        })
      );

      const newStateMap: Record<string, EnrichedCourseData> = {};
      results.forEach((r) => {
        newStateMap[r.courseId] = r;
      });
      setCourseStates((prev) => ({ ...prev, ...newStateMap }));
    };

    initCourses();
  }, [courses]);

  // Select first available course on load
  useEffect(() => {
    if (courses.length > 0 && !selectedSubject) {
      setSelectedSubject(courses[0].id);
    }
  }, [courses, selectedSubject]);

  const fetchAttendance = async (courseId: string, sheetUrl: string) => {
    if (!accessToken || !user?.email) return;

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
      console.error(err);
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
    if (!unlockingCourseId) return;

    const isValid = await AttendanceService.validatePassKey(
      unlockingCourseId,
      unlockKey
    );

    if (isValid) {
      sessionStorage.setItem(`unlocked_${unlockingCourseId}`, "true");
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Re-fetch all 'loaded' courses
    const promises = Object.values(courseStates)
      .filter(
        (cs) =>
          cs.state === "loaded" ||
          cs.state === "error" ||
          cs.state === "loading"
      ) // Retry errors too
      .map(async (cs) => {
        const config = await AttendanceService.getCourseConfig(cs.courseId); // Re-fetch config too in case URL changed
        if (config) return fetchAttendance(cs.courseId, config.sheetUrl);
        return Promise.resolve();
      });

    await Promise.allSettled(promises);
    setIsRefreshing(false);
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

  // --- Render ---
  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-border z-10 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Attendance
            </h1>
            <span className="h-4 w-px bg-border mx-1" />
            <span className="text-sm text-muted-foreground font-medium">
              Academic Year 2024-25
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className={cn(
              "text-muted-foreground h-8",
              isRefreshing && "opacity-70"
            )}
          >
            <RotateCw
              className={cn("h-3.5 w-3.5 mr-2", isRefreshing && "animate-spin")}
            />
            Sync Now
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto w-full p-6 space-y-8">
          {/* ZONE A: HERO */}
          <section>
            <Card className="border-border shadow-sm bg-card transition-colors">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
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
                        "ml-2 h-5 text-[10px] px-1.5 uppercase",
                        overallStats.color
                      )}
                    >
                      {overallStats.status === "safe"
                        ? "Safe Status"
                        : "Attention Needed"}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                      {overallStats.percentage}%
                    </span>
                    <span className="text-sm sm:text-base text-muted-foreground font-medium">
                      Average across {loadedCourses.length} active courses
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                      "group cursor-pointer border-border shadow-sm hover:shadow-md transition-all duration-200 bg-card active:scale-[0.99]",
                      isSelected && "ring-1 ring-primary border-primary"
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
                    <div className="max-h-full overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10 border-b border-border">
                          <TableRow className="border-none">
                            <TableHead className="w-[100px] text-xs">
                              Date
                            </TableHead>
                            <TableHead className="text-right text-xs">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentData.history.map((record, i) => (
                            <TableRow
                              key={i}
                              className="border-b border-border/50 hover:bg-muted/30"
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                                {record.date}
                              </TableCell>
                              <TableCell className="text-right py-2.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                                    record.status === "Present"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-red-500/10 text-red-600"
                                  )}
                                >
                                  {record.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unlock Dialog */}
      <Dialog
        open={!!unlockingCourseId}
        onOpenChange={(open) => !open && setUnlockingCourseId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock Attendance</DialogTitle>
            <DialogDescription>
              Enter the pass key provided by your teacher to view attendance for
              this course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pass-key">Pass Key</Label>
              <Input
                id="pass-key"
                type="password"
                placeholder="ENTER-KEY"
                value={unlockKey}
                onChange={(e) => setUnlockKey(e.target.value)}
                className="uppercase tracking-widest font-mono text-center text-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlockingCourseId(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleUnlock}>Unlock Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
