import {
  Flame,
  Zap,
  Trophy,
  CheckCircle2,
  CalendarDays,
  Target,
  Award,
  Star,
  Rocket,
} from "lucide-react";

export interface Badge {
  id: string;
  label: string;
  description: string;
  category: "consistency" | "productivity" | "reliability";
  icon: any;
  color: string; // Tailwind class for text/bg
}

export const BADGES: Record<string, Badge> = {
  // Consistency (Streak)
  "5-day-consistent": {
    id: "5-day-consistent",
    label: "5-Day Streak",
    description: "Visited app for 5 consecutive days",
    category: "consistency",
    icon: Flame,
    color: "text-orange-500 bg-orange-50 dark:bg-orange-500/10",
  },
  "10-day-consistent": {
    id: "10-day-consistent",
    label: "10-Day Streak",
    description: "Visited app for 10 consecutive days",
    category: "consistency",
    icon: Zap,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
  },
  "30-day-consistent": {
    id: "30-day-consistent",
    label: "Monthly Master",
    description: "Visited app for 30 consecutive days",
    category: "consistency",
    icon: Trophy,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-500/10",
  },

  // Productivity (Volume)
  "10-submissions": {
    id: "10-submissions",
    label: "Getting Started",
    description: "Submitted 10 assignments",
    category: "productivity",
    icon: Target,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
  },
  "25-submissions": {
    id: "25-submissions",
    label: "Productivity Pro",
    description: "Submitted 25 assignments",
    category: "productivity",
    icon: Rocket,
    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
  },
  "50-submissions": {
    id: "50-submissions",
    label: "Assignment Titan",
    description: "Submitted 50 assignments",
    category: "productivity",
    icon: Star,
    color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10",
  },

  // Reliability (Attendance)
  "perfect-week": {
    id: "perfect-week",
    label: "Perfect Week",
    description: "100% Attendance for 7 days",
    category: "reliability",
    icon: CalendarDays,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
  },
  "attendance-champion": {
    id: "attendance-champion",
    label: "Attendance Champ",
    description: "Maintained high attendance for 30 days",
    category: "reliability",
    icon: CheckCircle2,
    color: "text-teal-500 bg-teal-50 dark:bg-teal-500/10",
  },
};

export const BADGE_IDS = Object.keys(BADGES);
