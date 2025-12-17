import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Course,
  Assignment,
  Note,
  DashboardMetrics,
  PipelineColumn,
  TimelineGroup,
} from "@shared/schema";
import { useAuth } from "./auth-context";

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

interface ClassroomContextType {
  courses: Course[];
  assignments: Assignment[];
  notes: Map<string, Note[]>;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  syncClassroom: () => Promise<void>;
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
async function fetchAllPages<T>(
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
    id: `course-${gc.id}`,
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

  const now = new Date().toISOString();
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
      courseId: `course-${courseId}`,
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
      grade: submission?.returnedGrade || submission?.assignedGrade || null,
      alternateLink: gc.alternateLink || null,
      createdAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
    };

    assignments.push(assignment);
  }

  return assignments;
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
  const { user, accessToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notes, setNotes] = useState<Map<string, Note[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncClassroom = useCallback(async () => {
    if (!user) {
      setError("Please sign in with Google to sync your Classroom data");
      return;
    }

    // Try to get a fresh access token if not available
    let token = accessToken;
    if (!token) {
      // Access token might have expired, try to get a fresh one
      try {
        // Get the ID token which we can use to verify auth
        const idToken = await user.getIdToken();
        console.log(
          "Got ID token, but need OAuth access token for Classroom API"
        );
        setError(
          "Access token expired. Please sign out and sign in again to refresh your token."
        );
        return;
      } catch (err) {
        setError("Unable to authenticate. Please sign in again.");
        return;
      }
    }

    setIsSyncing(true);
    setError(null);

    try {
      console.log("Starting sync...", { userId: user.uid, hasToken: !!token });

      // Fetch courses
      const fetchedCourses = await fetchCourses(token, user.uid);
      console.log(`Fetched ${fetchedCourses.length} courses`);

      if (fetchedCourses.length === 0) {
        setError(
          "No active courses found. Make sure you're enrolled in at least one Google Classroom course."
        );
        setCourses([]);
        setAssignments([]);
        return;
      }

      // Fetch assignments for each course
      const allAssignments: Assignment[] = [];
      for (const course of fetchedCourses) {
        try {
          console.log(`Fetching assignments for course: ${course.name}`);
          const courseAssignments = await fetchCoursework(
            token,
            course.classroomId,
            course.name,
            user.uid
          );
          console.log(
            `Found ${courseAssignments.length} assignments for ${course.name}`
          );
          allAssignments.push(...courseAssignments);
        } catch (err) {
          console.warn(
            `Failed to fetch assignments for course ${course.name}:`,
            err
          );
          // Continue with other courses even if one fails
        }
      }

      console.log(
        `Sync complete: ${fetchedCourses.length} courses, ${allAssignments.length} assignments`
      );
      setCourses(fetchedCourses);
      setAssignments(allAssignments);
      setLastSyncedAt(new Date());
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
        errorMessage = "Network error. Please check your internet connection.";
      }

      setError(errorMessage);
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [user, accessToken]);

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
