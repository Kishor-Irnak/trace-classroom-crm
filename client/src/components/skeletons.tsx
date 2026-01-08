import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function MetricSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Skeleton className="h-9 w-16" />
      </CardContent>
    </Card>
  );
}

export function AssignmentRowSkeleton() {
  return (
    <div className="flex items-center space-x-4 py-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 max-w-[200px] w-full">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </div>
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <Card className="min-h-[140px] flex flex-col justify-between p-5">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex justify-between items-end mt-4">
        <div className="space-y-2 w-full">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </Card>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
