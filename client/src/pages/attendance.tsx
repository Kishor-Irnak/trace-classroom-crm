import { useState, useMemo, useEffect } from "react";
import {
  RotateCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  Clock,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useClassroom } from "@/lib/classroom-context";

// --- Mock Data Types ---

interface SubjectAttendance {
  id: string;
  name: string;
  code: string;
  attended: number;
  total: number;
  lastUpdated: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: "Present" | "Absent";
  type: "Lecture" | "Practical" | "Tutorial";
  notes?: string;
}

const INSIGHTS = [
  {
    title: "Safe Bunks",
    value: "2",
    desc: "lectures in Data Structures",
    risk: "low",
  },
  {
    title: "Critical",
    value: "DBMS",
    desc: "Needs 3 more classes",
    risk: "high",
  },
  {
    title: "On Track",
    value: "92%",
    desc: "Overall attendance",
    risk: "safe",
  },
];

// Fallback mock subjects if no context is available
const MOCK_SUBJECTS: SubjectAttendance[] = [
  {
    id: "sub-1",
    name: "Data Structures & Algorithms",
    code: "CS301",
    attended: 36,
    total: 42,
    lastUpdated: "Today",
  },
  {
    id: "sub-2",
    name: "Database Management Systems",
    code: "CS302",
    attended: 28,
    total: 45,
    lastUpdated: "Yesterday",
  },
];

// Helper to calculate percentage and color
const getStats = (attended: number, total: number) => {
  const percentage = Math.round((attended / total) * 100);
  let status: "safe" | "warning" | "danger" = "safe";
  let color =
    "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30";
  let progressColor = "bg-emerald-500 dark:bg-emerald-600";

  if (percentage < 70) {
    status = "danger";
    color =
      "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30";
    progressColor = "bg-red-500 dark:bg-red-600";
  } else if (percentage < 75) {
    status = "warning";
    color =
      "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30";
    progressColor = "bg-amber-500 dark:bg-amber-600";
  }

  return { percentage, status, color, progressColor };
};

// Generate mock records for a selected subject
const generateRecords = (subjectId: string): AttendanceRecord[] => {
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `${subjectId}-rec-${i}`,
    date: new Date(Date.now() - i * 86400000 * 2).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: Math.random() > 0.2 ? "Present" : "Absent",
    type: Math.random() > 0.3 ? "Lecture" : "Practical",
  }));
};

export default function AttendancePage() {
  const { courses } = useClassroom();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Map real courses to mock attendance stats
  const subjects: SubjectAttendance[] = useMemo(() => {
    if (!courses || courses.length === 0) {
      return MOCK_SUBJECTS;
    }

    return courses.map((course, index) => {
      // Deterministic mock generation based on index to keep it consistent
      const total = 30 + ((index * 7) % 20); // Random total between 30-50
      const attended = Math.floor(total * (0.6 + ((index * 3) % 40) / 100)); // Random attendance between 60%-99%

      return {
        id: course.id,
        name: course.name,
        code: course.section || `SEC-${index + 1}`,
        attended,
        total,
        lastUpdated: index % 2 === 0 ? "Today" : "Yesterday",
      };
    });
  }, [courses]);

  // Set initial selected subject
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const overallAttended = subjects.reduce(
    (acc, curr) => acc + curr.attended,
    0
  );
  const overallTotal = subjects.reduce((acc, curr) => acc + curr.total, 0);
  const overallStats = getStats(overallAttended || 100, overallTotal || 100); // Prevent division by zero

  const currentSubject =
    subjects.find((s) => s.id === selectedSubject) || subjects[0];
  const subjectRecords = useMemo(
    () => generateRecords(currentSubject.id),
    [currentSubject.id]
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-muted/10">
      {/* 1. Header */}
      <div className="flex-none px-8 py-6 border-b z-10 bg-background">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Attendance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live attendance synced from your classroom
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className={cn("gap-2", isLoading && "opacity-70")}
          >
            <RotateCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto w-full space-y-8">
          {/* 2. Overall Attendance */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-foreground">
                  Overall Attendance
                </CardTitle>
                <Badge
                  variant={
                    overallStats.status === "safe" ? "outline" : "secondary"
                  }
                  className={cn(
                    "uppercase tracking-wider font-mono text-xs",
                    overallStats.color
                  )}
                >
                  {overallStats.status === "safe"
                    ? "Safe"
                    : overallStats.status === "warning"
                    ? "Warning"
                    : "Danger"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 mb-4">
                <span
                  className={cn(
                    "text-5xl font-bold tracking-tight",
                    overallStats.status === "danger"
                      ? "text-destructive"
                      : overallStats.status === "warning"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-foreground"
                  )}
                >
                  {overallStats.percentage}%
                </span>
                <div className="pb-2 text-sm text-muted-foreground font-medium space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>
                      Attended: {overallAttended} / {overallTotal} classes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <span>Across {subjects.length} subjects</span>
                  </div>
                </div>
              </div>
              <Progress
                value={overallStats.percentage}
                className={cn("h-2", overallStats.progressColor)}
              />
            </CardContent>
          </Card>

          {/* 3. Subject Cards & Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Subject List */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                Your Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((subject) => {
                  const stats = getStats(subject.attended, subject.total);
                  return (
                    <Card
                      key={subject.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:border-foreground/20 hover:shadow-sm border-border shadow-none group bg-card",
                        selectedSubject === subject.id &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                      onClick={() => setSelectedSubject(subject.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4
                              className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1"
                              title={subject.name}
                            >
                              {subject.name}
                            </h4>
                            <span className="text-xs text-muted-foreground font-mono">
                              {subject.code}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn("font-mono", stats.color)}
                          >
                            {stats.percentage}%
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <Progress
                            value={stats.percentage}
                            className={cn("h-1.5", stats.progressColor)}
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {subject.attended}/{subject.total} attended
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {subject.lastUpdated}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right: Detailed View & Insights */}
            <div className="space-y-6">
              {/* Detailed Tracker */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    History: {currentSubject.code}
                  </h3>
                </div>

                <Card className="border-border shadow-none h-[400px] flex flex-col bg-card">
                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <TableRow className="hover:bg-transparent border-border">
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjectRecords.map((record) => (
                          <TableRow
                            key={record.id}
                            className="hover:bg-muted/50 border-border"
                          >
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {record.date}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <Badge
                                variant="outline"
                                className="font-normal text-[10px] px-2 py-0 h-5"
                              >
                                {record.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                                  record.status === "Present"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    record.status === "Present"
                                      ? "bg-emerald-500"
                                      : "bg-red-500"
                                  )}
                                />
                                {record.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>

              {/* Smart Insights */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  Insights
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {INSIGHTS.map((insight, i) => (
                    <Card key={i} className="border-border shadow-none bg-card">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                            insight.risk === "low"
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                              : insight.risk === "high"
                              ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                          )}
                        >
                          {insight.risk === "low" ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : insight.risk === "high" ? (
                            <AlertCircle className="h-5 w-5" />
                          ) : (
                            <TrendingUp className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {insight.value}{" "}
                            <span className="font-normal text-muted-foreground">
                              {insight.desc}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">
                            {insight.title}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
