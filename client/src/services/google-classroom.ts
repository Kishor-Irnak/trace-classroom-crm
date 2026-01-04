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
  updateTime?: string;
  // Note: turnInTime and late fields don't exist at the top level
  // They may be in submissionHistory if needed in the future
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
        if (cached) {
          console.log(
            `[CACHE HIT] Using cached assignments for ${course.name}`
          );
          return cached;
        }

        console.log(`[CACHE MISS] Fetching fresh data for ${course.name}`);

        // Fetch CourseWork AND Submissions in parallel for this course
        // URL: courseWork/-/studentSubmissions gets ALL submissions for the course
        const courseworkUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?courseWorkStates=PUBLISHED&fields=courseWork(id,title,description,dueDate,dueTime,maxPoints,alternateLink,workType,creationTime,updateTime)`;
        // Note: turnInTime and late fields don't exist in studentSubmissions - they're in submissionHistory
        const submissionsUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/-/studentSubmissions?userId=me&fields=studentSubmissions(id,courseWorkId,state,assignedGrade,updateTime)`;

        const [cwRes, subRes] = await Promise.all([
          fetch(courseworkUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((r) => {
            if (!r.ok)
              console.error(
                `Coursework fetch failed: ${r.status} ${r.statusText}`
              );
            return r.ok ? r.json() : { courseWork: [] };
          }),
          fetch(submissionsUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then(async (r) => {
            if (!r.ok) {
              console.error(
                `⚠️ Submissions fetch failed: ${r.status} ${r.statusText}`
              );
              console.error(
                `⚠️ This usually means missing OAuth scope: classroom.student-submissions.me.readonly`
              );
              console.error(
                `⚠️ Please sign out and sign in again to grant permissions`
              );
              const errorText = await r.text();
              console.error(`⚠️ Error response:`, errorText);
              return { studentSubmissions: [] };
            }
            return r.json();
          }),
        ]);

        const work = cwRes.courseWork || [];
        const submissions: GoogleStudentSubmission[] =
          subRes.studentSubmissions || [];

        console.log(`[API DATA] Course: ${course.name}`);
        console.log(`  - Coursework items: ${work.length}`);
        console.log(`  - Submissions: ${submissions.length}`);
        console.log(
          `  - Submission states:`,
          submissions.map((s) => ({ id: s.courseWorkId, state: s.state }))
        );

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

        CacheService.set(cacheKey, mapped, 5 * 60); // 5 minutes cache for faster submission updates
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
    // Debug: Log submission state to help diagnose issues
    console.log(`Assignment "${gc.title}" submission state:`, submission.state);

    // Handle submitted states (both TURNED_IN and SUBMITTED)
    if (submission.state === "TURNED_IN" || submission.state === "SUBMITTED") {
      userStatus = "submitted";
      systemStatus = "submitted";
      submittedAt = submission.updateTime; // Use updateTime as submission timestamp
    }
    // Handle returned/graded state
    else if (submission.state === "RETURNED") {
      userStatus = "graded";
      systemStatus = "graded";
      grade = submission.assignedGrade;
      submittedAt = submission.updateTime; // Use updateTime as submission timestamp
      gradedAt = submission.updateTime;
    }
    // Handle reclaimed (student took back their submission)
    else if (submission.state === "reclaimed_by_student") {
      userStatus = "backlog";
      systemStatus = "backlog";
    }
    // NEW or CREATED means work in progress
    else if (submission.state === "NEW" || submission.state === "CREATED") {
      userStatus = "backlog";
      systemStatus = "backlog";
    }
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
