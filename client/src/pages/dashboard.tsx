import { useState } from "react";
import { AlertCircle, Calendar, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentCardCompact } from "@/components/assignment-card";
import { AssignmentDetail } from "@/components/assignment-detail";
import { useClassroom } from "@/lib/classroom-context";
import type { Assignment } from "@shared/schema";
import { cn } from "@/lib/utils";

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = "default" 
}: { 
  title: string; 
  value: number; 
  icon: typeof Clock;
  variant?: "default" | "warning" | "danger";
}) {
  return (
    <Card data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-5 w-5",
          variant === "default" && "text-muted-foreground",
          variant === "warning" && "text-foreground",
          variant === "danger" && "text-destructive"
        )} />
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-3xl font-semibold font-mono tracking-tight",
          variant === "danger" && "text-destructive"
        )}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyWorkload({ data }: { data: { day: string; count: number; isToday: boolean }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weekly Workload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 h-32">
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-2 flex-1">
              <span className="text-xs font-mono text-muted-foreground">
                {item.count > 0 ? item.count : ""}
              </span>
              <div 
                className={cn(
                  "w-full rounded-t-sm transition-all",
                  item.isToday ? "bg-foreground" : "bg-muted",
                  item.count === 0 && "min-h-[4px]"
                )}
                style={{ 
                  height: item.count > 0 ? `${(item.count / maxCount) * 80}px` : "4px" 
                }}
              />
              <span className={cn(
                "text-xs",
                item.isToday ? "font-medium" : "text-muted-foreground"
              )}>
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { getDashboardMetrics, isLoading, assignments, syncClassroom } = useClassroom();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const metrics = getDashboardMetrics();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="text-center space-y-2">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-medium">No data yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Sync your Google Classroom to see your dashboard with metrics and insights.
          </p>
        </div>
        <button
          onClick={syncClassroom}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-sync-empty-dashboard"
        >
          Sync Google Classroom
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Due in 3 Days"
            value={metrics.upcoming3Days}
            icon={Clock}
            variant={metrics.upcoming3Days > 3 ? "warning" : "default"}
          />
          <MetricCard
            title="Due in 7 Days"
            value={metrics.upcoming7Days}
            icon={Calendar}
          />
          <MetricCard
            title="Overdue"
            value={metrics.overdue}
            icon={AlertCircle}
            variant={metrics.overdue > 0 ? "danger" : "default"}
          />
          <MetricCard
            title="Total Active"
            value={metrics.totalActive}
            icon={CheckCircle}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <WeeklyWorkload data={metrics.weeklyWorkload} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Next Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics.nextActions.length > 0 ? (
                metrics.nextActions.map((assignment) => (
                  <AssignmentCardCompact
                    key={assignment.id}
                    assignment={assignment}
                    onClick={() => setSelectedAssignment(assignment)}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mb-2" />
                  <p className="text-sm">All caught up!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AssignmentDetail
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </>
  );
}
