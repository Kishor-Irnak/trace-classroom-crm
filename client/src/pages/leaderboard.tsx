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
  AlertCircle,
  Info,
  X,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export default function LeaderboardPage() {
  const { user, signOut } = useAuth();
  const {
    courses,
    assignments,
    isLoading: isClassroomLoading,
  } = useClassroom();

  const [viewMode, setViewMode] = useState<"class" | "college">("class");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardStudent[]>(
    []
  );
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showCollegeWarning, setShowCollegeWarning] = useState(true);

  // Historical Sync States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Initializing...");

  // Set default course to "all-courses" or first course
  // No longer need default course selection effect since we default to 'class' view
  // and always fetch from 'all-courses' collection.

  // Fetch Leaderboard Data (Multi-source aggregation)
  useEffect(() => {
    setLoadingLeaderboard(true);

    // We need to listen to 'all-courses' AND every specific course the user is enrolled in.
    // This ensures we capture legacy data stored in specific course collections.
    const uniqueSourceIds = Array.from(
      new Set(["all-courses", ...courses.map((c) => c.id)])
    );

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

        // "Proven Classmate" means they definitely share a course/assignment with me.
        // This is safe to infer "Same College" even without domain data.
        const isProvenClassmate = hasCommonSubject || hasSharedAssignment;

        if (viewMode === "college") {
          // COLLEGE VIEW: Show ALL students from the same email domain
          // This is for fun/entertainment, not academic fairness
          shouldShow = !!isSameDomain;

          // Debug logging
          if (student.id === user?.uid || isSameDomain) {
            console.log(
              `[College Filter] Student: ${student.displayName}, Domain: ${studentDomain}, User Domain: ${userDomain}, Match: ${isSameDomain}`
            );
          }
        } else {
          // CLASS VIEW (Default):
          // 1. Strict: Same Domain AND Shared Subject
          // 2. OR Strict Proxy: Legacy User WITH Shared Assignment
          const strictClassMatch = isSameDomain && hasCommonSubject;
          shouldShow = strictClassMatch || hasSharedAssignment;
        }

        if (shouldShow) {
          students.push(student);
        }
      });

      // Sort by Total XP descending
      students.sort((a, b) => b.totalXP - a.totalXP);

      setLeaderboardData(students);
      setLoadingLeaderboard(false); // Only set false after first process
    };

    // Attach listeners
    uniqueSourceIds.forEach((sourceId) => {
      const studentsRef = collection(db, "leaderboards", sourceId, "students");
      // Limit per collection to avoid massive reads, but high enough to be useful
      const q = query(studentsRef, orderBy("totalXP", "desc"), limit(50));

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Merge strategy: If exists, keep the one with higher XP (or just overwrite? Overwrite is simpler usually)
          // Let's optimize: Only overwrite if XP is higher or equal (latest info)
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
          } as LeaderboardStudent;

          const existing = studentMap.get(doc.id);
          if (!existing || newStudent.totalXP >= existing.totalXP) {
            studentMap.set(doc.id, newStudent);
          }
        });
        updateLeaderboardState();
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [viewMode, user, courses, assignments]); // Re-run if viewMode changes or user data loads

  const syncHistoricalData = async () => {
    if (!user) return;

    setIsScanning(true);
    setScanProgress(5);
    setScanStatus("Fetching historical classroom data...");

    // 1. Identify Assignments to Process (Always All Courses for leaderboard aggregate)
    const relevantAssignments = assignments;

    setScanProgress(20);
    setScanStatus(`Scanning ${relevantAssignments.length} past assignments...`);

    // 2. Fetch current User DB State to prevent double counting (Conceptually)
    // In this implementation, we re-calculate Total XP from the Source of Truth (Classroom API)
    // effectively ensuring no doubles and handling grade corrections automatically.

    let calculatedXP = 0;
    const processedIds: string[] = [];

    // Animation delay helper
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    // 3. Iterate and Calculate
    let processedCount = 0;

    // Process in chunks for visual effect if list is short, or just loop
    for (const assignment of relevantAssignments) {
      processedCount++;
      // Update progress occasionally
      if (processedCount % 5 === 0) {
        setScanProgress(
          20 + (processedCount / relevantAssignments.length) * 60
        );
        await delay(10); // Small delay for UI smoothness
      }

      const isCompleted =
        assignment.systemStatus === "submitted" ||
        assignment.systemStatus === "graded";

      if (isCompleted) {
        // Base XP
        calculatedXP += 100;

        // Bonus XP
        if (assignment.submittedAt && assignment.dueDate) {
          const submittedTime = new Date(assignment.submittedAt).getTime();
          const dueTime = new Date(assignment.dueDate).getTime();
          const hoursDiff = (dueTime - submittedTime) / (1000 * 60 * 60);

          if (hoursDiff > 48) {
            calculatedXP += 50;
          }
        }

        processedIds.push(assignment.id);
      }
    }

    setScanProgress(90);
    setScanStatus("Syncing to leaderboard...");

    // 4. Update Firestore
    try {
      const userRef = doc(
        db,
        "leaderboards",
        "all-courses",
        "students",
        user.uid
      );

      // Data Preparation: derive domain and subject list
      const email = user.email || "";
      const emailDomain = email.includes("@") ? email.split("@")[1] : "";
      const enrolledCourseIds = courses.map((c) => c.id);

      await setDoc(
        userRef,
        {
          displayName: user.displayName || "Anonymous",
          photoUrl: user.photoURL || "",
          email: email, // Stored for future logic
          emailDomain: emailDomain, // Stored to avoid repetitive splitting
          enrolledCourseIds: enrolledCourseIds, // Stored for subject matching
          totalXP: calculatedXP,
          processedAssignmentIds: processedIds,
          lastSyncedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setScanProgress(100);
      setScanStatus("Synchronization Complete!");
      await delay(500);
    } catch (err) {
      console.error("Sync Failed", err);
      setScanStatus("Sync Failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const selectedTitle = viewMode === "class" ? "My Class" : "My College";

  const myEntry = leaderboardData.find((s) => s.id === user?.uid);
  const myXP = myEntry?.totalXP || 0;
  const hasData = !!myEntry && myXP > 0;

  if (!isClassroomLoading && courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 p-6">
        <div className="text-center space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-lg font-medium text-destructive">
            Troubleshooting
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            It seems data isn't fetching correctly. Please log out and log in
            again to resolve this.
          </p>
        </div>
        <Button
          onClick={() => signOut()}
          variant="destructive"
          className="px-4 py-2"
        >
          Log Out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-sans selection:bg-muted">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 gap-4 sm:gap-0 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
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
          {showHelp && (
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
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-500" />
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

          {/* Action Section: Sync Button (Only if no data or requested) */}
          {(!hasData && !loadingLeaderboard) || isScanning ? (
            <div className="bg-muted/30 border border-border border-dashed rounded-xl p-6 sm:p-8 text-center animate-in fade-in slide-in-from-bottom-2">
              {isScanning ? (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground">
                    <span>{scanStatus}</span>
                    <span>{Math.round(scanProgress)}%</span>
                  </div>
                  <Progress value={scanProgress} className="h-2" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Scan className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">No Score Detected</h3>
                    <p className="text-sm text-muted-foreground max-w-[280px] sm:max-w-sm mx-auto">
                      Calculate your XP based on all your past submitted
                      assignments to join the leaderboard.
                    </p>
                  </div>
                  <Button
                    onClick={syncHistoricalData}
                    size="lg"
                    className="mt-2 font-semibold w-full sm:w-auto"
                  >
                    Calculate My Archive Score
                  </Button>
                </div>
              )}
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
          ) : leaderboardData.length === 0 && !isScanning ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground text-sm">
                Waiting for players...
              </p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {/* Top 3 Podium */}
              {leaderboardData.length > 0 && (
                <div
                  className={cn(
                    "flex justify-center items-end gap-2 sm:gap-8 pb-4 px-0 sm:px-2 transition-all duration-500 ease-in-out",
                    showHelp ? "pt-6 sm:pt-8" : "pt-16 sm:pt-24"
                  )}
                >
                  {/* Rank 2 */}
                  <div className="flex flex-col items-center gap-2 order-1 w-1/3 sm:w-32 max-w-[100px]">
                    {leaderboardData[1] ? (
                      <>
                        <div className="relative">
                          <Avatar className="h-14 w-14 sm:h-20 sm:w-20 border-4 border-background ring-2 ring-zinc-300 shadow-xl">
                            <AvatarImage src={leaderboardData[1].photoUrl} />
                            <AvatarFallback className="text-lg bg-zinc-100 text-zinc-500">
                              {leaderboardData[1].displayName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-zinc-500 text-white text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full border-2 border-background shadow-sm">
                            2
                          </div>
                        </div>
                        <div className="text-center mt-1.5 sm:mt-2 space-y-0.5 w-full">
                          <p className="font-semibold text-xs sm:text-sm truncate w-full px-1">
                            {leaderboardData[1].displayName}
                          </p>
                          <p className="text-[10px] sm:text-xs text-primary font-bold">
                            {leaderboardData[1].totalXP.toLocaleString()} XP
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full" />
                    )}
                  </div>

                  {/* Rank 1 */}
                  <div className="flex flex-col items-center gap-2 order-2 w-1/3 sm:w-40 max-w-[120px] -mt-6 sm:-mt-8 z-10">
                    <div className="relative">
                      <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 animate-bounce duration-[2000ms]">
                        <Crown className="fill-yellow-400 text-yellow-500 h-6 w-6 sm:h-8 sm:w-8 drop-shadow-sm" />
                      </div>
                      <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background ring-4 ring-yellow-400 shadow-2xl">
                        <AvatarImage src={leaderboardData[0].photoUrl} />
                        <AvatarFallback className="text-2xl bg-yellow-50 text-yellow-600">
                          {leaderboardData[0].displayName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 text-xs sm:text-sm font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-background shadow-sm">
                        1
                      </div>
                    </div>
                    <div className="text-center mt-2 sm:mt-3 space-y-0.5 w-full">
                      <p className="font-bold text-sm sm:text-base truncate w-full px-1">
                        {leaderboardData[0].displayName}
                      </p>
                      <p className="text-xs sm:text-sm text-primary font-black">
                        {leaderboardData[0].totalXP.toLocaleString()} XP
                      </p>
                    </div>
                  </div>

                  {/* Rank 3 */}
                  <div className="flex flex-col items-center gap-2 order-3 w-1/3 sm:w-32 max-w-[100px]">
                    {leaderboardData[2] ? (
                      <>
                        <div className="relative">
                          <Avatar className="h-14 w-14 sm:h-20 sm:w-20 border-4 border-background ring-2 ring-amber-700/50 shadow-xl">
                            <AvatarImage src={leaderboardData[2].photoUrl} />
                            <AvatarFallback className="text-lg bg-amber-50 text-amber-700">
                              {leaderboardData[2].displayName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-700 text-amber-50 text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full border-2 border-background shadow-sm">
                            3
                          </div>
                        </div>
                        <div className="text-center mt-1.5 sm:mt-2 space-y-0.5 w-full">
                          <p className="font-semibold text-xs sm:text-sm truncate w-full px-1">
                            {leaderboardData[2].displayName}
                          </p>
                          <p className="text-[10px] sm:text-xs text-primary font-bold">
                            {leaderboardData[2].totalXP.toLocaleString()} XP
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full" />
                    )}
                  </div>
                </div>
              )}

              {/* Rest of the List */}
              <div className="flex flex-col space-y-2">
                {leaderboardData.slice(3).map((student, index) => {
                  const isMe = student.id === user?.uid;
                  const rank = index + 4;

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
                          #{rank}
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
                          <span
                            className={cn(
                              "text-xs sm:text-sm font-medium truncate",
                              isMe ? "text-primary" : "text-foreground"
                            )}
                          >
                            {student.displayName}{" "}
                            {isMe && (
                              <span className="text-muted-foreground text-[10px] sm:text-xs font-normal ml-1 sm:ml-2">
                                (You)
                              </span>
                            )}
                          </span>
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
