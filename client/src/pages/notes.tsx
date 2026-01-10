import { useState } from "react";
import { useClassroom, getTextColor } from "@/lib/classroom-context";
import { Card, CardHeader } from "@/components/ui/card";
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
  Search,
  Star,
  Download,
  MoreHorizontal,
  DownloadCloud,
  MousePointerClick,
  Filter,
  Settings2,
  Info,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("notes_view_mode");
    return (saved as "grid" | "list") || "grid";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<
    "all" | "lectures" | "assignments" | "lab" | "starred"
  >("all");

  const [starredDocs, setStarredDocs] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("starred_notes");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const isMobile = useIsMobile();

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newStarred = new Set(starredDocs);
    if (newStarred.has(id)) newStarred.delete(id);
    else newStarred.add(id);
    setStarredDocs(newStarred);
    localStorage.setItem(
      "starred_notes",
      JSON.stringify(Array.from(newStarred))
    );
  };

  const getDocCount = (courseId: string) => {
    return materials
      .filter((m: any) => m.courseId === courseId)
      .flatMap((m: any) => m.materials || [])
      .filter((m: any) => m.driveFile).length;
  };

  const selectedCourse = courses.find((c: any) => c.id === selectedCourseId);
  const courseMaterials = materials.filter(
    (m: any) => m.courseId === selectedCourseId
  );

  // Filter for PDF and PPT materials
  const courseDocuments = courseMaterials
    .flatMap((cm: any) => {
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
    .filter((file: any) => {
      // Allow all files that have a title
      return !!file.title;
    });

  // Filter and Search logic
  const filteredCourseDocuments = courseDocuments.filter((doc: any) => {
    const title = doc.title.toLowerCase();
    const matchesSearch = title.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeGroup === "all") return true;
    if (activeGroup === "starred") return starredDocs.has(doc.id);
    if (activeGroup === "lectures")
      return (
        title.includes("lecture") ||
        title.includes("module") ||
        title.includes("unit")
      );
    if (activeGroup === "assignments")
      return (
        title.includes("assignment") ||
        title.includes("task") ||
        title.includes("hw")
      );
    if (activeGroup === "lab")
      return (
        title.includes("lab") ||
        title.includes("manual") ||
        title.includes("exp")
      );

    return true;
  });

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
              {courses.map((course: any) => (
                <Tooltip key={course.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSelectedCourseId(course.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-all group flex items-center gap-3 outline-none focus:ring-2 focus:ring-primary/10",
                        selectedCourseId === course.id
                          ? "bg-primary/5 text-primary"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0 transition-colors",
                          selectedCourseId === course.id
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                        )}
                      />
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium truncate",
                            selectedCourseId === course.id
                              ? "font-semibold"
                              : ""
                          )}
                        >
                          {course.name}
                        </span>
                        {getDocCount(course.id) > 0 && (
                          <span className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">
                            {getDocCount(course.id)}
                          </span>
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-sans text-xs">
                    <p>{course.name}</p>
                    <p className="text-[10px] text-muted-foreground opacity-80">
                      {course.section}
                    </p>
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
                  Choose a course from the listing to access your synchronized
                  PDF lecture records and study guides.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in fade-in duration-500">
              {/* Sticky Course Header */}
              <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-4 md:px-8 space-y-4 shadow-sm">
                {/* Top Row: Title & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-8 md:py-5">
                  <div className="space-y-1 min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
                      {selectedCourse?.name}
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted/40 px-1.5 py-0.5 rounded text-[10px]">
                        {selectedCourse?.section || "CSL605"}
                      </span>
                      <span>·</span>
                      <span>{courseDocuments.length} Documents</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                    {/* Search & View Toggle Group */}
                    <div className="flex items-center bg-muted/40 rounded-lg p-1 border border-border/40 shadow-sm w-full md:w-auto">
                      <div className="relative flex-1 md:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          placeholder="Search..."
                          className="w-full pl-8 pr-8 h-8 text-xs bg-transparent border-none rounded-md focus:outline-none placeholder:text-muted-foreground/50"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="w-[1px] h-4 bg-border/60 mx-1" />
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded-sm hover:bg-background/50",
                            viewMode === "grid"
                              ? "text-primary bg-background shadow-sm"
                              : "text-muted-foreground"
                          )}
                          onClick={() => {
                            setViewMode("grid");
                            localStorage.setItem("notes_view_mode", "grid");
                          }}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded-sm hover:bg-background/50",
                            viewMode === "list"
                              ? "text-primary bg-background shadow-sm"
                              : "text-muted-foreground"
                          )}
                          onClick={() => {
                            setViewMode("list");
                            localStorage.setItem("notes_view_mode", "list");
                          }}
                        >
                          <List className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs Row */}
                <div className="px-4 md:px-8 pb-0">
                  <Tabs
                    value={activeGroup}
                    onValueChange={(v: any) => setActiveGroup(v)}
                    className="w-full"
                  >
                    {/* Undergraduate style tabs: text with active indicator */}
                    <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start overflow-x-auto no-scrollbar border-b border-transparent">
                      <TabsTrigger
                        value="all"
                        className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 font-medium text-xs text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground bg-transparent transition-none data-[state=active]:shadow-none hover:text-foreground"
                      >
                        All
                      </TabsTrigger>
                      <TabsTrigger
                        value="lectures"
                        className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 font-medium text-xs text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground bg-transparent transition-none data-[state=active]:shadow-none hover:text-foreground"
                      >
                        Lectures
                      </TabsTrigger>
                      <TabsTrigger
                        value="assignments"
                        className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 font-medium text-xs text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground bg-transparent transition-none data-[state=active]:shadow-none hover:text-foreground"
                      >
                        Assignments
                      </TabsTrigger>
                      <TabsTrigger
                        value="lab"
                        className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 font-medium text-xs text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground bg-transparent transition-none data-[state=active]:shadow-none hover:text-foreground"
                      >
                        Labs
                      </TabsTrigger>
                      <TabsTrigger
                        value="starred"
                        className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 font-medium text-xs text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground bg-transparent transition-none data-[state=active]:shadow-none hover:text-foreground flex items-center gap-1.5"
                      >
                        <Star className="h-3 w-3 mb-0.5" />
                        Starred
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="p-4 md:p-8 flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto">
                  {filteredCourseDocuments.length > 0 ? (
                    <div className="pb-20">
                      <div
                        className={cn(
                          viewMode === "grid"
                            ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                            : "flex flex-col gap-2"
                        )}
                      >
                        {filteredCourseDocuments.map(
                          (doc: any, idx: number) => {
                            const lower = doc.title?.toLowerCase() || "";
                            const isPdf = lower.endsWith(".pdf");
                            const isPpt =
                              lower.endsWith(".ppt") || lower.endsWith(".pptx");
                            const isStarred = starredDocs.has(doc.id);

                            let typeColor =
                              "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
                            let typeLabel = "FILE";

                            if (isPdf) {
                              typeColor =
                                "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400";
                              typeLabel = "PDF";
                            } else if (isPpt) {
                              typeColor =
                                "bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400";
                              typeLabel = "SLIDES";
                            } else {
                              typeColor =
                                "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400";
                              typeLabel = "DOC";
                            }

                            if (viewMode === "grid") {
                              return (
                                <a
                                  key={`${doc.id}-${idx}`}
                                  href={doc.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block group outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl h-full"
                                >
                                  <Card className="relative overflow-hidden transition-all duration-200 border-border/40 bg-card hover:bg-card hover:shadow-md hover:border-primary/20 flex flex-col h-full rounded-xl">
                                    {/* Preview */}
                                    <div className="aspect-[4/3] w-full bg-muted/30 relative overflow-hidden border-b border-border/30">
                                      {doc.thumbnail ? (
                                        <img
                                          src={
                                            doc.thumbnail.includes("s220")
                                              ? doc.thumbnail.replace(
                                                  "s220",
                                                  "s400"
                                                )
                                              : doc.thumbnail
                                          }
                                          alt={doc.title}
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <MockDocViewer
                                            type={
                                              isPdf
                                                ? "pdf"
                                                : isPpt
                                                ? "ppt"
                                                : "doc"
                                            }
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-3 flex flex-col flex-1 gap-1.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div
                                          className={cn(
                                            "flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold uppercase tracking-wider",
                                            typeColor
                                              .split(" ")
                                              .filter((c) =>
                                                c.startsWith("bg-")
                                              )
                                              .join(" ")
                                          )}
                                        >
                                          <FileText
                                            className={cn(
                                              "h-3 w-3",
                                              typeColor
                                                .split(" ")
                                                .filter((c) =>
                                                  c.startsWith("text-")
                                                )
                                                .join(" ")
                                            )}
                                          />
                                        </div>
                                        {/* Simple Star Action */}
                                        <button
                                          onClick={(e) => toggleStar(doc.id, e)}
                                          className={cn(
                                            "opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-0.5 rounded hover:bg-muted",
                                            isStarred
                                              ? "opacity-100 text-amber-500"
                                              : "text-muted-foreground/40"
                                          )}
                                        >
                                          <Star
                                            className={cn(
                                              "h-3.5 w-3.5",
                                              isStarred && "fill-current"
                                            )}
                                          />
                                        </button>
                                      </div>
                                      <h4 className="text-xs md:text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                        {doc.title}
                                      </h4>
                                      <div className="mt-auto pt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground/60 font-mono uppercase tracking-wider">
                                        <span>{typeLabel}</span>
                                      </div>
                                    </div>
                                  </Card>
                                </a>
                              );
                            }

                            // List View Item
                            return (
                              <a
                                key={`${doc.id}-${idx}`}
                                href={doc.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                              >
                                <div className="flex items-center gap-3 p-2 rounded-lg border border-transparent hover:bg-card hover:border-border/40 hover:shadow-sm transition-all">
                                  {/* Thumbnail */}
                                  <div className="h-10 w-10 shrink-0 rounded bg-muted/30 border border-border/30 overflow-hidden flex items-center justify-center">
                                    {doc.thumbnail ? (
                                      <img
                                        src={doc.thumbnail}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <FileText
                                        className={cn(
                                          "h-4 w-4",
                                          typeColor
                                            .split(" ")
                                            .filter((c) =>
                                              c.startsWith("text-")
                                            )
                                            .join(" ")
                                        )}
                                      />
                                    )}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                    <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                      {doc.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                                      <span className="font-bold uppercase tracking-wider">
                                        {typeLabel}
                                      </span>
                                      <span>·</span>
                                      <span>Academic Resource</span>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 pr-2">
                                    <button
                                      onClick={(e) => toggleStar(doc.id, e)}
                                      className={cn(
                                        "p-1.5 rounded-md hover:bg-muted transition-colors",
                                        isStarred
                                          ? "text-amber-500"
                                          : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                                      )}
                                    >
                                      <Star
                                        className={cn(
                                          "h-4 w-4",
                                          isStarred && "fill-current"
                                        )}
                                      />
                                    </button>
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                                  </div>
                                </div>
                              </a>
                            );
                          }
                        )}
                      </div>
                      {filteredCourseDocuments.length < 5 &&
                        !searchQuery &&
                        activeGroup === "all" && (
                          <div className="mt-12 flex flex-col items-center justify-center py-10 border-t border-border/10 bg-gradient-to-b from-transparent to-muted/5 rounded-3xl">
                            <p className="text-xs font-bold text-muted-foreground/40 italic uppercase tracking-widest">
                              More resources will appear here as your teacher
                              uploads them
                            </p>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 max-w-2xl mx-auto space-y-6">
                      <div className="relative">
                        <div className="h-24 w-24 bg-muted/20 border-2 border-dashed border-border rounded-full flex items-center justify-center">
                          <Folder className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-background p-1.5 rounded-full border border-border shadow-sm">
                          <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-black tracking-tight text-foreground uppercase italic underline decoration-primary/30 underline-offset-8">
                          {searchQuery
                            ? "No results matching"
                            : activeGroup === "starred"
                            ? "No starred items"
                            : activeGroup === "lectures"
                            ? "No lectures uploaded yet"
                            : activeGroup === "assignments"
                            ? "No assignments uploaded yet"
                            : activeGroup === "lab"
                            ? "No lab manuals uploaded yet"
                            : "No resources yet"}
                        </h4>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
                          {searchQuery || activeGroup !== "all"
                            ? "Try adjusting your search or filters to find what you're looking for."
                            : "Your teacher will add materials here. Check back soon!"}
                        </p>
                        {(searchQuery || activeGroup !== "all") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 gap-2 border-primary/20 text-primary hover:bg-primary/5"
                            onClick={() => {
                              setSearchQuery("");
                              setActiveGroup("all");
                            }}
                          >
                            <X className="h-4 w-4" />
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
          {[1, 2, 3, 4, 5, 6].map((i: number) => (
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
    ? "bg-[#FFEEEE] dark:bg-red-950/20"
    : isPpt
    ? "bg-[#FFF4E5] dark:bg-orange-950/20"
    : "bg-[#E8F0FE] dark:bg-blue-950/20";

  return (
    <div
      className={cn(
        "w-full h-full p-4 flex flex-col relative overflow-hidden select-none pointer-events-none",
        bgClass
      )}
    >
      <div className="w-full h-full bg-background shadow-lg rounded-md border border-border p-4 flex flex-col gap-3 relative z-10">
        <div className="flex gap-2 mb-1">
          <div
            className={cn(
              "h-10 w-10 rounded-lg shrink-0 flex items-center justify-center mb-1 shadow-sm",
              isPdf
                ? "bg-red-100 text-red-500 dark:bg-red-900/40"
                : isPpt
                ? "bg-orange-100 text-orange-500 dark:bg-orange-900/40"
                : "bg-blue-100 text-blue-500 dark:bg-blue-900/40"
            )}
          >
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1 pt-1 opacity-20">
            <div className="h-2.5 w-3/4 bg-foreground rounded-full" />
            <div className="h-1.5 w-1/2 bg-foreground rounded-full" />
          </div>
        </div>
        <div className="space-y-2 flex-1 opacity-[0.05]">
          <div className="h-1.5 w-full bg-foreground rounded-full" />
          <div className="h-1.5 w-full bg-foreground rounded-full" />
          <div className="h-1.5 w-5/6 bg-foreground rounded-full" />
          <div className="h-1.5 w-full bg-foreground rounded-full" />
          {isPpt && (
            <div className="mt-2 h-16 w-full bg-muted rounded border border-border" />
          )}
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 opacity-[0.03] z-0">
        <FileText className="h-40 w-40" />
      </div>
    </div>
  );
}
