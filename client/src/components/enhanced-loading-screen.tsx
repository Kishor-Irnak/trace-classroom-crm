import { useState, useEffect, ReactNode } from "react";
import { Loader2, Lightbulb, Sparkles, Rocket, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const LOADING_TIPS = [
  "Use the Timeline view to visualize your deadlines chronologically.",
  "Check the Leaderboard to compare your progress with peers.",
  "Assignments due in less than 3 days show up in your 'Warning' card.",
  "Syncing refreshes your data directly from Google Classroom.",
  "Complete assignments early to earn speed bonuses!",
  "Review the 'Next Actions' list to prioritize your day.",
  "Drag and drop tasks in the Pipeline to manage your workflow.",
  "Stay consistent! Daily progress builds your streak and XP.",
];

interface EnhancedLoadingScreenProps {
  children?: ReactNode; // For the background skeleton
  message?: string; // e.g., "Building Schedule", "Syncing Workspace"
  tips?: string[]; // Optional custom tips
}

export function EnhancedLoadingScreen({
  children,
  message = "Loading Workspace",
  tips, // Destructure tips
}: EnhancedLoadingScreenProps) {
  const [progress, setProgress] = useState(10);
  const [tipIndex, setTipIndex] = useState(0);

  // Use provided tips or fallback to default
  const activeTips = tips && tips.length > 0 ? tips : LOADING_TIPS;

  useEffect(() => {
    // Increment progress bar
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) return 100;
        const diff = Math.random() * 15;
        // Stall at 90% until real data loads (unmount)
        return Math.min(oldProgress + diff, 90);
      });
    }, 400);

    // Rotate tips
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % activeTips.length);
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(tipTimer);
    };
  }, []);

  return (
    <div className="relative h-screen w-full bg-background overflow-hidden flex flex-col">
      {/* Background Structure (Blurred Skeleton) */}
      {/* Background Structure (Blurred Skeleton or Pattern) */}
      {children ? (
        <div className="absolute inset-0 opacity-30 pointer-events-none select-none filter blur-[2px] scale-[0.98]">
          {children}
        </div>
      ) : (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
          <div className="absolute bottom-0 right-0 -z-10 h-[300px] w-[300px] rounded-full bg-indigo-500/20 opacity-20 blur-[100px]"></div>
        </div>
      )}

      {/* Foreground Overlay */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm">
        <div className="w-full max-w-sm mx-auto p-6 flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Main Loader Section */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <div className="h-14 w-14 bg-background border border-border shadow-xl rounded-2xl flex items-center justify-center relative z-10 group">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              </div>
              <div className="absolute -right-2 -top-2 z-20">
                <Sparkles className="h-5 w-5 text-yellow-500 animate-bounce delay-75" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {message}
              </h2>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                Trace Is Ready
              </p>
            </div>
          </div>

          {/* Modern Progress Bar */}
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm border border-border/50">
              <div
                className="h-full bg-gradient-to-r from-primary/80 via-primary to-indigo-500 transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]" />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" /> Optimizing
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Glassmorphism Tip Card */}
          <div className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-indigo-500/5 rounded-xl border border-primary/10 transition-all duration-500 group-hover:border-primary/20" />
            <div className="relative p-4 flex gap-3.5 items-start">
              <div className="mt-0.5 p-1.5 bg-background/80 rounded-lg shadow-sm border border-border/50 shrink-0">
                <Rocket className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1 pt-0.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  Pro Tip
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed transition-all duration-300 min-h-[40px]">
                  {activeTips[tipIndex]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
