import { z } from "zod";

export const assignmentStatusValues = [
  "backlog",
  "in_progress",
  "submitted",
  "graded",
  "overdue",
] as const;
export type AssignmentStatus = (typeof assignmentStatusValues)[number];

export const userStatusValues = [
  "backlog",
  "in_progress",
  "focus",
  "review",
] as const;
export type UserStatus = (typeof userStatusValues)[number];

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
  classroomConnected: z.boolean().default(false),
  backgroundSyncEnabled: z.boolean().default(true),
  timezone: z.string().default("auto"),
  lastSyncedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const courseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  classroomId: z.string(),
  name: z.string(),
  section: z.string().nullable(),
  descriptionHeading: z.string().nullable(),
  room: z.string().nullable(),
  ownerId: z.string().nullable(),
  enrollmentCode: z.string().nullable(),
  courseState: z.string().nullable(),
  alternateLink: z.string().nullable(),
  lastSyncedAt: z.string(),
  color: z.string().optional(),
  attendanceData: z.record(z.any()).optional().nullable(),
});

export type Course = z.infer<typeof courseSchema>;

export const assignmentSchema = z.object({
  id: z.string(),
  uniqueId: z.string(),
  userId: z.string(),
  courseId: z.string(),
  courseName: z.string(),
  classroomId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string().nullable(),
  dueTime: z.string().nullable(),
  maxPoints: z.number().nullable(),
  systemStatus: z.enum(assignmentStatusValues),
  userStatus: z.enum(userStatusValues).nullable(),
  submissionId: z.string().nullable(),
  submittedAt: z.string().nullable(),
  gradedAt: z.string().nullable(),
  grade: z.number().nullable(),
  alternateLink: z.string().nullable(),
  createdAt: z.string(),
  lastSyncedAt: z.string(),
});

export type Assignment = z.infer<typeof assignmentSchema>;

export const noteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  assignmentId: z.string(),
  content: z.string(),
  isImportant: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Note = z.infer<typeof noteSchema>;

export const insertNoteSchema = noteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNote = z.infer<typeof insertNoteSchema>;

export const updateNoteSchema = noteSchema.partial().required({ id: true });
export type UpdateNote = z.infer<typeof updateNoteSchema>;

export const insertUserSchema = userSchema.omit({ createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

export interface PipelineColumn {
  id: AssignmentStatus;
  title: string;
  assignments: Assignment[];
}

export interface DashboardMetrics {
  totalActive: number;
  upcoming3Days: number;
  upcoming7Days: number;
  overdue: number;
  weeklyWorkload: { day: string; count: number; isToday: boolean }[];
  nextActions: Assignment[];
}

export interface TimelineGroup {
  date: string;
  dateLabel: string;
  assignments: Assignment[];
}

export const noteMaterialSchema = z.object({
  id: z.string(),
  uniqueId: z.string(),
  userId: z.string(),
  courseId: z.string(),
  courseName: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  alternateLink: z.string().nullable(),
  materials: z.array(z.any()).nullable(),
  createdAt: z.string(),
  lastSyncedAt: z.string(),
});

export type NoteMaterial = z.infer<typeof noteMaterialSchema>;

export const activitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().nullable(),
  type: z.enum(["badge_earned", "assignment_completed", "streak_milestone"]),
  content: z.string(),
  courseId: z.string().optional(),
  emailDomain: z.string().optional(),
  relatedUserId: z.string().optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  createdAt: z.string(),
});

export type Activity = z.infer<typeof activitySchema>;
