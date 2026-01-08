import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  Course,
  Assignment,
  Note,
  NoteMaterial,
  DashboardMetrics,
  PipelineColumn,
  TimelineGroup,
} from "@shared/schema";
import { useAuth } from "./auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { LeaderboardService } from "@/services/leaderboard-service";
import { GoogleClassroomService } from "@/services/google-classroom";
import { CacheService } from "@/services/cache-service";

// Helper to send email via Gmail API
async function sendGmailNotification(
  toEmail: string,
  subject: string,
  body: string,
  accessToken: string
) {
  const emailLines = [
    `To: ${toEmail}`,
    "Subject: " + subject,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    body,
  ];
  const email = emailLines.join("\r\n");

  // Base64url encoding
  const encodedEmail = btoa(email)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedEmail,
    }),
  });
}

// Helper to sync to Google Calendar Client-Side
async function syncToGoogleCalendar(
  assignments: Assignment[],
  accessToken: string,
  userId: string,
  toast: any
) {
  // 1. Check if sync is enabled
  const settingsRef = doc(db, "users", userId, "settings", "calendar");
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists() || !settingsSnap.data().enabled) {
    console.log("Calendar sync disabled or not configured.");
    return;
  }

  const settings = settingsSnap.data();
  if (!settings.syncAssignments) return;

  console.log("Starting client-side calendar sync...");

  let permissionErrorShown = false;

  // 2. Iterate and Sync
  for (const assignment of assignments) {
    if (!assignment.dueDate) continue;

    // Construct Event Data
    const dueDate = new Date(assignment.dueDate);
    const dateStr = dueDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Default to All Day Event for deadlines
    const eventResource: any = {
      summary: `[Trace] ${assignment.title}`,
      description: `Course: ${assignment.courseName}\n${
        assignment.description || ""
      }\n\nSynced via Trace`,
      start: { date: dateStr },
      end: { date: dateStr }, // GCal single day all-day event: start=end is fine? No, usually end is next day for inclusive.
    };

    // Adjust end date to be next day for all-day event correctness?
    // Actually GCal API: end date is exclusive. So +1 day.
    const nextDay = new Date(dueDate);
    nextDay.setDate(nextDay.getDate() + 1);
    eventResource.end.date = nextDay.toISOString().split("T")[0];

    // 3. Check for existing mapping
    const mapRef = doc(db, "users", userId, "calendarEvents", assignment.id);
    const mapSnap = await getDoc(mapRef);

    const url =
      "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    try {
      let res;
      if (mapSnap.exists()) {
        const { calendarEventId } = mapSnap.data();
        // PATCH
        res = await fetch(`${url}/${calendarEventId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventResource),
        });
      } else {
        // INSERT
        res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventResource),
        });

        if (res.ok) {
          const data = await res.json();
          await setDoc(mapRef, {
            calendarEventId: data.id,
            assignmentId: assignment.id,
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (!res.ok) {
        if (res.status === 403 && !permissionErrorShown) {
          permissionErrorShown = true;
          console.error("Calendar Sync 403: Permission Denied");
          toast({
            variant: "destructive",
            title: "Calendar Permission Needed",
            description:
              "We can't update your Google Calendar because we don't have permission. Please Sign Out and Sign In again to grant access.",
          });
          break; // Stop trying
        }
      }
    } catch (e) {
      console.warn(`Failed to sync assignment ${assignment.id} to calendar`, e);
    }
  }
}

// Google Classroom API types
interface GoogleCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  ownerId?: string;
  enrollmentCode?: string;
  courseState?: string;
  alternateLink?: string;
}

interface GoogleCoursework {
  id: string;
  title: string;
  description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  maxPoints?: number;
  alternateLink?: string;
  state?: string;
  workType?: string;
  creationTime?: string;
  updateTime?: string;
}

interface GoogleStudentSubmission {
  id: string;
  state: string;
  assignedGrade?: number;
  draftGrade?: number;
  courseWorkId: string;
  userId: string;
  creationTime?: string;
  updateTime?: string;
  turnInTime?: string;
  returnedGrade?: number;
}

interface GoogleCoursesResponse {
  courses?: GoogleCourse[];
  nextPageToken?: string;
}

interface GoogleCourseworkResponse {
  courseWork?: GoogleCoursework[];
  nextPageToken?: string;
}

interface GoogleSubmissionsResponse {
  studentSubmissions?: GoogleStudentSubmission[];
  nextPageToken?: string;
}

interface GoogleCourseMaterial {
  id: string;
  title: string;
  description?: string;
  materials?: any[];
  alternateLink?: string;
  updateTime?: string;
}

interface GoogleCourseMaterialResponse {
  courseWorkMaterial?: GoogleCourseMaterial[];
  nextPageToken?: string;
}

interface GoogleTeacherSubmission {
  userId: string;
  state: string;
  late?: boolean;
}

interface GoogleTeacherSubmissionsResponse {
  studentSubmissions?: GoogleTeacherSubmission[];
  nextPageToken?: string;
}

interface GoogleUserProfile {
  id: string;
  name?: {
    fullName?: string;
  };
  photoUrl?: string;
  emailAddress?: string;
}

interface GoogleRosterResponse {
  students?: { profile: GoogleUserProfile; userId: string }[];
  nextPageToken?: string;
}

interface ClassroomContextType {
  courses: Course[];
  assignments: Assignment[];
  notes: Map<string, Note[]>;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  materials: NoteMaterial[];
  reauthRequired: boolean;
  syncClassroom: (isAutoSync?: boolean) => Promise<void>;
  updateAssignmentStatus: (assignmentId: string, userStatus: string) => void;
  addNote: (
    assignmentId: string,
    content: string,
    isImportant?: boolean
  ) => void;
  updateNote: (noteId: string, content: string, isImportant?: boolean) => void;
  deleteNote: (noteId: string, assignmentId: string) => void;
  getPipelineColumns: () => PipelineColumn[];
  getDashboardMetrics: () => DashboardMetrics;
  getTimelineGroups: (filter?: {
    courseId?: string;
    status?: string;
  }) => TimelineGroup[];
  getAssignmentById: (id: string) => Assignment | undefined;
  getNotesForAssignment: (assignmentId: string) => Note[];
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(
  undefined
);

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Helper function to fetch all pages from Google Classroom API
export async function fetchAllPages<T>(
  accessToken: string,
  baseUrl: string,
  extractItems: (response: any) => T[],
  extractNextPageToken: (response: any) => string | undefined
): Promise<T[]> {
  const allItems: T[] = [];
  let pageToken: string | undefined = undefined;

  do {
    // Handle URL construction for pagination
    const separator = baseUrl.includes("?") ? "&" : "?";
    const url = pageToken
      ? `${baseUrl}${separator}pageToken=${pageToken}`
      : baseUrl;

    // console.log(`Fetching: ${url.substring(0, 100)}...`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      let errorDetails: any = {};

      try {
        const errorData = await response.json();
        errorDetails = errorData;
        errorMessage =
          errorData.error?.message || errorData.message || errorMessage;
        console.error("API Error Response:", errorData);
      } catch (e) {
        const text = await response.text().catch(() => "");
        console.error("API Error (non-JSON):", text);
      }

      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    const data = await response.json();
    const items = extractItems(data);
    allItems.push(...items);
    pageToken = extractNextPageToken(data);
  } while (pageToken);

  return allItems;
}

// Ultra-subtle but distinct color palettes with perfectly matching text colors
// Each palette: [background, textColor]
const COLOR_PALETTES: [string, string][] = [
  // Sky Blue - Cool and professional
  ["#E0F2FE", "#0369A1"],

  // Lavender - Creative and calm
  ["#EDE9FE", "#7C3AED"],

  // Rose Pink - Warm and friendly
  ["#FCE7F3", "#BE185D"],

  // Mint Green - Fresh and balanced
  ["#D1FAE5", "#047857"],

  // Peach - Warm and inviting
  ["#FED7AA", "#C2410C"],

  // Aqua Teal - Calm and sophisticated
  ["#CCFBF1", "#0F766E"],

  // Coral - Energetic and bold
  ["#FECACA", "#B91C1C"],

  // Periwinkle - Professional and deep
  ["#DBEAFE", "#1E40AF"],

  // Turquoise - Modern and tech
  ["#A5F3FC", "#0E7490"],

  // Amber Gold - Rich and warm
  ["#FDE68A", "#92400E"],

  // Lime - Vibrant and fresh
  ["#D9F99D", "#4D7C0F"],

  // Orchid - Unique and elegant
  ["#F3E8FF", "#6B21A8"],
];

function generateCourseColor(content: string): string {
  // 1. Clean up and normalize to find the "Base Subject"
  let normalized = content.toLowerCase().trim();

  // Remove common academic suffixes/types regardless of position
  const stopWords = [
    /\blab(oratory)?\b/g,
    /\bpractical\b/g,
    /\btheory\b/g,
    /\btutorial\b/g,
    /\blecture\b/g,
    /\bcourse\b/g,
    /\bsection\b/g,
    /\bmini project\b/g,
    /\sproject\b/g,
    /\s\d+[a-z]?\b/g,
  ];

  for (const pattern of stopWords) {
    normalized = normalized.replace(pattern, "");
  }

  // Remove non-alphanumeric chars (except spaces) to ignore parenthesis, dashes, etc
  normalized = normalized.replace(/[^a-z0-9\s]/g, "").trim();
  // Collapse multiple spaces to single
  normalized = normalized.replace(/\s+/g, " ");

  // If we stripped everything (e.g. course named just "Lab"), revert to original
  if (!normalized) normalized = content.toLowerCase().trim();

  // 2. Generate Hash from the Normalized Base Name
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }

  // 3. Select palette based on hash
  const paletteIndex = Math.abs(hash) % COLOR_PALETTES.length;
  const [bgColor, textColor] = COLOR_PALETTES[paletteIndex];

  // Return just the background color (text color will be retrieved separately)
  return bgColor;
}

// Helper to get the matching text color for a background
function getTextColor(backgroundColor: string): string {
  // Find the matching text color from our palettes
  const palette = COLOR_PALETTES.find(([bg]) => bg === backgroundColor);
  if (palette) {
    return palette[1]; // Return the matching text color
  }

  // Fallback: calculate based on luminance if color not in palette
  const luminance = getRelativeLuminance(backgroundColor);
  return luminance > 0.6 ? "#52525b" : "#FFFFFF";
}

// Helper function to calculate relative luminance for WCAG contrast
function getRelativeLuminance(hex: string): number {
  // Remove # if present
  const color = hex.replace("#", "");

  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

// Fetch courses from Google Classroom API
async function fetchCourses(
  accessToken: string,
  userId: string
): Promise<Course[]> {
  const baseUrl =
    "https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE";

  const googleCourses = await fetchAllPages<GoogleCourse>(
    accessToken,
    baseUrl,
    (data: GoogleCoursesResponse) => data.courses || [],
    (data: GoogleCoursesResponse) => data.nextPageToken
  );

  const now = new Date().toISOString();
  return googleCourses.map((gc) => ({
    id: gc.id,
    userId,
    classroomId: gc.id,
    name: gc.name,
    section: gc.section || null,
    descriptionHeading: gc.descriptionHeading || null,
    room: gc.room || null,
    ownerId: gc.ownerId || null,
    enrollmentCode: gc.enrollmentCode || null,
    courseState: gc.courseState || null,
    alternateLink: gc.alternateLink || null,
    lastSyncedAt: now,
    color: generateCourseColor(gc.name),
  }));
}

// Fetch coursework (assignments) for a course
async function fetchCoursework(
  accessToken: string,
  courseId: string,
  courseName: string,
  userId: string
): Promise<Assignment[]> {
  const baseUrl = `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?courseWorkStates=PUBLISHED`;

  const googleCoursework = await fetchAllPages<GoogleCoursework>(
    accessToken,
    baseUrl,
    (data: GoogleCourseworkResponse) => data.courseWork || [],
    (data: GoogleCourseworkResponse) => data.nextPageToken
  );

  const assignments: Assignment[] = [];

  for (const gc of googleCoursework) {
    // Only process assignments (not materials or other types)
    if (
      gc.workType &&
      gc.workType !== "ASSIGNMENT" &&
      gc.workType !== "MULTIPLE_CHOICE_QUESTION"
    ) {
      continue;
    }

    // Fetch student submissions for this coursework
    let submission: GoogleStudentSubmission | null = null;
    try {
      const submissionUrl = `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${gc.id}/studentSubmissions?userId=me`;
      const submissions = await fetchAllPages<GoogleStudentSubmission>(
        accessToken,
        submissionUrl,
        (data: GoogleSubmissionsResponse) => data.studentSubmissions || [],
        (data: GoogleSubmissionsResponse) => data.nextPageToken
      );
      submission = submissions[0] || null;
    } catch (err) {
      console.warn(`Failed to fetch submissions for coursework ${gc.id}:`, err);
    }

    // Parse due date
    let dueDate: string | null = null;
    let dueTime: string | null = null;
    if (gc.dueDate) {
      const date = new Date(
        gc.dueDate.year,
        gc.dueDate.month - 1,
        gc.dueDate.day,
        gc.dueTime?.hours || 23,
        gc.dueTime?.minutes || 59
      );
      dueDate = date.toISOString();
      if (gc.dueTime) {
        dueTime = `${String(gc.dueTime.hours).padStart(2, "0")}:${String(
          gc.dueTime.minutes
        ).padStart(2, "0")}`;
      }
    }

    // Determine system status
    const now = new Date();
    let systemStatus: Assignment["systemStatus"] = "backlog";

    if (submission) {
      if (
        submission.state === "RETURNED" ||
        submission.returnedGrade !== undefined
      ) {
        systemStatus = "graded";
      } else if (submission.state === "TURNED_IN" || submission.turnInTime) {
        systemStatus = "submitted";
      } else if (submission.state === "CREATED") {
        systemStatus =
          dueDate && new Date(dueDate) < now ? "overdue" : "backlog";
      }
    } else {
      if (dueDate && new Date(dueDate) < now) {
        systemStatus = "overdue";
      } else {
        systemStatus = "backlog";
      }
    }

    const assignment: Assignment = {
      id: `assign-${gc.id}`,
      uniqueId: `${courseId}-${gc.id}`,
      userId,
      courseId,
      courseName,
      classroomId: gc.id,
      title: gc.title,
      description: gc.description || null,
      dueDate,
      dueTime,
      maxPoints: gc.maxPoints || null,
      systemStatus,
      userStatus: null,
      submissionId: submission?.id || null,
      submittedAt: submission?.turnInTime || null,
      gradedAt:
        submission?.updateTime && submission.state === "RETURNED"
          ? submission.updateTime
          : null,
      grade:
        submission?.returnedGrade ??
        submission?.assignedGrade ??
        submission?.draftGrade ??
        null,
      alternateLink: gc.alternateLink || null,
      createdAt: gc.creationTime || now.toISOString(),
      lastSyncedAt: now.toISOString(),
    };

    assignments.push(assignment);
  }

  return assignments;
}

// Fetch course materials (notes/PDFs) for a course
// Fetch course materials (notes/PDFs) for a course
async function fetchCourseMaterials(
  accessToken: string,
  courseId: string,
  courseName: string,
  userId: string,
  onPermissionError?: () => void
): Promise<NoteMaterial[]> {
  const materialsUrl = `https://classroom.googleapis.com/v1/courses/${courseId}/courseWorkMaterials?courseWorkMaterialStates=PUBLISHED`;
  const announcementsUrl = `https://classroom.googleapis.com/v1/courses/${courseId}/announcements?announcementStates=PUBLISHED`;

  try {
    const [googleMaterials, googleAnnouncements] = await Promise.all([
      fetchAllPages<GoogleCourseMaterial>(
        accessToken,
        materialsUrl,
        (data: GoogleCourseMaterialResponse) => data.courseWorkMaterial || [],
        (data: GoogleCourseMaterialResponse) => data.nextPageToken
      ).catch((err) => {
        console.warn(
          `Failed to fetch courseWorkMaterials for ${courseId}:`,
          err
        );
        return [];
      }),
      fetchAllPages<any>(
        accessToken,
        announcementsUrl,
        (data: any) => data.announcements || [],
        (data: any) => data.nextPageToken
      ).catch((err) => {
        if (
          err.message?.includes("insufficient authentication scopes") ||
          err.message?.includes("403")
        ) {
          onPermissionError?.();
        }
        console.warn(`Failed to fetch announcements for ${courseId}:`, err);
        return [];
      }),
    ]);

    const now = new Date().toISOString();

    const mappedMaterials = googleMaterials.map((gm) => ({
      id: `mat-${gm.id}`,
      uniqueId: `${courseId}-${gm.id}`,
      userId,
      courseId,
      courseName,
      title: gm.title,
      description: gm.description || null,
      alternateLink: gm.alternateLink || null,
      materials: gm.materials || null,
      createdAt: gm.updateTime || now,
      lastSyncedAt: now,
    }));

    const mappedAnnouncements = googleAnnouncements
      .filter((a) => a.materials && a.materials.length > 0)
      .map((a) => {
        // Use text as title, truncated
        const text = a.text || "Announcement Material";
        const title =
          text.split("\n")[0].length > 60
            ? text.split("\n")[0].substring(0, 57) + "..."
            : text.split("\n")[0];

        return {
          id: `ann-${a.id}`,
          uniqueId: `${courseId}-ann-${a.id}`,
          userId,
          courseId,
          courseName,
          title: title,
          description: a.text || null,
          alternateLink: a.alternateLink || null,
          materials: a.materials || null,
          createdAt: a.updateTime || now,
          lastSyncedAt: now,
        };
      });

    return [...mappedMaterials, ...mappedAnnouncements];
  } catch (err) {
    console.warn(`Failed to fetch materials for course ${courseId}:`, err);
    return [];
  }
}

function getDemoData(): { courses: Course[]; assignments: Assignment[] } {
  const now = new Date();
  const userId = "demo-user";

  const courses: Course[] = [
    {
      id: "course-1",
      userId,
      classroomId: "gc-1",
      name: "Introduction to Computer Science",
      section: "CS 101",
      descriptionHeading: "Fall 2024",
      room: "Room 204",
      ownerId: "teacher-1",
      enrollmentCode: null,
      courseState: "ACTIVE",
      alternateLink: null,
      lastSyncedAt: now.toISOString(),
      color: generateCourseColor("Introduction to Computer Science"),
    },
    {
      id: "course-2",
      userId,
      classroomId: "gc-2",
      name: "Data Structures & Algorithms",
      section: "CS 201",
      descriptionHeading: "Fall 2024",
      room: "Room 301",
      ownerId: "teacher-2",
      enrollmentCode: null,
      courseState: "ACTIVE",
      alternateLink: null,
      lastSyncedAt: now.toISOString(),
      color: generateCourseColor("Data Structures & Algorithms"),
    },
    {
      id: "course-3",
      userId,
      classroomId: "gc-3",
      name: "Web Development",
      section: "CS 310",
      descriptionHeading: "Fall 2024",
      room: "Lab 102",
      ownerId: "teacher-3",
      enrollmentCode: null,
      courseState: "ACTIVE",
      alternateLink: null,
      lastSyncedAt: now.toISOString(),
      color: generateCourseColor("Web Development"),
    },
    {
      id: "course-4",
      userId,
      classroomId: "gc-4",
      name: "Database Systems",
      section: "CS 350",
      descriptionHeading: "Fall 2024",
      room: "Room 405",
      ownerId: "teacher-4",
      enrollmentCode: null,
      courseState: "ACTIVE",
      alternateLink: null,
      lastSyncedAt: now.toISOString(),
      color: generateCourseColor("Database Systems"),
    },
  ];

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const assignments: Assignment[] = [
    {
      id: "assign-1",
      uniqueId: "course-1-assign-1",
      userId,
      courseId: "course-1",
      courseName: "Introduction to Computer Science",
      classroomId: "gc-assign-1",
      title: "Python Basics Quiz",
      description:
        "Complete the quiz on Python fundamentals including variables, data types, and basic operations.",
      dueDate: addDays(now, 2).toISOString(),
      dueTime: "23:59",
      maxPoints: 100,
      systemStatus: "backlog",
      userStatus: null,
      submissionId: null,
      submittedAt: null,
      gradedAt: null,
      grade: null,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-2",
      uniqueId: "course-1-assign-2",
      userId,
      courseId: "course-1",
      courseName: "Introduction to Computer Science",
      classroomId: "gc-assign-2",
      title: "Control Flow Assignment",
      description:
        "Write programs demonstrating if-else statements, loops, and nested conditions.",
      dueDate: addDays(now, 5).toISOString(),
      dueTime: "23:59",
      maxPoints: 50,
      systemStatus: "backlog",
      userStatus: "in_progress",
      submissionId: null,
      submittedAt: null,
      gradedAt: null,
      grade: null,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-3",
      uniqueId: "course-2-assign-1",
      userId,
      courseId: "course-2",
      courseName: "Data Structures & Algorithms",
      classroomId: "gc-assign-3",
      title: "Linked List Implementation",
      description:
        "Implement a singly linked list with insert, delete, and search operations.",
      dueDate: addDays(now, 1).toISOString(),
      dueTime: "23:59",
      maxPoints: 100,
      systemStatus: "backlog",
      userStatus: "in_progress",
      submissionId: null,
      submittedAt: null,
      gradedAt: null,
      grade: null,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-4",
      uniqueId: "course-2-assign-2",
      userId,
      courseId: "course-2",
      courseName: "Data Structures & Algorithms",
      classroomId: "gc-assign-4",
      title: "Binary Search Tree Project",
      description:
        "Build a BST with traversal methods and balancing capabilities.",
      dueDate: addDays(now, 7).toISOString(),
      dueTime: "23:59",
      maxPoints: 150,
      systemStatus: "backlog",
      userStatus: null,
      submissionId: null,
      submittedAt: null,
      gradedAt: null,
      grade: null,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-5",
      uniqueId: "course-3-assign-1",
      userId,
      courseId: "course-3",
      courseName: "Web Development",
      classroomId: "gc-assign-5",
      title: "HTML/CSS Portfolio",
      description: "Create a personal portfolio website using HTML5 and CSS3.",
      dueDate: addDays(now, -1).toISOString(),
      dueTime: "23:59",
      maxPoints: 100,
      systemStatus: "submitted",
      userStatus: null,
      submissionId: "sub-1",
      submittedAt: addDays(now, -2).toISOString(),
      gradedAt: null,
      grade: null,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-6",
      uniqueId: "course-3-assign-2",
      userId,
      courseId: "course-3",
      courseName: "Web Development",
      classroomId: "gc-assign-6",
      title: "JavaScript Fundamentals",
      description: "Complete exercises on DOM manipulation and event handling.",
      dueDate: addDays(now, 3).toISOString(),
      dueTime: "23:59",
      maxPoints: 75,
      systemStatus: "backlog",
      userStatus: null,
      submissionId: null,
      submittedAt: null,
      gradedAt: null,
      grade: null,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-7",
      uniqueId: "course-4-assign-1",
      userId,
      courseId: "course-4",
      courseName: "Database Systems",
      classroomId: "gc-assign-7",
      title: "SQL Queries Assignment",
      description:
        "Write complex SQL queries involving joins, subqueries, and aggregations.",
      dueDate: addDays(now, -3).toISOString(),
      dueTime: "23:59",
      maxPoints: 100,
      systemStatus: "graded",
      userStatus: null,
      submissionId: "sub-2",
      submittedAt: addDays(now, -4).toISOString(),
      gradedAt: addDays(now, -1).toISOString(),
      grade: 92,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-8",
      uniqueId: "course-4-assign-2",
      userId,
      courseId: "course-4",
      courseName: "Database Systems",
      classroomId: "gc-assign-8",
      title: "ER Diagram Design",
      description:
        "Design an entity-relationship diagram for a library management system.",
      dueDate: addDays(now, -2).toISOString(),
      dueTime: "23:59",
      maxPoints: 50,
      systemStatus: "overdue",
      userStatus: null,
      submissionId: null,
      submittedAt: null,
      gradedAt: null,
      grade: null,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-9",
      uniqueId: "course-1-assign-3",
      userId,
      courseId: "course-1",
      courseName: "Introduction to Computer Science",
      classroomId: "gc-assign-9",
      title: "Functions & Modules",
      description: "Create reusable functions and organize code into modules.",
      dueDate: addDays(now, 4).toISOString(),
      dueTime: "23:59",
      maxPoints: 75,
      systemStatus: "backlog",
      userStatus: null,
      submissionId: null,
      submittedAt: null,
      gradedAt: null,
      grade: null,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
    {
      id: "assign-10",
      uniqueId: "course-2-assign-3",
      userId,
      courseId: "course-2",
      courseName: "Data Structures & Algorithms",
      classroomId: "gc-assign-10",
      title: "Algorithm Analysis Quiz",
      description: "Quiz on Big O notation and algorithm complexity analysis.",
      dueDate: addDays(now, -5).toISOString(),
      dueTime: "23:59",
      maxPoints: 50,
      systemStatus: "graded",
      userStatus: null,
      submissionId: "sub-3",
      submittedAt: addDays(now, -6).toISOString(),
      gradedAt: addDays(now, -3).toISOString(),
      grade: 88,
      alternateLink: null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    },
  ];

  return { courses, assignments };
}

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const {
    user,
    role,
    accessToken,
    refreshAccessToken,
    loading: authLoading,
  } = useAuth();
  const { toast } = useToast();

  // State with Cache-First Initialization
  const [courses, setCourses] = useState<Course[]>(() => {
    if (!user) return [];
    const cached = CacheService.get<Course[]>(`courses_${user.uid}`);
    if (cached) return cached;
    const saved = localStorage.getItem("classroom_courses");
    return saved ? JSON.parse(saved) : [];
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    if (!user) return [];
    // Key by user to avoid leaking
    // We don't have a single key for all assignments in cache service usually,
    // but the service sets `assignments_${courseId}`.
    // We can try to reconstruct or just use legacy for initial load
    // to avoid complex cache aggregation here.
    const saved = localStorage.getItem("classroom_assignments");
    return saved ? JSON.parse(saved) : [];
  });

  const [materials, setMaterials] = useState<NoteMaterial[]>(() => {
    const saved = localStorage.getItem("classroom_materials");
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState<Map<string, Note[]>>(() => {
    const saved = localStorage.getItem("classroom_notes");
    return saved ? new Map(JSON.parse(saved)) : new Map();
  });

  // Loading States
  const [isLoading, setIsLoading] = useState(() => {
    // If we have data, we are not "loading" in a blocking sense
    if (user && CacheService.get(`courses_${user.uid}`)) return false;
    return !localStorage.getItem("classroom_courses");
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    const saved = localStorage.getItem("classroom_lastSyncedAt");
    return saved ? new Date(saved) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const [reauthRequired, setReauthRequired] = useState(false);

  // Clear data on logout
  useEffect(() => {
    if (!authLoading && !user) {
      setCourses([]);
      setAssignments([]);
      setMaterials([]);
      setNotes(new Map());
      setLastSyncedAt(null);
      setHasAutoSynced(false);
      CacheService.clearAll();
      localStorage.removeItem("classroom_courses");
      localStorage.removeItem("classroom_assignments");
      localStorage.removeItem("classroom_materials");
      localStorage.removeItem("classroom_notes");
      localStorage.removeItem("classroom_lastSyncedAt");
    }
  }, [authLoading, user]);

  const syncClassroom = useCallback(
    async (isAutoSync = false) => {
      if (!user) return;

      let token = accessToken;
      if (!token) {
        try {
          const success = await refreshAccessToken();
          if (success) token = localStorage.getItem("google_access_token");
        } catch (e) {
          console.error(e);
        }
      }

      if (!token) {
        setError("Session expired. Please sign in again.");
        return;
      }

      setIsSyncing(true);
      setError(null);

      // Clear assignment caches to force fresh data
      if (!isAutoSync) {
        // Only clear on manual sync to avoid excessive API calls
        CacheService.clearPattern("assignments_");
      }

      try {
        // P0: Fetch Courses (Critical)
        let fetchedCourses;
        try {
          fetchedCourses = await GoogleClassroomService.fetchCourses(
            token,
            user.uid
          );
        } catch (err: any) {
          if (err.message && err.message.includes("401")) {
            console.log("Sync 401. Session expired.");
            setError(
              "Your session has expired. Please sign out and sign in again."
            );
            toast({
              variant: "destructive",
              title: "Session Expired",
              description: "Please sign out and sign in again to continue.",
            });
            throw new Error("Session expired");
          } else {
            throw err;
          }
        }

        // Update state immediately if changed
        setCourses((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(fetchedCourses)) {
            return fetchedCourses;
          }
          return prev;
        });

        // P1: Fetch Assignments Parallel (Important)
        const fetchedAssignments =
          await GoogleClassroomService.fetchAssignmentsParallel(
            token,
            fetchedCourses
          );

        setAssignments(fetchedAssignments);
        setLastSyncedAt(new Date());

        // P2: Background Tasks (Materials, Calendar, Submissions detail if we add it)
        // We run this without awaiting to unblock UI?
        // No, in React context, we just let the state update trigger re-renders.
        // But we want `isSyncing` to go false quickly?
        // User says "P2 ... Load After UI Renders".

        // We can finish the "Sync" visible state here, or keep it true until background finishes?
        // "Make Trace feel 2-3x faster" -> Finish quick.

        // Fetch materials in background
        Promise.all(
          fetchedCourses.map((c) =>
            fetchCourseMaterials(token!, c.classroomId, c.name, user.uid, () =>
              setReauthRequired(true)
            )
          )
        ).then((results) => {
          const allMats = results.flat();
          setMaterials(allMats);
        });

        // Sync to Calendar in background
        syncToGoogleCalendar(fetchedAssignments, token, user.uid, toast).catch(
          (e) => console.warn(e)
        );

        // Auto-sync leaderboard
        LeaderboardService.autoSyncOnLogin(
          user.uid,
          user.email || "",
          user.displayName || "Anonymous",
          user.photoURL || "",
          fetchedAssignments,
          fetchedCourses,
          role
        ).catch(console.warn);
      } catch (err: any) {
        console.error("Sync Error", err);
        setError(err.message || "Failed to sync");
        if (!isAutoSync) {
          toast({
            variant: "destructive",
            title: "Sync Failed",
            description: err.message,
          });
        }
      } finally {
        setIsSyncing(false);
        setIsLoading(false);
      }
    },
    [user, role, accessToken, refreshAccessToken, toast]
  );

  // Auto-sync logic
  useEffect(() => {
    if (authLoading || !user || !accessToken) return;
    if (!hasAutoSynced && !isSyncing) {
      setHasAutoSynced(true);
      syncClassroom(true);
    }
  }, [user, accessToken, hasAutoSynced, isSyncing, syncClassroom]);

  // Periodic auto-sync every 10 minutes to detect submission changes
  useEffect(() => {
    if (!user || !accessToken) return;

    const intervalId = setInterval(() => {
      console.log("Running periodic sync to check for submission updates...");
      syncClassroom(true); // Auto-sync silently
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(intervalId);
  }, [user, accessToken, syncClassroom]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem("classroom_courses", JSON.stringify(courses));
  }, [courses]);
  useEffect(() => {
    localStorage.setItem("classroom_materials", JSON.stringify(materials));
  }, [materials]);
  useEffect(() => {
    localStorage.setItem(
      "classroom_notes",
      JSON.stringify(Array.from(notes.entries()))
    );
  }, [notes]);
  useEffect(() => {
    localStorage.setItem("classroom_assignments", JSON.stringify(assignments));
  }, [assignments]);
  useEffect(() => {
    if (lastSyncedAt)
      localStorage.setItem(
        "classroom_lastSyncedAt",
        lastSyncedAt.toISOString()
      );
  }, [lastSyncedAt]);

  const updateAssignmentStatus = useCallback(
    (assignmentId: string, userStatus: string) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, userStatus: userStatus as any } : a
        )
      );
    },
    []
  );

  const addNote = useCallback(
    (assignmentId: string, content: string, isImportant = false) => {
      const newNote: Note = {
        id: generateId(),
        userId: user?.uid || "",
        assignmentId,
        content,
        isImportant,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(assignmentId) || [];
        newMap.set(assignmentId, [...existing, newNote]);
        return newMap;
      });
    },
    [user]
  );

  const updateNote = useCallback(
    (noteId: string, content: string, isImportant?: boolean) => {
      setNotes((prev) => {
        const newMap = new Map(prev);
        for (const [assignmentId, noteList] of Array.from(newMap.entries())) {
          const idx = noteList.findIndex((n: Note) => n.id === noteId);
          if (idx !== -1) {
            const updated = [...noteList];
            updated[idx] = {
              ...updated[idx],
              content,
              isImportant: isImportant ?? updated[idx].isImportant,
              updatedAt: new Date().toISOString(),
            };
            newMap.set(assignmentId, updated);
            break;
          }
        }
        return newMap;
      });
    },
    []
  );

  const deleteNote = useCallback((noteId: string, assignmentId: string) => {
    setNotes((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(assignmentId) || [];
      newMap.set(
        assignmentId,
        existing.filter((n) => n.id !== noteId)
      );
      return newMap;
    });
  }, []);

  const getPipelineColumns = useCallback((): PipelineColumn[] => {
    const columns: PipelineColumn[] = [
      { id: "backlog", title: "Backlog", assignments: [] },
      { id: "in_progress", title: "In Progress", assignments: [] },
      { id: "submitted", title: "Submitted", assignments: [] },
      { id: "graded", title: "Graded", assignments: [] },
      { id: "overdue", title: "Overdue", assignments: [] },
    ];

    assignments.forEach((assignment) => {
      let status = assignment.systemStatus;
      if (
        assignment.userStatus === "in_progress" &&
        status !== "submitted" &&
        status !== "graded"
      ) {
        status = "in_progress";
      }
      const column = columns.find((c) => c.id === status);
      if (column) column.assignments.push(assignment);
    });

    columns.forEach((col) => {
      col.assignments.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    });
    return columns;
  }, [assignments]);

  const getDashboardMetrics = useCallback((): DashboardMetrics => {
    // Reuse existing logic, simplified
    const now = new Date();
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const activeAssignments = assignments.filter(
      (a) => a.systemStatus !== "graded" && a.systemStatus !== "submitted"
    );
    const upcoming3Days = assignments.filter((a) => {
      if (
        !a.dueDate ||
        a.systemStatus === "graded" ||
        a.systemStatus === "submitted"
      )
        return false;
      const due = new Date(a.dueDate);
      return due >= now && due <= in3Days;
    });
    const upcoming7Days = assignments.filter((a) => {
      if (
        !a.dueDate ||
        a.systemStatus === "graded" ||
        a.systemStatus === "submitted"
      )
        return false;
      const due = new Date(a.dueDate);
      return due >= now && due <= in7Days;
    });
    const overdue = assignments.filter((a) => a.systemStatus === "overdue");

    const weeklyWorkload: DashboardMetrics["weeklyWorkload"] = [];
    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const count = assignments.filter(
        (a) => a.dueDate && a.dueDate.startsWith(dateStr)
      ).length;
      weeklyWorkload.push({
        day: dayNames[date.getDay()],
        count,
        isToday: i === 0,
      });
    }

    const nextActions = [...activeAssignments]
      .filter((a) => a.dueDate)
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )
      .slice(0, 5);

    return {
      totalActive: activeAssignments.length,
      upcoming3Days: upcoming3Days.length,
      upcoming7Days: upcoming7Days.length,
      overdue: overdue.length,
      weeklyWorkload,
      nextActions,
    };
  }, [assignments]);

  const getTimelineGroups = useCallback(
    (filter?: { courseId?: string; status?: string }): TimelineGroup[] => {
      let filtered = [...assignments];
      if (filter?.courseId)
        filtered = filtered.filter((a) => a.courseId === filter.courseId);
      if (filter?.status)
        filtered = filtered.filter((a) => a.systemStatus === filter.status);

      filtered.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      const groups: Map<string, TimelineGroup> = new Map();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      filtered.forEach((assignment) => {
        if (!assignment.dueDate) return;
        const dateKey = assignment.dueDate.split("T")[0];
        const dueDate = new Date(assignment.dueDate);
        let dateLabel =
          dateKey === today.toISOString().split("T")[0]
            ? "Today"
            : dateKey === tomorrow.toISOString().split("T")[0]
            ? "Tomorrow"
            : dueDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              });

        if (!groups.has(dateKey))
          groups.set(dateKey, { date: dateKey, dateLabel, assignments: [] });
        groups.get(dateKey)!.assignments.push(assignment);
      });
      return Array.from(groups.values());
    },
    [assignments]
  );

  const getAssignmentById = useCallback(
    (id: string) => assignments.find((a) => a.id === id),
    [assignments]
  );
  const getNotesForAssignment = useCallback(
    (assignmentId: string) => notes.get(assignmentId) || [],
    [notes]
  );

  return (
    <ClassroomContext.Provider
      value={{
        courses,
        assignments,
        notes,
        isLoading,
        isSyncing,
        lastSyncedAt,
        error,
        syncClassroom,
        updateAssignmentStatus,
        addNote,
        updateNote,
        deleteNote,
        getPipelineColumns,
        getDashboardMetrics,
        getTimelineGroups,
        getAssignmentById,
        getNotesForAssignment,
        materials,
        reauthRequired,
      }}
    >
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const context = useContext(ClassroomContext);
  if (context === undefined) {
    throw new Error("useClassroom must be used within a ClassroomProvider");
  }
  return context;
}

// Export helper function for determining text color based on background
export { getTextColor };
