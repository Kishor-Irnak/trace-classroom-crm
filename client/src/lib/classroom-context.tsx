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
      }\n\nSynced via Student Sphere`,
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

    console.log(`Fetching: ${url.substring(0, 100)}...`);

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

const COURSE_COLORS = [
  "#FFADAD", // Pastel Red
  "#FFD6A5", // Pastel Orange
  "#FDFFB6", // Pastel Yellow
  "#CAFFBF", // Pastel Green
  "#9BF6FF", // Pastel Cyan
  "#A0C4FF", // Pastel Blue
  "#BDB2FF", // Pastel Purple
  "#FFC6FF", // Pastel Pink
  "#E0F7FA", // Cyan 50
  "#F3E5F5", // Purple 50
  "#E8F5E9", // Green 50
  "#FFF3E0", // Orange 50
];

function generateCourseColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  return COURSE_COLORS[index];
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
    color: generateCourseColor(gc.id),
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
async function fetchCourseMaterials(
  accessToken: string,
  courseId: string,
  courseName: string,
  userId: string
): Promise<NoteMaterial[]> {
  const baseUrl = `https://classroom.googleapis.com/v1/courses/${courseId}/courseWorkMaterials?courseWorkMaterialStates=PUBLISHED`;

  try {
    const googleMaterials = await fetchAllPages<GoogleCourseMaterial>(
      accessToken,
      baseUrl,
      (data: GoogleCourseMaterialResponse) => data.courseWorkMaterial || [],
      (data: GoogleCourseMaterialResponse) => data.nextPageToken
    );

    const now = new Date().toISOString();
    return googleMaterials.map((gm) => ({
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
      color: generateCourseColor("gc-1"),
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
      color: generateCourseColor("gc-2"),
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
      color: generateCourseColor("gc-3"),
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
      color: generateCourseColor("gc-4"),
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
  const { user, accessToken, refreshAccessToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = sessionStorage.getItem("classroom_courses");
    return saved ? JSON.parse(saved) : [];
  });
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = sessionStorage.getItem("classroom_assignments");
    return saved ? JSON.parse(saved) : [];
  });
  const [materials, setMaterials] = useState<NoteMaterial[]>(() => {
    const saved = sessionStorage.getItem("classroom_materials");
    return saved ? JSON.parse(saved) : [];
  });
  const [notes, setNotes] = useState<Map<string, Note[]>>(() => {
    const saved = sessionStorage.getItem("classroom_notes");
    return saved ? new Map(JSON.parse(saved)) : new Map();
  });
  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached data, start with loading false
    return !sessionStorage.getItem("classroom_courses");
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    const saved = sessionStorage.getItem("classroom_lastSyncedAt");
    return saved ? new Date(saved) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const { toast } = useToast();

  const syncClassroom = useCallback(
    async (isAutoSync = false) => {
      if (!user) {
        setError("Please sign in with Google to sync your Classroom data");
        setIsLoading(false);
        return;
      }

      // Try to get a fresh access token if not available
      let token = accessToken;
      if (!token) {
        // Access token might have expired or been cleared, try to refresh it
        console.log("No access token found, attempting to refresh...");

        try {
          const refreshed = await refreshAccessToken();

          if (refreshed) {
            // Get the newly refreshed token
            // Note: We need to wait a moment for the state to update
            await new Promise((resolve) => setTimeout(resolve, 500));
            const newToken = sessionStorage.getItem("google_access_token");

            if (newToken) {
              token = newToken;
              console.log("Successfully refreshed access token");
            } else {
              throw new Error("Token refresh succeeded but token not found");
            }
          } else {
            throw new Error("Token refresh failed");
          }
        } catch (err) {
          console.error("Failed to refresh token:", err);
          setError(
            "Your session has expired. Please click below to sign in again and refresh your access."
          );
          setIsLoading(false);
          return;
        }
      }

      setIsSyncing(true);
      // Only show full-screen loader if we have no data yet
      if (assignments.length === 0) {
        setIsLoading(true);
      }
      setError(null);

      try {
        console.log("Starting sync...", {
          userId: user.uid,
          hasToken: !!token,
        });

        // Fetch courses
        const fetchedCourses = await fetchCourses(token, user.uid);
        console.log(`Fetched ${fetchedCourses.length} courses`);

        if (fetchedCourses.length === 0) {
          setError(
            "No active courses found. Make sure you're enrolled in at least one Google Classroom course."
          );
          setCourses([]);
          setAssignments([]);
          setLastSyncedAt(new Date());
          setIsSyncing(false);
          setIsLoading(false);
          return;
        }

        // Fetch assignments and materials for each course
        const allAssignments: Assignment[] = [];
        const allMaterials: NoteMaterial[] = [];
        for (const course of fetchedCourses) {
          try {
            console.log(`Fetching data for course: ${course.name}`);
            const [courseAssignments, courseMaterials] = await Promise.all([
              fetchCoursework(token, course.classroomId, course.name, user.uid),
              fetchCourseMaterials(
                token,
                course.classroomId,
                course.name,
                user.uid
              ),
            ]);
            console.log(
              `Found ${courseAssignments.length} assignments and ${courseMaterials.length} materials for ${course.name}`
            );
            allAssignments.push(...courseAssignments);
            allMaterials.push(...courseMaterials);
          } catch (err) {
            console.warn(
              `Failed to fetch data for course ${course.name}:`,
              err
            );
            // Continue with other courses even if one fails
          }
        }

        console.log(
          `Sync complete: ${fetchedCourses.length} courses, ${allAssignments.length} assignments, ${allMaterials.length} materials`
        );
        setCourses(fetchedCourses);
        setAssignments(allAssignments);
        setMaterials(allMaterials);
        setLastSyncedAt(new Date());

        // Stop blocking loading screen here so user can interact with the app
        // while Calendar sync happens in background
        setIsLoading(false);

        // Client-side Google Calendar Sync
        try {
          await syncToGoogleCalendar(allAssignments, token, user.uid, toast);
        } catch (calErr) {
          console.error("Calendar sync failed:", calErr);
        }

        // Notification Logic (Gmail)
        try {
          const notifSettingsRef = doc(
            db,
            "users",
            user.uid,
            "settings",
            "notifications"
          );
          const notifSettingsSnap = await getDoc(notifSettingsRef);

          if (notifSettingsSnap.exists() && notifSettingsSnap.data().enabled) {
            const settings = notifSettingsSnap.data();

            if (settings.notifyDueSoon) {
              const digestRef = doc(
                db,
                "users",
                user.uid,
                "notifications",
                "digest"
              );
              const digestSnap = await getDoc(digestRef);

              // Check if we already sent a digest today
              const lastSent = digestSnap.exists()
                ? digestSnap.data().lastSent?.toDate()
                : null;
              const today = new Date();
              const isSameDay =
                lastSent &&
                lastSent.getDate() === today.getDate() &&
                lastSent.getMonth() === today.getMonth() &&
                lastSent.getFullYear() === today.getFullYear();

              if (!isSameDay) {
                // Calculate assignments due in the next 24 hours
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(23, 59, 59, 999);

                const upcoming = allAssignments.filter((a) => {
                  if (
                    !a.dueDate ||
                    a.systemStatus === "submitted" ||
                    a.systemStatus === "graded"
                  )
                    return false;
                  const due = new Date(a.dueDate);
                  return due >= today && due <= tomorrow;
                });

                if (upcoming.length > 0 && user.email) {
                  const listItems = upcoming
                    .map(
                      (a) =>
                        `<li><strong>${
                          a.title
                        }</strong> <span style="color:#666">(${
                          a.courseName
                        })</span><br>Due: ${new Date(
                          a.dueDate!
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}</li>`
                    )
                    .join("");

                  const emailBody = `
                         <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                           <h2 style="color: #2563eb;">Daily Digest</h2>
                           <p>You have <strong>${upcoming.length} assignments</strong> coming up in the next 24 hours:</p>
                           <ul style="line-height: 1.6;">${listItems}</ul>
                           <a href="http://localhost:3000" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Open Student Sphere</a>
                         </div>
                       `;

                  await sendGmailNotification(
                    user.email,
                    `Student Sphere: ${upcoming.length} Tasks Due Soon`,
                    emailBody,
                    token
                  );
                  await setDoc(digestRef, { lastSent: serverTimestamp() });
                  console.log("Daily digest email delivered.");
                }
              }
            }
          }
        } catch (notifErr) {
          console.warn("Notification sync failed (non-critical):", notifErr);
        }

        if (!isAutoSync) {
          toast({
            title: "Sync Complete",
            description: `Successfully synced ${fetchedCourses.length} courses, ${allAssignments.length} assignments, and updated Google Calendar.`,
          });
        }
      } catch (err: any) {
        console.error("Sync error details:", err);
        let errorMessage = "Failed to sync";

        if (err?.message) {
          const errMsg = err.message.toLowerCase();
          if (
            errMsg.includes("401") ||
            errMsg.includes("unauthorized") ||
            errMsg.includes("invalid_token") ||
            errMsg.includes("token expired")
          ) {
            errorMessage =
              "Authentication failed. Your access token may have expired. Please sign out and sign in again.";
          } else if (
            errMsg.includes("403") ||
            errMsg.includes("forbidden") ||
            errMsg.includes("permission denied")
          ) {
            errorMessage =
              "Permission denied. Please make sure you granted Classroom access permissions when signing in. Sign out and sign in again, then grant all requested permissions.";
          } else if (
            errMsg.includes("quota") ||
            errMsg.includes("rate") ||
            errMsg.includes("429")
          ) {
            errorMessage = "API quota exceeded. Please try again later.";
          } else if (errMsg.includes("cors") || errMsg.includes("network")) {
            errorMessage =
              "Network error. Please check your internet connection and try again.";
          } else {
            errorMessage = `Sync failed: ${err.message}`;
          }
        } else if (err instanceof TypeError && err.message.includes("fetch")) {
          errorMessage =
            "Network error. Please check your internet connection.";
        }

        setError(errorMessage);
        console.error("Sync error:", err);

        if (!isAutoSync) {
          toast({
            variant: "destructive",
            title: "Sync Failed",
            description: errorMessage,
          });
        }
      } finally {
        setIsSyncing(false);
        setIsLoading(false);
      }
    },
    [user, accessToken, refreshAccessToken, toast]
  );

  // Auto-sync on first login if no data exists
  useEffect(() => {
    if (!user) {
      setHasAutoSynced(false);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    if (!hasAutoSynced && !isSyncing) {
      setHasAutoSynced(true);
      // Call syncClassroom directly without including it in dependencies
      syncClassroom(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    accessToken,
    hasAutoSynced,
    courses.length,
    assignments.length,
    isSyncing,
  ]);

  // Persistence Effects
  useEffect(() => {
    sessionStorage.setItem("classroom_courses", JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    sessionStorage.setItem("classroom_materials", JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    sessionStorage.setItem(
      "classroom_notes",
      JSON.stringify(Array.from(notes.entries()))
    );
  }, [notes]);

  useEffect(() => {
    sessionStorage.setItem(
      "classroom_assignments",
      JSON.stringify(assignments)
    );
  }, [assignments]);

  useEffect(() => {
    if (lastSyncedAt) {
      sessionStorage.setItem(
        "classroom_lastSyncedAt",
        lastSyncedAt.toISOString()
      );
    } else {
      sessionStorage.removeItem("classroom_lastSyncedAt");
    }
  }, [lastSyncedAt]);

  const updateAssignmentStatus = useCallback(
    (assignmentId: string, userStatus: string) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? { ...a, userStatus: userStatus as Assignment["userStatus"] }
            : a
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
          const noteIndex = noteList.findIndex((n: Note) => n.id === noteId);
          if (noteIndex !== -1) {
            const updated = [...noteList];
            updated[noteIndex] = {
              ...updated[noteIndex],
              content,
              isImportant: isImportant ?? updated[noteIndex].isImportant,
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
      const status =
        assignment.userStatus === "in_progress"
          ? "in_progress"
          : assignment.systemStatus;
      const column = columns.find((c) => c.id === status);
      if (column) {
        column.assignments.push(assignment);
      }
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

      const count = assignments.filter((a) => {
        if (!a.dueDate) return false;
        return a.dueDate.split("T")[0] === dateStr;
      }).length;

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

      if (filter?.courseId) {
        filtered = filtered.filter((a) => a.courseId === filter.courseId);
      }
      if (filter?.status) {
        filtered = filtered.filter((a) => a.systemStatus === filter.status);
      }

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

        let dateLabel: string;
        if (dateKey === today.toISOString().split("T")[0]) {
          dateLabel = "Today";
        } else if (dateKey === tomorrow.toISOString().split("T")[0]) {
          dateLabel = "Tomorrow";
        } else {
          dateLabel = dueDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
        }

        if (!groups.has(dateKey)) {
          groups.set(dateKey, {
            date: dateKey,
            dateLabel,
            assignments: [],
          });
        }
        groups.get(dateKey)!.assignments.push(assignment);
      });

      return Array.from(groups.values());
    },
    [assignments]
  );

  const getAssignmentById = useCallback(
    (id: string) => {
      return assignments.find((a) => a.id === id);
    },
    [assignments]
  );

  const getNotesForAssignment = useCallback(
    (assignmentId: string) => {
      return notes.get(assignmentId) || [];
    },
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
