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
import { Trophy, Medal, Crown, Loader2, Scan, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardStudent {
  id: string; // userId
  displayName: string;
  photoUrl: string;
  totalXP: number;
  processedAssignmentIds: string[]; // assignmentIds
  lastSyncedAt?: any;
}

export default function LeaderboardPage() {
  const { user, signOut } = useAuth();
  const { courses, assignments, isLoading: isClassroomLoading } = useClassroom();
  
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardStudent[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  
  // Historical Sync States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Initializing...");

  // Set default course to "all-courses" or first course
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId("all-courses");
    }
  }, [courses, selectedCourseId]);

  // Fetch Leaderboard Data (Real-time)
  useEffect(() => {
    if (!selectedCourseId) return;

    setLoadingLeaderboard(true);
    const studentsRef = collection(
      db,
      "leaderboards",
      selectedCourseId, 
      "students"
    );
    const q = query(studentsRef, orderBy("totalXP", "desc"), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const students: LeaderboardStudent[] = [];
      snapshot.forEach((doc) => {
        // Map Firestore data to interface
        const data = doc.data();
        students.push({ 
            id: doc.id, 
            displayName: data.displayName || data.name || "Anonymous", // Fallback for old data
            photoUrl: data.photoUrl || data.avatar || "",
            totalXP: data.totalXP || data.xp || 0,
            processedAssignmentIds: data.processedAssignmentIds || data.completedTasks || []
        } as LeaderboardStudent);
      });
      setLeaderboardData(students);
      setLoadingLeaderboard(false);
    });

    return () => unsubscribe();
  }, [selectedCourseId]);

  const syncHistoricalData = async () => {
    if (!user || !selectedCourseId) return;
    
    setIsScanning(true);
    setScanProgress(5);
    setScanStatus("Fetching historical classroom data...");

    // 1. Identify Assignments to Process
    // If "All Courses", use all assignments. Else filter by course.
    const relevantAssignments = selectedCourseId === "all-courses"
      ? assignments
      : assignments.filter(a => a.courseId === selectedCourseId);

    setScanProgress(20);
    setScanStatus(`Scanning ${relevantAssignments.length} past assignments...`);

    // 2. Fetch current User DB State to prevent double counting (Conceptually)
    // In this implementation, we re-calculate Total XP from the Source of Truth (Classroom API)
    // effectively ensuring no doubles and handling grade corrections automatically.
    
    let calculatedXP = 0;
    const processedIds: string[] = [];

    // Animation delay helper
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // 3. Iterate and Calculate
    let processedCount = 0;
    
    // Process in chunks for visual effect if list is short, or just loop
    for (const assignment of relevantAssignments) {
       processedCount++;
       // Update progress occasionally
       if (processedCount % 5 === 0) {
           setScanProgress(20 + (processedCount / relevantAssignments.length) * 60);
           await delay(10); // Small delay for UI smoothness
       }

       const isCompleted = 
          assignment.userStatus === "submitted" || 
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
        const userRef = doc(db, "leaderboards", selectedCourseId, "students", user.uid);
        
        await setDoc(userRef, {
            displayName: user.displayName || "Anonymous",
            photoUrl: user.photoURL || "",
            totalXP: calculatedXP,
            processedAssignmentIds: processedIds,
            lastSyncedAt: serverTimestamp()
        }, { merge: true });

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

  const selectedCourseName = 
     selectedCourseId === "all-courses" 
       ? "All Courses" 
       : courses.find((c) => c.id === selectedCourseId)?.name || "Select a Course";

  const myEntry = leaderboardData.find(s => s.id === user?.uid);
  const myXP = myEntry?.totalXP || 0;
  const hasData = !!myEntry && myXP > 0;

  if (!isClassroomLoading && courses.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 p-6">
          <div className="text-center space-y-2">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-lg font-medium text-destructive">Troubleshooting</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              It seems data isn't fetching correctly. Please log out and log in again to resolve this.
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
             {selectedCourseName}
          </p>
        </div>

        <div className="w-full sm:w-[240px]">
          <Select
            value={selectedCourseId || ""}
            onValueChange={setSelectedCourseId}
          >
            <SelectTrigger className="w-full bg-background border-border hover:bg-muted/50 text-foreground h-9 rounded-full px-4 text-xs font-medium focus:ring-ring">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-courses" className="font-semibold border-b border-border mb-1 pb-1">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem
                  key={course.id}
                  value={course.id}
                  className="text-xs"
                >
                  {course.name}
                </SelectItem>
              ))}
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
                          Complete assignments to earn <br className="hidden sm:block"/>
                          <span className="font-bold text-foreground">100 XP</span> instantly.
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                         <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_currentColor]" />
                         <span className="leading-snug">
                           Submit <span className="font-medium text-foreground">48h early</span> for a <br className="hidden sm:block"/>
                           <span className="font-bold text-amber-600 dark:text-amber-400">50 XP Speed Bonus</span>.
                         </span>
                      </div>
                  </div>
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
                                Calculate your XP based on all your past submitted assignments to join the leaderboard.
                            </p>
                        </div>
                        <Button onClick={syncHistoricalData} size="lg" className="mt-2 font-semibold w-full sm:w-auto">
                            Calculate My Archive Score
                        </Button>
                    </div>
                 )}
             </div>
          ) : null}


          {/* Leaderboard List */}
          {loadingLeaderboard && leaderboardData.length === 0 ? (
             <div className="space-y-4">
                 {[1,2,3].map(i => (
                     <div key={i} className="h-16 w-full bg-muted/50 rounded-xl animate-pulse" />
                 ))}
             </div>
          ) : leaderboardData.length === 0 && !isScanning ? (
             <div className="flex flex-col items-center justify-center py-10">
                 <p className="text-muted-foreground text-sm">Waiting for players...</p>
             </div>
          ) : (
             <div className="flex flex-col space-y-2">
                 {leaderboardData.map((student, index) => {
                     const isMe = student.id === user?.uid;
                     const rank = index + 1;
                     
                     return (
                         <div
                            key={student.id}
                            className={cn(
                                "flex items-center p-3 sm:p-4 rounded-xl border transition-all duration-200 group",
                                isMe 
                                  ? "bg-card border-border shadow-sm ring-1 ring-border" 
                                  : "bg-transparent border-transparent hover:bg-muted/30 hover:border-border/50"
                            )}
                         >
                             {/* Rank */}
                             <div className="w-8 sm:w-12 flex-shrink-0 flex items-center justify-center">
                                 {rank === 1 ? (
                                     <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-500/20" />
                                 ) : rank === 2 ? (
                                     <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 fill-zinc-400/20" />
                                 ) : rank === 3 ? (
                                     <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700 fill-amber-700/20" />
                                 ) : (
                                     <span className="text-muted-foreground font-mono text-xs sm:text-sm ml-1">#{rank}</span>
                                 )}
                             </div>

                             {/* Avatar + Name */}
                             <div className="flex items-center flex-1 gap-3 sm:gap-4 overflow-hidden">
                                 <Avatar className={cn("h-8 w-8 sm:h-10 sm:w-10 border flex-shrink-0", isMe ? "border-foreground/10" : "border-border")}>
                                     <AvatarImage src={student.photoUrl} />
                                     <AvatarFallback className="text-[10px] sm:text-xs bg-muted text-muted-foreground">
                                         {student.displayName?.[0]?.toUpperCase()}
                                     </AvatarFallback>
                                 </Avatar>
                                 <div className="flex flex-col min-w-0">
                                     <span className={cn("text-xs sm:text-sm font-medium truncate", isMe ? "text-foreground" : "text-foreground/80 group-hover:text-foreground")}>
                                         {student.displayName} {isMe && <span className="text-muted-foreground text-[10px] sm:text-xs font-normal ml-1 sm:ml-2">(You)</span>}
                                     </span>
                                     <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                         {student.processedAssignmentIds.length} <span className="hidden sm:inline">missions completed</span><span className="sm:hidden">missions</span>
                                     </span>
                                 </div>
                             </div>

                             {/* XP */}
                             <div className="text-right pl-2 sm:px-4 flex-shrink-0">
                                 <span className="text-sm sm:text-lg font-mono font-medium text-foreground tracking-tight">
                                     {student.totalXP.toLocaleString()}
                                 </span>
                                 <span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5 sm:ml-1">XP</span>
                             </div>
                         </div>
                     );
                 })}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
