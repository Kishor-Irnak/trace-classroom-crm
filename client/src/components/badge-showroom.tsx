import { BadgeIcon } from "@/components/badge-ui";
import { BADGES, BADGE_IDS } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface BadgeShowroomProps {
  earnedBadges: string[];
  currentStreak?: number;
  submissionCount?: number;
  attendanceStats?: { total: number; attended: number };
}

export function BadgeShowroom({
  earnedBadges,
  currentStreak = 0,
  submissionCount = 0,
  attendanceStats,
}: BadgeShowroomProps) {
  const categories = [
    { id: "productivity", label: "Productivity & Volume" },
    { id: "reliability", label: "Reliability & Attendance" },
  ];

  const earnedSet = new Set(earnedBadges);

  console.log("BadgeShowroom - attendanceStats:", attendanceStats);

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const categoryBadges = BADGE_IDS.map((id) => BADGES[id]).filter(
          (b) => b.category === category.id
        );

        if (categoryBadges.length === 0) return null;

        return (
          <div key={category.id} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              {category.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryBadges.map((badge) => {
                const isEarned = earnedSet.has(badge.id);

                // Check if progress has started to highlight the badge
                let hasStarted = false;
                if (!isEarned) {
                  if (category.id === "consistency") {
                    // Consistency badges default to showing 1/Target, so always "started"
                    hasStarted = true;
                  } else if (category.id === "productivity") {
                    hasStarted = (submissionCount || 0) > 0;
                  } else if (category.id === "reliability") {
                    hasStarted = (attendanceStats?.total || 0) > 0;
                  }
                }

                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                      isEarned
                        ? "bg-gradient-to-br from-card to-card/50 border-border shadow-md hover:shadow-lg"
                        : hasStarted
                        ? "bg-muted/40 border-dashed border-border/60" // Started: Full opacity/color
                        : "bg-muted/30 border-dashed border-border/50 opacity-60 grayscale" // Not started: Dimmed
                    )}
                  >
                    {/* Icon Container */}
                    <div
                      className={cn(
                        "flex-shrink-0 flex items-center justify-center rounded-full h-12 w-12 ring-2 ring-inset transition-all",
                        isEarned
                          ? cn(
                              badge.color,
                              "ring-black/10 dark:ring-white/20 shadow-sm"
                            )
                          : "bg-muted ring-border text-muted-foreground"
                      )}
                    >
                      <badge.icon
                        className={cn("h-6 w-6", isEarned && "drop-shadow-sm")}
                        strokeWidth={2.5}
                      />
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "font-bold text-sm truncate",
                            isEarned
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {badge.label}
                        </p>
                        {!isEarned && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                        {badge.description}
                      </p>

                      {/* Progress Bar for Consistency Badges */}
                      {!isEarned && category.id === "consistency" && (
                        <div className="mt-2 space-y-1">
                          {(() => {
                            let target = 0;
                            if (badge.id === "5-day-consistent") target = 5;
                            else if (badge.id === "10-day-consistent")
                              target = 10;
                            else if (badge.id === "30-day-consistent")
                              target = 30;

                            if (target > 0) {
                              // If currentStreak is 0 but user is viewing this, they've logged in at least once
                              const streakNum = Number(currentStreak) || 1;
                              const progress = Math.min(
                                (streakNum / target) * 100,
                                100
                              );
                              return (
                                <>
                                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                      {Math.round(progress)}%
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-bold">
                                      {streakNum} / {target} Days
                                    </p>
                                  </div>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}

                      {/* Progress Bar for Productivity Badges */}
                      {!isEarned && category.id === "productivity" && (
                        <div className="mt-2 space-y-1">
                          {(() => {
                            let target = 0;
                            if (badge.id === "10-submissions") target = 10;
                            else if (badge.id === "25-submissions") target = 25;
                            else if (badge.id === "50-submissions") target = 50;

                            if (target > 0) {
                              const current = Number(submissionCount) || 0;
                              const progress = Math.min(
                                (current / target) * 100,
                                100
                              );
                              return (
                                <>
                                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                                    <div
                                      className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                      {Math.round(progress)}%
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-bold">
                                      {current} / {target} Submissions
                                    </p>
                                  </div>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}

                      {/* Progress Bar for Reliability Badges */}
                      {!isEarned && category.id === "reliability" && (
                        <div className="mt-2 space-y-1">
                          {(() => {
                            const { total, attended } = attendanceStats || {
                              total: 0,
                              attended: 0,
                            };
                            let targetDays = 0;
                            let targetPercentage = 0;

                            if (badge.id === "perfect-week") {
                              targetDays = 7;
                              targetPercentage = 100;
                            } else if (badge.id === "attendance-champion") {
                              targetDays = 30;
                              targetPercentage = 90;
                            }

                            if (targetDays > 0) {
                              const currentPercentage =
                                total > 0 ? (attended / total) * 100 : 0;
                              const daysProgress = Math.min(
                                (total / targetDays) * 100,
                                100
                              );
                              const percentageProgress = Math.min(
                                (currentPercentage / targetPercentage) * 100,
                                100
                              );
                              const overallProgress = Math.min(
                                (daysProgress + percentageProgress) / 2,
                                100
                              );

                              return (
                                <>
                                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                                      style={{ width: `${overallProgress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                      {Math.round(overallProgress)}%
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-bold">
                                      {total} days •{" "}
                                      {Math.round(currentPercentage)}% attended
                                    </p>
                                  </div>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    {isEarned && (
                      <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
