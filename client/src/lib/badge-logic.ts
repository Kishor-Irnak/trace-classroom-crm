import { startOfDay, differenceInCalendarDays, parseISO } from "date-fns";
import { Badge, BADGES, BADGE_IDS } from "./badges";

// Minimal interface to avoid importing full schema if not needed,
// strictly for what we need to calculate
interface AssignmentLike {
  id: string;
  systemStatus: string;
  submittedAt: string | null;
  gradedAt: string | null;
}

export function calculateStreak(assignments: AssignmentLike[]): number {
  const submittedDates = assignments
    .filter(
      (a) =>
        (a.systemStatus === "submitted" || a.systemStatus === "graded") &&
        (a.submittedAt || a.gradedAt)
    )
    .map((a) => {
      const dateStr = a.submittedAt || a.gradedAt;
      return startOfDay(parseISO(dateStr!)).getTime();
    });

  if (submittedDates.length === 0) return 0;

  // Sort descending and unique
  const uniqueDates = Array.from(new Set(submittedDates)).sort((a, b) => b - a);

  let streak = 0;
  const today = startOfDay(new Date()).getTime();

  // Check if the most recent submission was today or yesterday to keep streak alive
  // If most recent is older than yesterday, streak is broken (0),
  // UNLESS we want to calculate "max streak ever"?
  // User Prompt says "Streak break does NOT remove badge".
  // So we probably want "Highest Streak Achieved" or we just calculate current streak
  // and the badge is permanent once earned.
  // Let's calculate CURRENT streak for the logic, but badges are permanent.

  // Actually, consistency badges imply "Reached X days streak".
  // If I calculate current streak, and it's 5, they get the badge.
  // If they break it tomorrow, they still have the badge.
  // So checking 'current streak' is sufficient for awarding.

  if (uniqueDates.length === 0) return 0;

  // Optimistic streak: If last submission was today or yesterday
  const lastSubmission = uniqueDates[0];
  const diff = differenceInCalendarDays(today, lastSubmission);

  if (diff > 1) {
    // Streak broken
    return 0;
  }

  streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = uniqueDates[i];
    const next = uniqueDates[i + 1];
    const dayDiff = differenceInCalendarDays(current, next);

    if (dayDiff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function calculateBadges(
  existingBadges: string[] = [],
  assignments: AssignmentLike[],
  // Optional reliability stats if available
  attendanceStats?: { total: number; attended: number }
): string[] {
  const newBadges = new Set(existingBadges);
  const streak = calculateStreak(assignments);

  // Count submitted assignments
  const submissionCount = assignments.filter(
    (a) => a.systemStatus === "submitted" || a.systemStatus === "graded"
  ).length;

  // 1. Consistency Badges
  if (streak >= 5) newBadges.add("5-day-consistent");
  if (streak >= 10) newBadges.add("10-day-consistent");
  if (streak >= 30) newBadges.add("30-day-consistent");

  // 2. Productivity Badges
  if (submissionCount >= 10) newBadges.add("10-submissions");
  if (submissionCount >= 25) newBadges.add("25-submissions");
  if (submissionCount >= 50) newBadges.add("50-submissions");

  // 3. Reliability Badges (Simple Aggregate Check)
  // Logic: > 95% attendance with at least 14 classes (approx 2 weeks perfect) -> simplified proxy
  // Or usage of specific flags passed in.
  if (attendanceStats) {
    const { total, attended } = attendanceStats;
    if (total >= 7 && attended / total === 1) {
      newBadges.add("perfect-week"); // Placeholder logic for "Perfect Record in short term"
    }

    // "Attendance Champion" -> High volume + High rate
    if (total >= 30 && attended / total >= 0.9) {
      newBadges.add("attendance-champion");
    }
  }

  return Array.from(newBadges);
}
