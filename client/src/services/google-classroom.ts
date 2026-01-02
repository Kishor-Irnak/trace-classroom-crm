import { Course, Assignment } from "@shared/schema";
import { CacheService } from "./cache-service";

interface GoogleStudentSubmission {
  id: string;
  courseWorkId: string;
  state:
    | "CREATED"
    | "NEW"
    | "reclaimed_by_student"
    | "TURNED_IN"
    | "RETURNED"
    | "SUBMITTED";
  assignedGrade?: number;
  alternateLink?: string;
  turnInTime?: string;
  updateTime?: string;
  late?: boolean;
}

export const GoogleClassroomService = {
  async fetchCourses(accessToken: string, userId: string): Promise<Course[]> {
    const cached = CacheService.get<Course[]>(`courses_${userId}`);
    if (cached) return cached;

    const baseUrl =
      "https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE&fields=courses(id,name,section,descriptionHeading,room,ownerId,enrollmentCode,courseState,alternateLink)";

    let courses: any[] = [];
    let pageToken = "";

    try {
      do {
        const url = `${baseUrl}${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data = await res.json();
        if (data.courses) courses = courses.concat(data.courses);
        pageToken = data.nextPageToken;
      } while (pageToken);
    } catch (e) {
      console.warn("Fetch courses error", e);
      return []; // Return empty if failed (or fallback to cache if we had one?)
    }

    const mapped: Course[] = courses.map((c) => ({
      id: c.id,
      userId,
      classroomId: c.id,
      name: c.name,
      section: c.section || null,
      descriptionHeading: c.descriptionHeading || null,
      room: c.room || null,
      ownerId: c.ownerId || null,
      enrollmentCode: c.enrollmentCode || null,
      courseState: c.courseState || "ACTIVE",
      alternateLink: c.alternateLink || null,
      lastSyncedAt: new Date().toISOString(),
      color: generateCourseColor(c.id),
    }));

    CacheService.set(`courses_${userId}`, mapped, 60 * 60 * 24);
    return mapped;
  },

  async fetchAssignmentsParallel(
    accessToken: string,
    courses: Course[]
  ): Promise<Assignment[]> {
    const allAssignments: Assignment[] = [];

    const results = await Promise.allSettled(
      courses.map(async (course) => {
        const cacheKey = `assignments_${course.id}`;
        const cached = CacheService.get<Assignment[]>(cacheKey);
        if (cached) return cached;

        // Fetch CourseWork AND Submissions in parallel for this course
        // URL: courseWork/-/studentSubmissions gets ALL submissions for the course
        const courseworkUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?courseWorkStates=PUBLISHED&fields=courseWork(id,title,description,dueDate,dueTime,maxPoints,alternateLink,workType,creationTime,updateTime)`;
        const submissionsUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/-/studentSubmissions?userId=me&fields=studentSubmissions(id,courseWorkId,state,assignedGrade,turnInTime,updateTime,late)`;

        const [cwRes, subRes] = await Promise.all([
          fetch(courseworkUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((r) => (r.ok ? r.json() : { courseWork: [] })),
          fetch(submissionsUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((r) => (r.ok ? r.json() : { studentSubmissions: [] })),
        ]);

        const work = cwRes.courseWork || [];
        const submissions: GoogleStudentSubmission[] =
          subRes.studentSubmissions || [];

        const mapped: Assignment[] = work
          .filter(
            (w: any) =>
              !w.workType ||
              w.workType === "ASSIGNMENT" ||
              w.workType === "MULTIPLE_CHOICE_QUESTION"
          )
          .map((w: any) => {
            const sub = submissions.find((s) => s.courseWorkId === w.id);
            return mapToAssignment(w, course, sub);
          });

        CacheService.set(cacheKey, mapped, 60 * 60);
        return mapped;
      })
    );

    results.forEach((r) => {
      if (r.status === "fulfilled") {
        allAssignments.push(...r.value);
      }
    });

    return allAssignments;
  },
};

const COURSE_COLORS = [
  "#FFADAD",
  "#FFD6A5",
  "#FDFFB6",
  "#CAFFBF",
  "#9BF6FF",
  "#A0C4FF",
  "#BDB2FF",
  "#FFC6FF",
  "#E0F7FA",
  "#F3E5F5",
  "#E8F5E9",
  "#FFF3E0",
];

function generateCourseColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  return COURSE_COLORS[index];
}

function mapToAssignment(
  gc: any,
  course: Course,
  submission?: GoogleStudentSubmission
): Assignment {
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

  const now = new Date();

  // Status Logic
  let userStatus = "backlog";
  let systemStatus = "backlog";
  let grade = null;
  let submittedAt = null;
  let gradedAt = null;

  if (submission) {
    if (submission.state === "TURNED_IN") {
      userStatus = "submitted";
      systemStatus = "submitted";
      submittedAt = submission.turnInTime || submission.updateTime;
    } else if (submission.state === "RETURNED") {
      userStatus = "graded";
      systemStatus = "graded";
      grade = submission.assignedGrade;
      // gradedAt = submission.updateTime; // Type conflict in schema? usually okay
    }
    // If late?
  }

  if (dueDate && new Date(dueDate) < now && systemStatus === "backlog") {
    systemStatus = "overdue";
    userStatus = "overdue";
  }

  return {
    id: `assign-${gc.id}`,
    uniqueId: `${course.id}-${gc.id}`,
    userId: course.userId,
    courseId: course.id,
    courseName: course.name,
    classroomId: gc.id,
    title: gc.title,
    description: gc.description || null,
    dueDate,
    dueTime,
    maxPoints: gc.maxPoints || null,
    systemStatus: systemStatus as any,
    userStatus: userStatus as any,
    submissionId: submission?.id || null,
    submittedAt: submittedAt ? new Date(submittedAt).toISOString() : null,
    gradedAt: gradedAt ? new Date(gradedAt).toISOString() : null,
    grade: grade || null,
    alternateLink: gc.alternateLink || null,
    createdAt: gc.creationTime || now.toISOString(),
    lastSyncedAt: now.toISOString(),
  };
}
