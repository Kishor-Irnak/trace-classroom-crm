import { useState, useMemo, useEffect } from "react";
import {
  RotateCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  Clock,
  BookOpen,
  ArrowUpRight,
  MoreHorizontal,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
}

const INSIGHTS = [
  {
    title: "Critical",
    value: "DBMS",
    desc: "Attendance below 70%",
    risk: "high",
  },
  {
    title: "Safe",
    value: "CN",
    desc: "Above 85% requirement",
    risk: "low",
  },
  {
    title: "Trend",
    value: "+4%",
    desc: "Overall improvement",
    risk: "safe",
  },
];

// Fallback mock subjects
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
    "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  let progressColor = "bg-emerald-500 dark:bg-emerald-500";

  if (percentage < 70) {
    status = "danger";
    color =
      "text-red-700 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    progressColor = "bg-red-500 dark:bg-red-500";
  } else if (percentage < 75) {
    status = "warning";
    color =
      "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    progressColor = "bg-amber-500 dark:bg-amber-500";
  }

  return { percentage, status, color, progressColor };
};

const generateRecords = (subjectId: string): AttendanceRecord[] => {
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `${subjectId}-rec-${i}`,
    date: new Date(Date.now() - i * 86400000 * 2).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    status: Math.random() > 0.2 ? "Present" : "Absent",
    type: Math.random() > 0.3 ? "Lecture" : "Practical",
  }));
};

export default function AttendancePage() {
  const { courses } = useClassroom();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const subjects: SubjectAttendance[] = useMemo(() => {
    if (!courses || courses.length === 0) return MOCK_SUBJECTS;

    return courses.map((course, index) => {
      const total = 30 + ((index * 7) % 20);
      const attended = Math.floor(total * (0.6 + ((index * 3) % 40) / 100));
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
  const overallStats = getStats(overallAttended || 100, overallTotal || 100);

  const currentSubject =
    subjects.find((s) => s.id === selectedSubject) || subjects[0];
  const subjectRecords = useMemo(
    () => generateRecords(currentSubject.id),
    [currentSubject.id]
  );

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Page Header */}
      <div className="flex-none px-6 py-4 border-b border-border z-10 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Attendance
            </h1>
            <span className="h-4 w-px bg-border mx-1" />
            <span className="text-sm text-muted-foreground font-medium">
              Academic Year 2024-25
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className={cn(
              "text-muted-foreground h-8",
              isLoading && "opacity-70"
            )}
          >
            <RotateCw
              className={cn("h-3.5 w-3.5 mr-2", isLoading && "animate-spin")}
            />
            Sync Now
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto w-full p-6 space-y-8">
          {/* ZONE A: HERO (Overall Attendance) */}
          <section>
            <Card className="border-border shadow-sm bg-card hover:bg-accent/5 transition-colors">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Overall Attendance
                    </span>
                    <Badge
                      variant={
                        overallStats.status === "safe"
                          ? "outline"
                          : "destructive"
                      }
                      className={cn(
                        "ml-2 h-5 text-[10px] px-1.5 uppercase",
                        overallStats.color
                      )}
                    >
                      {overallStats.status === "safe"
                        ? "Safe Status"
                        : "Attention Needed"}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                      {overallStats.percentage}%
                    </span>
                    <span className="text-sm sm:text-base text-muted-foreground font-medium">
                      Average across {subjects.length} courses
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-sm border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-8 w-full sm:w-auto mt-2 sm:mt-0">
                  <div>
                    <p className="text-muted-foreground mb-1">
                      Attended Classes
                    </p>
                    <p className="font-semibold text-foreground text-lg">
                      {overallAttended}{" "}
                      <span className="text-muted-foreground text-sm font-normal">
                        / {overallTotal}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Risk Level</p>
                    <p className="font-semibold text-foreground text-lg flex items-center gap-2">
                      {overallStats.status === "safe" ? (
                        <span className="text-emerald-500">Low</span>
                      ) : (
                        <span className="text-red-500">High</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* ZONE B: PRIMARY CONTENT (Course Cards) */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subject) => {
                const stats = getStats(subject.attended, subject.total);
                return (
                  <Card
                    key={subject.id}
                    className={cn(
                      "group cursor-pointer border-border shadow-sm hover:shadow-md transition-all duration-200 bg-card active:scale-[0.99]",
                      selectedSubject === subject.id &&
                        "ring-1 ring-primary border-primary"
                    )}
                    onClick={() => setSelectedSubject(subject.id)}
                  >
                    <CardContent className="p-5 h-full flex flex-col justify-between gap-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h3 className="font-semibold text-foreground truncate pr-2">
                                {subject.name}
                              </h3>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{subject.name}</p>
                            </TooltipContent>
                          </Tooltip>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {subject.code}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-lg font-bold tabular-nums",
                            stats.percentage < 75
                              ? "text-destructive"
                              : "text-muted-foreground/70"
                          )}
                        >
                          {stats.percentage}%
                        </span>
                      </div>

                      <div className="space-y-3 mt-auto">
                        <div className="flex justify-between text-xs text-muted-foreground font-medium">
                          <span>
                            {subject.attended} / {subject.total} classes
                          </span>
                          <span
                            className={cn(
                              stats.status === "safe"
                                ? "text-emerald-500"
                                : "text-red-500"
                            )}
                          >
                            {stats.status === "safe"
                              ? "On Track"
                              : "Needs Attention"}
                          </span>
                        </div>
                        {/* Thin Progress Bar */}
                        <div className="h-1 w-full bg-secondary/80 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              stats.progressColor
                            )}
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ZONE C: SECONDARY RAIL (History & Insights) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
              {/* Contextual History Panel */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    History
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                    {subjects.find((s) => s.id === selectedSubject)?.code}
                  </span>
                </div>

                <Card className="border-border shadow-sm bg-card overflow-hidden">
                  <div className="max-h-[320px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10 border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                        <TableRow className="border-none hover:bg-transparent">
                          <TableHead className="w-[100px] h-9 text-xs">
                            Date
                          </TableHead>
                          <TableHead className="h-9 text-xs">Type</TableHead>
                          <TableHead className="text-right h-9 text-xs px-4">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjectRecords.map((record) => (
                          <TableRow
                            key={record.id}
                            className="border-b border-border/50 hover:bg-muted/30"
                          >
                            <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                              {record.date}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground py-2.5">
                              {record.type}
                            </TableCell>
                            <TableCell className="text-right py-2.5 px-4">
                              <span
                                className={cn(
                                  "inline-flex w-2 h-2 rounded-full mr-2",
                                  record.status === "Present"
                                    ? "bg-emerald-500"
                                    : "bg-red-500"
                                )}
                              />
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  record.status === "Present"
                                    ? "text-foreground"
                                    : "text-destructive"
                                )}
                              >
                                {record.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-2 border-t border-border bg-muted/20 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                      View Full History{" "}
                      <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Compact Insights Panel */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-foreground px-1 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Insights
                </h3>
                <div className="space-y-2">
                  {INSIGHTS.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                          insight.risk === "low"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : insight.risk === "high"
                            ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {insight.risk === "low" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : insight.risk === "high" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            {insight.title}
                          </span>
                          <span className="text-xs font-bold font-mono text-muted-foreground">
                            {insight.value}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {insight.desc}
                        </p>
                      </div>
                    </div>
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
