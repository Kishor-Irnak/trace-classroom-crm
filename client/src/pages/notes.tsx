import { useState } from "react";
import { useClassroom, getTextColor } from "@/lib/classroom-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  FileText,
  ExternalLink,
  ChevronRight,
  Folder,
  RefreshCw,
  ArrowLeft,
  LayoutGrid,
  List,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TokenRefreshPrompt } from "@/components/token-refresh-prompt";

import { useIsMobile } from "@/hooks/use-mobile";

export default function NotesPage() {
  const {
    courses,
    materials,
    isLoading,
    isSyncing,
    syncClassroom,
    reauthRequired,
  } = useClassroom();
  const { signOut } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isMobile = useIsMobile();

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const courseMaterials = materials.filter(
    (m) => m.courseId === selectedCourseId
  );

  // Filter for PDF and PPT materials
  const courseDocuments = courseMaterials
    .flatMap((cm) => {
      if (!cm.materials) return [];

      return cm.materials.flatMap((m: any) => {
        let files = [];
        if (m.driveFile) {
          const driveFileData = m.driveFile.driveFile;

          // Try multiple thumbnail sources
          let thumbnailUrl =
            driveFileData.thumbnailUrl || driveFileData.iconUrl || null;

          // If no thumbnail, try to construct one from the file ID
          if (!thumbnailUrl && driveFileData.id) {
            // Google Drive thumbnail URL format
            thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveFileData.id}&sz=w800`;
          }

          files.push({
            id: driveFileData.id,
            title: driveFileData.title,
            link: driveFileData.alternateLink,
            thumbnail: thumbnailUrl,
            type: "driveFile",
          });
        }
        return files;
      });
    })
    .filter((file) => {
      // Allow all files that have a title
      return !!file.title;
    });

  if (isLoading && courses.length === 0) {
    return <NotesSkeleton />;
  }

  // Check if there's a token-related error (reauthRequired)
  // But strictly block ONLY if we have no data to show.
  if (reauthRequired) {
    if (courses.length === 0) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <TokenRefreshPrompt />
        </div>
      );
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-background flex-col">
      {reauthRequired && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-3 shrink-0">
          <div className="flex items-center justify-between gap-4 max-w-full">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              <span>
                Sync is paused. Cached notes are shown. Sign in to update.
              </span>
            </div>
            <a
              href="/auth/refresh"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                Reconnect
              </Button>
            </a>
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Course List */}
        <div
          className={cn(
            "w-full md:w-80 border-r border-border bg-muted/20 flex flex-col h-full shrink-0",
            isMobile && selectedCourseId ? "hidden" : "flex"
          )}
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-background">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Your Courses
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <TooltipProvider>
              {courses.map((course) => (
                <Tooltip key={course.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSelectedCourseId(course.id)}
                      className={cn(
                        "w-full text-left px-3 py-3.5 rounded-md transition-all group flex items-center gap-3 outline-none focus:ring-2 focus:ring-primary/20",
                        selectedCourseId === course.id
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-transparent",
                          // Ensure shadow/border when selected for better visibility
                          selectedCourseId === course.id
                            ? "ring-2 ring-primary-foreground/20"
                            : ""
                        )}
                        style={{
                          backgroundColor: course.color || "#e4e4e7", // fallback to muted
                        }}
                      >
                        <Folder
                          className="h-4 w-4"
                          style={{
                            color: course.color
                              ? getTextColor(course.color)
                              : undefined,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-sm font-semibold leading-tight mb-0.5 truncate">
                          {course.name}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-medium leading-tight",
                            selectedCourseId === course.id
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground/70"
                          )}
                        >
                          {course.section || "No Section"}
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform shrink-0",
                          selectedCourseId === course.id
                            ? "translate-x-0"
                            : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                        )}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{course.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>

        {/* Main Content: Notes View */}
        <div
          className={cn(
            "flex-1 overflow-y-auto bg-background",
            isMobile && !selectedCourseId ? "hidden" : "flex flex-col"
          )}
        >
          {isMobile && selectedCourseId && (
            <div className="flex items-center p-4 border-b border-border bg-background sticky top-0 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCourseId(null)}
                className="gap-2 pl-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Courses
              </Button>
            </div>
          )}

          {!selectedCourseId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-md mx-auto">
              <div className="h-24 w-24 bg-muted/50 rounded-2xl flex items-center justify-center border border-border shadow-sm">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Select a curriculum
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium mt-2">
                  Choose a course from the listing to accessibility your
                  synchronized PDF lecture records and study guides.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-6 border-border gap-4">
                <div className="space-y-1 max-w-full">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono tracking-[0.2em] font-bold uppercase py-0 px-2 rounded-sm border-border"
                  >
                    Course Resources
                  </Badge>
                  <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase italic break-words leading-tight text-foreground">
                    {selectedCourse?.name}
                  </h1>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground line-clamp-2">
                    {selectedCourse?.descriptionHeading ||
                      "Curated academic materials and notes."}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="bg-muted/30 px-3 py-1.5 rounded-md border border-border flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-muted-foreground">
                      {courseDocuments.length} Documents
                    </span>
                  </div>
                  <div className="flex bg-muted rounded-md p-1 border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6 rounded-sm",
                        viewMode === "grid" && "bg-background shadow-sm"
                      )}
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6 rounded-sm",
                        viewMode === "list" && "bg-background shadow-sm"
                      )}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {courseDocuments.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20">
                    {courseDocuments.map((doc, idx) => {
                      const lower = doc.title?.toLowerCase() || "";
                      const isPdf = lower.endsWith(".pdf");
                      const isPpt =
                        lower.endsWith(".ppt") || lower.endsWith(".pptx");

                      let typeColor = "bg-zinc-100 text-zinc-600";
                      let lightBg = "bg-zinc-50";
                      let typeLabel = "FILE";

                      if (isPdf) {
                        typeColor = "bg-red-100 text-red-600";
                        lightBg = "bg-red-50";
                        typeLabel = "PDF DOCUMENT";
                      } else if (isPpt) {
                        typeColor = "bg-orange-100 text-orange-600";
                        lightBg = "bg-orange-50";
                        typeLabel = "PRESENTATION";
                      } else {
                        typeColor = "bg-blue-100 text-blue-600";
                        lightBg = "bg-blue-50";
                        typeLabel = "DOCUMENT";
                      }

                      return (
                        <Card
                          key={`${doc.id}-${idx}`}
                          className="group relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 border-border bg-card shadow-sm flex flex-col"
                        >
                          <CardHeader className="p-3 border-b border-border space-y-0 pb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                  typeColor
                                )}
                              >
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-sm truncate leading-none text-card-foreground">
                                  {doc.title}
                                </h4>
                                <p className="text-[10px] text-muted-foreground truncate mt-1 font-mono">
                                  {typeLabel}
                                </p>
                              </div>
                            </div>
                          </CardHeader>

                          <div className="relative aspect-[3/4] bg-muted/30 w-full overflow-hidden group">
                            {doc.thumbnail && (
                              <img
                                src={
                                  doc.thumbnail.includes("s220")
                                    ? doc.thumbnail.replace("s220", "s800")
                                    : doc.thumbnail
                                }
                                alt={doc.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  console.log(
                                    "Thumbnail failed to load:",
                                    doc.thumbnail
                                  );
                                  e.currentTarget.style.display = "none";
                                  const fallback =
                                    e.currentTarget.parentElement?.querySelector(
                                      ".fallback-viewer"
                                    ) as HTMLElement;
                                  if (fallback) {
                                    fallback.classList.remove("hidden");
                                    fallback.classList.add("block");
                                  }
                                }}
                              />
                            )}

                            {/* Fallback or Overlay */}
                            <div
                              className={cn(
                                "fallback-viewer absolute inset-0 w-full h-full",
                                doc.thumbnail ? "hidden" : "block"
                              )}
                            >
                              <MockDocViewer
                                type={isPdf ? "pdf" : isPpt ? "ppt" : "doc"}
                              />
                            </div>

                            {/* Hover Overlay with Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-4">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="font-semibold shadow-xl h-9"
                                asChild
                              >
                                <a
                                  href={doc.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Open Material
                                </a>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 pb-20">
                    {courseDocuments.map((doc, idx) => {
                      const lower = doc.title?.toLowerCase() || "";
                      const isPdf = lower.endsWith(".pdf");
                      const isPpt =
                        lower.endsWith(".ppt") || lower.endsWith(".pptx");

                      let typeColor = "bg-zinc-100 text-zinc-600";
                      let typeLabel = "File";

                      if (isPdf) {
                        typeColor = "bg-red-100 text-red-600";
                        typeLabel = "PDF Document";
                      } else if (isPpt) {
                        typeColor = "bg-orange-100 text-orange-600";
                        typeLabel = "Presentation";
                      } else {
                        typeColor = "bg-blue-100 text-blue-600";
                        typeLabel = "Document";
                      }

                      return (
                        <div
                          key={`${doc.id}-${idx}`}
                          className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                        >
                          {/* Thumbnail or Icon */}
                          <div className="relative h-16 w-16 rounded-md overflow-hidden shrink-0 bg-muted/30 border border-border">
                            {doc.thumbnail ? (
                              <img
                                src={
                                  doc.thumbnail.includes("s220")
                                    ? doc.thumbnail.replace("s220", "s400")
                                    : doc.thumbnail
                                }
                                alt={doc.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const fallback = e.currentTarget
                                    .nextElementSibling as HTMLElement;
                                  if (fallback)
                                    fallback.classList.remove("hidden");
                                }}
                              />
                            ) : null}
                            <div
                              className={cn(
                                "absolute inset-0 flex items-center justify-center",
                                doc.thumbnail ? "hidden" : "flex",
                                typeColor
                              )}
                            >
                              <FileText className="h-6 w-6" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate text-card-foreground group-hover:text-primary transition-colors">
                              {doc.title}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {typeLabel} • Read Only
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="shrink-0"
                          >
                            <a
                              href={doc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <span className="hidden sm:inline text-xs font-medium">
                                Open
                              </span>
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center border-4 border-dotted rounded-3xl bg-muted/20 border-border max-w-2xl mx-auto space-y-4">
                  <div className="h-20 w-20 bg-background rounded-full flex items-center justify-center shadow-inner border border-border">
                    <Folder className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">
                      No Documents Found
                    </h4>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto font-medium">
                      This course has no documents uploaded to Classroom yet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 border-r bg-muted/20 p-6 space-y-6">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex-1 p-10 space-y-10">
        <div className="flex justify-between items-end border-b pb-8">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockDocViewer({ type }: { type: "pdf" | "ppt" | "doc" }) {
  const isPdf = type === "pdf";
  const isPpt = type === "ppt";

  const bgClass = isPdf
    ? "bg-[#FFEEEE]"
    : isPpt
    ? "bg-[#FFF4E5]"
    : "bg-[#E8F0FE]"; // Google Blue light

  return (
    <div
      className={cn(
        "w-full h-full p-4 flex flex-col relative overflow-hidden select-none pointer-events-none",
        bgClass
      )}
    >
      {/* Paper Mockup */}
      <div className="w-full h-full bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] rounded-md border border-black/5 p-4 flex flex-col gap-3 relative z-10 transform transition-transform group-hover:-translate-y-1 duration-500">
        {/* Header Block */}
        <div className="flex gap-2 mb-1">
          <div
            className={cn(
              "h-12 w-12 rounded-lg shrink-0 flex items-center justify-center mb-1",
              isPdf
                ? "bg-red-100 text-red-500"
                : isPpt
                ? "bg-orange-100 text-orange-500"
                : "bg-blue-100 text-blue-500"
            )}
          >
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 flex-1 pt-1">
            <div className="h-3 w-3/4 bg-zinc-100 rounded-full" />
            <div className="h-2 w-1/2 bg-zinc-100 rounded-full" />
          </div>
        </div>

        {/* Text Lines */}
        <div className="space-y-2 flex-1">
          <div className="h-2 w-full bg-zinc-50 rounded-full" />
          <div className="h-2 w-full bg-zinc-50 rounded-full" />
          <div className="h-2 w-5/6 bg-zinc-50 rounded-full" />
          <div className="h-2 w-full bg-zinc-50 rounded-full" />
          <div className="h-2 w-4/5 bg-zinc-50 rounded-full" />

          {isPpt && (
            <div className="mt-2 h-16 w-full bg-orange-50 rounded border border-orange-100" />
          )}
        </div>
      </div>

      {/* Decorative Background Icon */}
      <div className="absolute -bottom-4 -right-4 opacity-[0.05] z-0">
        <FileText className="h-40 w-40" />
      </div>
    </div>
  );
}
