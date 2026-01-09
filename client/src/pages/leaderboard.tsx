import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useClassroom } from "@/lib/classroom-context";
import { db } from "@/lib/firebase";
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
  where,
  deleteDoc,
} from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Medal,
  Crown,
  Loader2,
  Scan,
  Info,
  X,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { calculateBadges } from "@/lib/badge-logic";
import { BadgeList } from "@/components/badge-ui";
import { TokenRefreshPrompt } from "@/components/token-refresh-prompt";

interface LeaderboardStudent {
  id: string; // userId
  displayName: string;
  photoUrl: string;
  totalXP: number;
  processedAssignmentIds: string[]; // assignmentIds
  lastSyncedAt?: any;
  email?: string;
  emailDomain?: string;
  enrolledCourseIds?: string[];
  badges?: string[];
  role?: string;
  lastSubmissionTime?: number;
}

export default function LeaderboardPage() {
  const { user, signOut } = useAuth();
  const {
    courses,
    assignments,
    isLoading: isClassroomLoading,
    error: classroomError,
  } = useClassroom();

  if (classroomError && classroomError.toLowerCase().includes("session")) {
    const hasData = courses.length > 0 || assignments.length > 0;
    if (!hasData) {
      return <TokenRefreshPrompt />;
    }
  }

  const [viewMode, setViewMode] = useState<"class" | "college">("class");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardStudent[]>(
    []
  );
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showCollegeWarning, setShowCollegeWarning] = useState(true);

  // Set default course to "all-courses" or first course
  // No longer need default course selection effect since we default to 'class' view
  // and always fetch from 'all-courses' collection.

  // Fetch Leaderboard Data (Multi-source aggregation)
  useEffect(() => {
    if (!user) return;
    setLoadingLeaderboard(true);

    const unsubscribers: (() => void)[] = [];
    // Map to deduplicate students by ID. Key = userId
    const studentMap = new Map<string, LeaderboardStudent>();

    // Helper to process snapshots and update state
    const updateLeaderboardState = () => {
      const students: LeaderboardStudent[] = [];
      const userDomain = user?.email ? user.email.split("@")[1] : null;
      const userCourseIds = courses.map((c) => c.id);
      const validAssignmentIds = new Set(assignments.map((a) => a.id));

      studentMap.forEach((student) => {
        // 0. EXCLUDE TEACHERS (Strict)
        if (student.role === "teacher") {
          return;
        }

        // 1. Data Preparation
        const studentEmail = student.email || "";
        // Try multiple sources for domain: emailDomain field, extract from email, or empty
        let studentDomain = student.emailDomain || "";

        // If no emailDomain but we have an email, extract it
        if (!studentDomain && studentEmail.includes("@")) {
          studentDomain = studentEmail.split("@")[1];
        }

        const studentSubjects = student.enrolledCourseIds || [];
        // Note: 'student' already has the data structure from Firestore

        const processedIds = student.processedAssignmentIds || [];

        // 2. Leaderboard Filtering Logic
        const isSameDomain =
          userDomain && studentDomain && userDomain === studentDomain;
        const hasCommonSubject = userCourseIds.some((id) =>
          studentSubjects.includes(id)
        );

        const isLegacyUser = !studentDomain;
        const hasSharedAssignment =
          isLegacyUser &&
          processedIds.some((id: string) => validAssignmentIds.has(id));

        // FILTER DECISION TREE
        let shouldShow = false;

        if (viewMode === "college") {
          // COLLEGE VIEW: Show ALL students from the same email domain
          shouldShow = !!isSameDomain;
        } else {
          // CLASS VIEW (Default):
          const strictClassMatch = isSameDomain && hasCommonSubject;
          shouldShow = strictClassMatch || hasSharedAssignment;
        }

        if (shouldShow) {
          students.push(student);
        }
      });

      // Sort by Total XP descending, then by Last Submission Time ascending (earlier is better)
      students.sort((a, b) => {
        if (b.totalXP !== a.totalXP) {
          return b.totalXP - a.totalXP;
        }
        // Tie-breaker: Earlier submission wins
        // If time is missing (old data), treat as very late (Infinity)
        const timeA = a.lastSubmissionTime || Number.MAX_SAFE_INTEGER;
        const timeB = b.lastSubmissionTime || Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      });

      setLeaderboardData(students);
      setLoadingLeaderboard(false);
    };

    // Helper to process individual docs
    const processSnapshot = (snapshot: any) => {
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        const newStudent = {
          id: doc.id,
          displayName: data.displayName || data.name || "Anonymous",
          photoUrl: data.photoUrl || data.avatar || "",
          totalXP: data.totalXP || data.xp || 0,
          processedAssignmentIds:
            data.processedAssignmentIds || data.completedTasks || [],
          email: data.email || "",
          emailDomain:
            data.emailDomain || (data.email ? data.email.split("@")[1] : ""),
          enrolledCourseIds: data.enrolledCourseIds || data.subjects || [],
          badges: data.badges || [],
          role: data.role,
          lastSubmissionTime: data.lastSubmissionTime || 0,
        } as LeaderboardStudent;

        const existing = studentMap.get(doc.id);
        if (!existing || newStudent.totalXP >= existing.totalXP) {
          studentMap.set(doc.id, newStudent);
        }
      });
      updateLeaderboardState();
    };

    // QUERY STRATEGY
    const userDomain = user.email ? user.email.split("@")[1] : null;

    if (viewMode === "college" && userDomain) {
      // COLLEGE MODE: Dedicated query for domain
      // Requires index on [emailDomain ASC, totalXP DESC]
      const studentsRef = collection(
        db,
        "leaderboards",
        "all-courses",
        "students"
      );
      const q = query(
        studentsRef,
        where("emailDomain", "==", userDomain),
        orderBy("totalXP", "desc"),
        limit(50)
      );

      const unsub = onSnapshot(q, processSnapshot, (err) => {
        console.warn(
          "College query failed (likely missing index). Falling back to global list.",
          err
        );
        // Fallback: Fetch global list and let client-side filter handle it
        // This ensures at least something shows up if index is missing
        const fallbackQ = query(
          studentsRef,
          orderBy("totalXP", "desc"),
          limit(100)
        );
        onSnapshot(fallbackQ, processSnapshot);
      });
      unsubscribers.push(unsub);
    } else {
      // CLASS MODE (or fallback): Aggregate specific courses + global top
      const uniqueSourceIds = Array.from(
        new Set(["all-courses", ...courses.map((c) => c.id)])
      );

      uniqueSourceIds.forEach((sourceId) => {
        const studentsRef = collection(
          db,
          "leaderboards",
          sourceId,
          "students"
        );
        const q = query(studentsRef, orderBy("totalXP", "desc"), limit(50));
        const unsub = onSnapshot(q, processSnapshot);
        unsubscribers.push(unsub);
      });
    }

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [viewMode, user, courses, assignments]); // Re-run if viewMode changes or user data loads

  const selectedTitle = viewMode === "class" ? "My Class" : "My College";

  const myEntry = leaderboardData.find((s) => s.id === user?.uid);
  const myXP = myEntry?.totalXP || 0;
  const hasData = !!myEntry;

  // Smart leaderboard logic
  const studentsWithXP = leaderboardData.filter((s) => s.totalXP > 0);
  const studentsWithZeroXP = leaderboardData.filter((s) => s.totalXP === 0);
  const allHaveZeroXP =
    leaderboardData.length > 0 && studentsWithXP.length === 0;

  // Sort students with 0 XP by lastSyncedAt (oldest first, newest last)
  const sortedZeroXPStudents = [...studentsWithZeroXP].sort((a, b) => {
    const getTime = (t: any) => {
      if (!t) return 0;
      if (typeof t.toMillis === "function") return t.toMillis();
      if (typeof t === "number") return t;
      if (t instanceof Date) return t.getTime();
      if (typeof t === "string") return new Date(t).getTime();
      return 0;
    };
    return getTime(a.lastSyncedAt) - getTime(b.lastSyncedAt);
  });

  // Combine: students with XP (sorted by XP) + students with 0 XP (sorted by join time)
  const smartSortedData = [...studentsWithXP, ...sortedZeroXPStudents];

  // Temporary Dev/Admin Mode to clean up data
  const isDevMode = false; // Set to false when done cleaning up

  const handleDelete = async (studentId: string, studentName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${studentName} from the leaderboard?`
      )
    )
      return;

    try {
      await deleteDoc(
        doc(db, "leaderboards", "all-courses", "students", studentId)
      );
      setLeaderboardData((prev) => prev.filter((s) => s.id !== studentId));
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-sans selection:bg-muted">
      {classroomError && classroomError.toLowerCase().includes("session") && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-3 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Sync is paused. Cached data is shown. Sign in to update.
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between p-4 sm:p-6 gap-4 sm:gap-0 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            Class Ranking
          </h1>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest truncate max-w-[200px] sm:max-w-none">
            {selectedTitle} Leaderboard
          </p>
        </div>

        <div className="w-full sm:w-[200px]">
          <Select
            value={viewMode}
            onValueChange={(val: "class" | "college") => setViewMode(val)}
          >
            <SelectTrigger className="w-full bg-background border-border hover:bg-muted/50 text-foreground h-9 rounded-full px-4 text-xs font-medium focus:ring-ring">
              <SelectValue placeholder="Select View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class" className="font-semibold text-xs py-2">
                My Class
              </SelectItem>
              <SelectItem
                value="college"
                className="font-semibold text-xs py-2"
              >
                This College
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* XP Rules Note */}
          {showHelp && viewMode === "class" && (
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/5 to-transparent rounded-xl border border-primary/10 p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-5 text-sm animate-in fade-in slide-in-from-top-2 shadow-sm">
              <div className="absolute top-0 right-0 p-2 sm:p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50 hover:text-foreground hover:bg-primary/10 rounded-full transition-colors"
                  onClick={() => setShowHelp(false)}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>

              <div className="bg-background/60 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl h-fit w-fit border border-primary/20 shadow-sm shrink-0 sm:mt-1 ring-4 ring-primary/5">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>

              <div className="space-y-3 pt-0.5 pr-4 sm:pr-10">
                <h4 className="font-bold text-foreground leading-none tracking-tight text-sm sm:text-base">
                  How to earn XP & Rank Up
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3 text-muted-foreground text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_8px_currentColor]" />
                    <span className="leading-snug">
                      Complete assignments to earn{" "}
                      <br className="hidden sm:block" />
                      <span className="font-bold text-foreground">
                        100 XP
                      </span>{" "}
                      instantly.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_currentColor]" />
                    <span className="leading-snug">
                      Submit{" "}
                      <span className="font-medium text-foreground">
                        48h early
                      </span>{" "}
                      for a <br className="hidden sm:block" />
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        50 XP Speed Bonus
                      </span>
                      .
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* College View Disclaimer */}
          {viewMode === "college" && showCollegeWarning && (
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-xl border border-amber-500/20 p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-5 text-sm animate-in fade-in slide-in-from-top-2 shadow-sm">
              <div className="absolute top-0 right-0 p-2 sm:p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600/50 hover:text-amber-700 hover:bg-amber-500/10 rounded-full transition-colors"
                  onClick={() => setShowCollegeWarning(false)}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
              <div className="bg-background/60 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl h-fit w-fit border border-amber-500/30 shadow-sm shrink-0 sm:mt-1 ring-4 ring-amber-500/10">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-500" />
              </div>

              <div className="space-y-2 pt-0.5 pr-4 sm:pr-8">
                <h4 className="font-bold text-foreground leading-none tracking-tight text-sm sm:text-base flex items-center gap-1.5">
                  College Leaderboard - For Fun Only!
                  <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                </h4>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  This leaderboard shows all students from your college.
                  <span className="block mt-1.5 text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Note: This is NOT a fair competition! Different classes
                      have different subjects, assignments, and workloads.
                      Rankings are purely for entertainment.
                    </span>
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Auto-sync message - only show if no data yet */}
          {!hasData && !loadingLeaderboard ? (
            <div className="bg-muted/30 border border-border border-dashed rounded-xl p-6 sm:p-8 text-center animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">Syncing Your Progress</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px] sm:max-w-sm mx-auto">
                    Your leaderboard data is automatically syncing. Complete
                    some assignments to start earning XP!
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Leaderboard Content */}
          {loadingLeaderboard && leaderboardData.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 w-full bg-muted/50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground text-sm">
                Waiting for players...
              </p>
            </div>
          ) : allHaveZeroXP ? (
            // Case 1: Everyone has 0 XP - Show simple list with note
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Be the first to climb the leaderboard!
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Submit your first assignment to earn 100 XP and claim the #1
                    spot. The competition starts now!
                  </p>
                </div>
              </div>

              {/* Simple list - no podium */}
              <div className="flex flex-col space-y-2">
                {smartSortedData.map((student, index) => {
                  const isMe = student.id === user?.uid;

                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "flex items-center p-3 sm:p-4 rounded-xl border transition-all duration-200 group",
                        isMe
                          ? "bg-primary/5 border-primary/20 shadow-sm"
                          : "bg-card border-border hover:bg-muted/30"
                      )}
                    >
                      {/* Avatar + Name */}
                      <div className="flex items-center flex-1 gap-3 sm:gap-4 overflow-hidden">
                        <Avatar
                          className={cn(
                            "h-10 w-10 border flex-shrink-0",
                            isMe ? "border-primary/20" : "border-border"
                          )}
                        >
                          <AvatarImage src={student.photoUrl} />
                          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                            {student.displayName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={cn(
                              "text-sm font-medium truncate",
                              isMe ? "text-primary" : "text-foreground"
                            )}
                          >
                            {student.displayName}
                            {isMe && (
                              <span className="text-muted-foreground text-xs font-normal ml-2">
                                (You)
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Ready to start
                          </span>
                        </div>
                      </div>

                      {/* XP */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-muted-foreground">
                          0 XP
                        </span>
                      </div>

                      {/* Admin Delete */}
                      {isDevMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 ml-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            handleDelete(student.id, student.displayName)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {/* Top 3 Podium */}
              {smartSortedData.length > 0 && (
                <div
                  className={cn(
                    "flex justify-center items-end gap-2 sm:gap-8 pb-4 px-0 sm:px-2 transition-all duration-500 ease-in-out",
                    showHelp ? "pt-6 sm:pt-8" : "pt-16 sm:pt-24"
                  )}
                >
                  {/* Rank 2 */}
                  <div className="flex flex-col items-center gap-2 order-1 w-1/3 sm:w-32 max-w-[100px] group relative">
                    {smartSortedData[1] && smartSortedData[1].totalXP > 0 ? (
                      <>
                        <div className="relative">
                          {isDevMode && (
                            <div className="absolute -top-2 -right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-6 w-6 rounded-full shadow-md"
                                onClick={() =>
                                  handleDelete(
                                    smartSortedData[1].id,
                                    smartSortedData[1].displayName
                                  )
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <Avatar className="h-14 w-14 sm:h-20 sm:w-20 border-4 border-background ring-2 ring-zinc-300 shadow-xl">
                            <AvatarImage src={smartSortedData[1].photoUrl} />
                            <AvatarFallback className="text-lg bg-zinc-100 text-zinc-500">
                              {smartSortedData[1].displayName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-zinc-500 text-white text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full border-2 border-background shadow-sm">
                            2
                          </div>
                        </div>
                        <div className="text-center mt-1.5 sm:mt-2 space-y-0.5 w-full">
                          <p className="font-semibold text-xs sm:text-sm truncate w-full px-1">
                            {smartSortedData[1].displayName}
                          </p>
                          <p className="text-[10px] sm:text-xs text-primary font-bold">
                            {smartSortedData[1].totalXP.toLocaleString()} XP
                          </p>
                          <div className="min-h-[24px] flex items-center justify-center pt-1">
                            <BadgeList
                              badges={smartSortedData[1].badges || []}
                              limit={2}
                              size="sm"
                            />
                          </div>
                        </div>
                      </>
                    ) : studentsWithXP.length === 1 ? (
                      <div className="text-center space-y-2">
                        <div className="h-14 w-14 sm:h-20 sm:w-20 mx-auto rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <span className="text-2xl">🥈</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground px-2">
                          Submit 1 assignment to claim 2nd place!
                        </p>
                      </div>
                    ) : (
                      <div className="w-full" />
                    )}
                  </div>

                  {/* Rank 1 */}
                  <div className="flex flex-col items-center gap-2 order-2 w-1/3 sm:w-40 max-w-[120px] -mt-6 sm:-mt-8 z-10 group relative">
                    <div className="relative">
                      {isDevMode && (
                        <div className="absolute -top-2 -right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6 rounded-full shadow-md"
                            onClick={() =>
                              handleDelete(
                                smartSortedData[0].id,
                                smartSortedData[0].displayName
                              )
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 animate-bounce duration-[2000ms]">
                        <Crown className="fill-yellow-400 text-yellow-500 h-6 w-6 sm:h-8 sm:w-8 drop-shadow-sm" />
                      </div>
                      <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background ring-4 ring-yellow-400 shadow-2xl">
                        <AvatarImage src={smartSortedData[0].photoUrl} />
                        <AvatarFallback className="text-2xl bg-yellow-50 text-yellow-600">
                          {smartSortedData[0].displayName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 text-xs sm:text-sm font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-background shadow-sm">
                        1
                      </div>
                    </div>
                    <div className="text-center mt-2 sm:mt-3 space-y-0.5 w-full">
                      <p className="font-bold text-sm sm:text-base truncate w-full px-1">
                        {smartSortedData[0].displayName}
                      </p>
                      <p className="text-xs sm:text-sm text-primary font-black">
                        {smartSortedData[0].totalXP.toLocaleString()} XP
                      </p>
                      <div className="min-h-[28px] flex items-center justify-center pt-1">
                        <BadgeList
                          badges={smartSortedData[0].badges || []}
                          limit={3}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rank 3 */}
                  <div className="flex flex-col items-center gap-2 order-3 w-1/3 sm:w-32 max-w-[100px] group relative">
                    {smartSortedData[2] && smartSortedData[2].totalXP > 0 ? (
                      <>
                        <div className="relative">
                          {isDevMode && (
                            <div className="absolute -top-2 -right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-6 w-6 rounded-full shadow-md"
                                onClick={() =>
                                  handleDelete(
                                    smartSortedData[2].id,
                                    smartSortedData[2].displayName
                                  )
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <Avatar className="h-14 w-14 sm:h-20 sm:w-20 border-4 border-background ring-2 ring-amber-700/50 shadow-xl">
                            <AvatarImage src={smartSortedData[2].photoUrl} />
                            <AvatarFallback className="text-lg bg-amber-50 text-amber-700">
                              {smartSortedData[2].displayName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-700 text-amber-50 text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full border-2 border-background shadow-sm">
                            3
                          </div>
                        </div>
                        <div className="text-center mt-1.5 sm:mt-2 space-y-0.5 w-full">
                          <p className="font-semibold text-xs sm:text-sm truncate w-full px-1">
                            {smartSortedData[2].displayName}
                          </p>
                          <p className="text-[10px] sm:text-xs text-primary font-bold">
                            {smartSortedData[2].totalXP.toLocaleString()} XP
                          </p>
                          <div className="min-h-[24px] flex items-center justify-center pt-1">
                            <BadgeList
                              badges={smartSortedData[2].badges || []}
                              limit={2}
                              size="sm"
                            />
                          </div>
                        </div>
                      </>
                    ) : studentsWithXP.length >= 1 ? (
                      <div className="text-center space-y-2">
                        <div className="h-14 w-14 sm:h-20 sm:w-20 mx-auto rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <span className="text-2xl">🥉</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground px-2">
                          Spot open for 3rd place!
                        </p>
                      </div>
                    ) : (
                      <div className="w-full" />
                    )}
                  </div>
                </div>
              )}

              {/* Rest of the List */}
              <div className="flex flex-col space-y-2">
                {smartSortedData
                  .slice(Math.min(3, studentsWithXP.length))
                  .map((student, index) => {
                    const isMe = student.id === user?.uid;
                    const rank = Math.min(3, studentsWithXP.length) + index + 1;

                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "flex items-center p-3 sm:p-4 rounded-xl border transition-all duration-200 group",
                          isMe
                            ? "bg-primary/5 border-primary/20 shadow-sm"
                            : "bg-card border-border hover:bg-muted/30 hover:border-border"
                        )}
                      >
                        {/* Rank */}
                        <div className="w-8 sm:w-12 flex-shrink-0 flex items-center justify-center">
                          <span className="text-muted-foreground font-mono text-xs sm:text-sm font-medium">
                            {student.totalXP > 0 ? `#${rank}` : "-"}
                          </span>
                        </div>

                        {/* Avatar + Name */}
                        <div className="flex items-center flex-1 gap-3 sm:gap-4 overflow-hidden">
                          <Avatar
                            className={cn(
                              "h-8 w-8 sm:h-10 sm:w-10 border flex-shrink-0",
                              isMe ? "border-primary/20" : "border-border"
                            )}
                          >
                            <AvatarImage src={student.photoUrl} />
                            <AvatarFallback className="text-[10px] sm:text-xs bg-muted text-muted-foreground">
                              {student.displayName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span
                                className={cn(
                                  "text-xs sm:text-sm font-medium truncate",
                                  isMe ? "text-primary" : "text-foreground"
                                )}
                              >
                                {student.displayName}{" "}
                                {isMe && (
                                  <span className="text-muted-foreground text-[10px] sm:text-xs font-normal ml-0.5 sm:ml-2">
                                    (You)
                                  </span>
                                )}
                              </span>
                              {/* Badges Display */}
                              <BadgeList
                                badges={student.badges || []}
                                limit={3}
                                size="md"
                                className="scale-100" // Reset scale
                              />
                            </div>
                            <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              {student.processedAssignmentIds.length}{" "}
                              <span className="hidden sm:inline">missions</span>
                            </span>
                          </div>
                        </div>

                        {/* XP */}
                        <div className="text-right pl-2 sm:px-4 flex-shrink-0">
                          <span className="text-sm sm:text-lg font-mono font-medium text-foreground tracking-tight">
                            {student.totalXP.toLocaleString()}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5 sm:ml-1">
                            XP
                          </span>
                        </div>

                        {/* Admin Delete */}
                        {isDevMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              handleDelete(student.id, student.displayName)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
