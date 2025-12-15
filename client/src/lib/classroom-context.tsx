import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Course, Assignment, Note, DashboardMetrics, PipelineColumn, TimelineGroup } from "@shared/schema";
import { useAuth } from "./auth-context";

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
  addNote: (assignmentId: string, content: string, isImportant?: boolean) => void;
  updateNote: (noteId: string, content: string, isImportant?: boolean) => void;
  deleteNote: (noteId: string, assignmentId: string) => void;
  getPipelineColumns: () => PipelineColumn[];
  getDashboardMetrics: () => DashboardMetrics;
  getTimelineGroups: (filter?: { courseId?: string; status?: string }) => TimelineGroup[];
  getAssignmentById: (id: string) => Assignment | undefined;
  getNotesForAssignment: (assignmentId: string) => Note[];
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

function generateId() {
  return Math.random().toString(36).substring(2, 15);
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
      description: "Complete the quiz on Python fundamentals including variables, data types, and basic operations.",
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
      description: "Write programs demonstrating if-else statements, loops, and nested conditions.",
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
      description: "Implement a singly linked list with insert, delete, and search operations.",
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
      description: "Build a BST with traversal methods and balancing capabilities.",
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
      description: "Write complex SQL queries involving joins, subqueries, and aggregations.",
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
      description: "Design an entity-relationship diagram for a library management system.",
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
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notes, setNotes] = useState<Map<string, Note[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncClassroom = useCallback(async () => {
    if (!user) return;
    
    setIsSyncing(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { courses: demoCourses, assignments: demoAssignments } = getDemoData();
      setCourses(demoCourses);
      setAssignments(demoAssignments);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync");
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [user]);

  const updateAssignmentStatus = useCallback((assignmentId: string, userStatus: string) => {
    setAssignments(prev => 
      prev.map(a => 
        a.id === assignmentId 
          ? { ...a, userStatus: userStatus as Assignment["userStatus"] }
          : a
      )
    );
  }, []);

  const addNote = useCallback((assignmentId: string, content: string, isImportant = false) => {
    const newNote: Note = {
      id: generateId(),
      userId: user?.uid || "",
      assignmentId,
      content,
      isImportant,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setNotes(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(assignmentId) || [];
      newMap.set(assignmentId, [...existing, newNote]);
      return newMap;
    });
  }, [user]);

  const updateNote = useCallback((noteId: string, content: string, isImportant?: boolean) => {
    setNotes(prev => {
      const newMap = new Map(prev);
      for (const [assignmentId, noteList] of newMap) {
        const noteIndex = noteList.findIndex(n => n.id === noteId);
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
  }, []);

  const deleteNote = useCallback((noteId: string, assignmentId: string) => {
    setNotes(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(assignmentId) || [];
      newMap.set(assignmentId, existing.filter(n => n.id !== noteId));
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

    assignments.forEach(assignment => {
      const status = assignment.userStatus === "in_progress" ? "in_progress" : assignment.systemStatus;
      const column = columns.find(c => c.id === status);
      if (column) {
        column.assignments.push(assignment);
      }
    });

    columns.forEach(col => {
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

    const activeAssignments = assignments.filter(a => 
      a.systemStatus !== "graded" && a.systemStatus !== "submitted"
    );

    const upcoming3Days = assignments.filter(a => {
      if (!a.dueDate || a.systemStatus === "graded" || a.systemStatus === "submitted") return false;
      const due = new Date(a.dueDate);
      return due >= now && due <= in3Days;
    });

    const upcoming7Days = assignments.filter(a => {
      if (!a.dueDate || a.systemStatus === "graded" || a.systemStatus === "submitted") return false;
      const due = new Date(a.dueDate);
      return due >= now && due <= in7Days;
    });

    const overdue = assignments.filter(a => a.systemStatus === "overdue");

    const weeklyWorkload: DashboardMetrics["weeklyWorkload"] = [];
    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      
      const count = assignments.filter(a => {
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
      .filter(a => a.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
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

  const getTimelineGroups = useCallback((filter?: { courseId?: string; status?: string }): TimelineGroup[] => {
    let filtered = [...assignments];

    if (filter?.courseId) {
      filtered = filtered.filter(a => a.courseId === filter.courseId);
    }
    if (filter?.status) {
      filtered = filtered.filter(a => a.systemStatus === filter.status);
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

    filtered.forEach(assignment => {
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
          day: "numeric" 
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
  }, [assignments]);

  const getAssignmentById = useCallback((id: string) => {
    return assignments.find(a => a.id === id);
  }, [assignments]);

  const getNotesForAssignment = useCallback((assignmentId: string) => {
    return notes.get(assignmentId) || [];
  }, [notes]);

  return (
    <ClassroomContext.Provider value={{
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
    }}>
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
