import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  colorHex,
  DAY_NAMES,
  formatTimeShort,
  hexToRgba,
  toMinutes,
  type Timetable,
} from "@/services/timetable-service";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateTimetablePDF } from "@/services/pdf-service";

export function PreviewDialog({
  open,
  onOpenChange,
  timetable,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  timetable: Timetable | null;
}) {
  if (!timetable) return null;
  const { settings } = timetable;
  const days = [...settings.workingDays].sort((a, b) => a - b);
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateTimetablePDF(timetable);
      toast({
        title: "PDF downloaded successfully",
        description: "Your timetable PDF has been generated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to generate PDF",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const colorFor = (subjectId: string) =>
    colorHex(
      timetable.subjects.find((s) => s.id === subjectId)?.color || "blue",
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle>Timetable Preview</DialogTitle>
            <Badge
              variant={
                timetable.status === "published" ? "default" : "secondary"
              }
            >
              {timetable.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
          <DialogDescription>
            {timetable.department} • {timetable.year} • Division{" "}
            {timetable.division} • Semester {timetable.semester} •{" "}
            {timetable.academicYear}
          </DialogDescription>
          <div className="absolute right-12 top-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-x-auto rounded-lg border border-border max-h-[60vh]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="bg-muted/50 shadow-sm">
                <th className="w-24 border-b border-r border-border p-2 text-left text-xs font-semibold text-muted-foreground">
                  Time
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className="border-b border-border p-2 text-center text-xs font-semibold"
                  >
                    {DAY_NAMES[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(settings.timeStructure || []).map((block) => {
                if (block.type === "break") {
                  return (
                    <tr key={block.id}>
                      <td className="border-r border-t border-border p-2 text-[11px] text-muted-foreground tabular-nums">
                        {formatTimeShort(block.startTime)}
                      </td>
                      <td
                        colSpan={days.length}
                        className="border-t border-border bg-muted/60 p-2 text-center text-xs font-medium text-muted-foreground"
                      >
                        {block.name || "Break"}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={block.id}>
                    <td className="border-r border-t border-border p-2 text-[11px] text-muted-foreground tabular-nums">
                      {formatTimeShort(block.startTime)} - {formatTimeShort(block.endTime)}
                    </td>
                    {days.map((d) => {
                      const lec = timetable.lectures.find(
                        (l) =>
                          l.dayOfWeek === d &&
                          toMinutes(l.startTime) === toMinutes(block.startTime)
                      );
                      if (!lec) {
                        return (
                          <td
                            key={d}
                            className="border-t border-r border-border p-1 last:border-r-0"
                          />
                        );
                      }
                      const hex = colorFor(lec.subjectId);
                      return (
                        <td
                          key={d}
                          className="border-t border-r border-border p-1 last:border-r-0"
                        >
                          <div
                            className="rounded-md border-l-[3px] p-1.5"
                            style={{
                              borderLeftColor: hex,
                              backgroundColor: hexToRgba(hex, 0.1),
                            }}
                          >
                            <p className="text-xs font-semibold leading-tight">
                              {lec.subjectName}
                            </p>
                            <p className="text-[11px] leading-tight text-muted-foreground">
                              {lec.teacherName}
                            </p>
                            {lec.room && (
                              <p className="text-[10px] leading-tight text-muted-foreground/80">
                                {lec.room}
                              </p>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
