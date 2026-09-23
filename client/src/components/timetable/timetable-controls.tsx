import {
  CalendarDays,
  Eye,
  ListFilter,
  Save,
  Send,
  Settings2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ACADEMIC_YEARS,
  DEPARTMENTS,
  DIVISIONS,
  SEMESTERS,
  YEARS,
  type TimetableContext,
} from "@/services/timetable-service";
import { useTimetableStore, type ViewMode } from "./timetable-store";

function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function TimetableHeader({
  onPreview,
  onSaveDraft,
  onPublish,
}: {
  onPreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const { timetable, isDirty, saveStatus, lastSavedAt } = useTimetableStore();
  const status = timetable?.status ?? "draft";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Timetable Builder
          </h1>
          <Badge variant={status === "published" ? "default" : "secondary"}>
            {status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage class timetables with a simple drag and drop
          interface
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isDirty ? (
            <span className="text-amber-600 dark:text-amber-500">
              Unsaved changes
            </span>
          ) : saveStatus === "saving" ? (
            "Saving…"
          ) : lastSavedAt ? (
            <>Last saved {relativeTime(lastSavedAt)}</>
          ) : (
            "Not saved yet"
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onPreview} className="gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button variant="outline" onClick={onSaveDraft} className="gap-2">
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button onClick={onPublish} className="gap-2">
          <Send className="h-4 w-4" />
          Publish Timetable
        </Button>
      </div>
    </div>
  );
}

export function ContextSelector() {
  const { context, changeContext } = useTimetableStore();

  const fields: {
    key: keyof TimetableContext;
    label: string;
    options: string[];
  }[] = [
    { key: "academicYear", label: "Academic Year", options: ACADEMIC_YEARS },
    { key: "department", label: "Department", options: DEPARTMENTS },
    { key: "year", label: "Year", options: YEARS },
    { key: "division", label: "Division", options: DIVISIONS },
    { key: "semester", label: "Semester", options: SEMESTERS },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {f.label}
          </label>
          <Select
            value={context[f.key]}
            onValueChange={(v) => changeContext({ [f.key]: v })}
          >
            <SelectTrigger aria-label={f.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {f.options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

export function TimetableTabs({ onClearAll }: { onClearAll: () => void }) {
  const { viewMode, setViewMode } = useTimetableStore();

  const tabs: { id: ViewMode; label: string; icon: typeof CalendarDays }[] = [
    { id: "weekly", label: "Weekly View", icon: CalendarDays },
    { id: "list", label: "List View", icon: ListFilter },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border">
      <div className="flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setViewMode(t.id)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
              viewMode === t.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {viewMode === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {viewMode === "weekly" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="gap-2 text-muted-foreground hover:text-destructive"
        >
          <Upload className="h-4 w-4 rotate-180" />
          Clear All
        </Button>
      )}
    </div>
  );
}
