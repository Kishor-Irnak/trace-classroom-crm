import { useState } from "react";
import { useClassroom } from "@/lib/classroom-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, ExternalLink, ChevronRight, Folder, RefreshCw, ArrowLeft, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useIsMobile } from "@/hooks/use-mobile";

export default function NotesPage() {
  const { courses, materials, isLoading, isSyncing, syncClassroom } = useClassroom();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isMobile = useIsMobile();

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const courseMaterials = materials.filter((m) => m.courseId === selectedCourseId);

  // Filter for PDF materials
  const pdfMaterials = courseMaterials.flatMap((cm) => {
    if (!cm.materials) return [];
    
    return cm.materials.flatMap((m: any) => {
      let files = [];
      if (m.driveFile) {
        files.push({
          id: m.driveFile.driveFile.id,
          title: m.driveFile.driveFile.title,
          link: m.driveFile.driveFile.alternateLink,
          thumbnail: m.driveFile.driveFile.thumbnailUrl,
          type: 'driveFile'
        });
      }
      return files;
    });
  }).filter(file => file.title && file.title.toLowerCase().endsWith('.pdf'));

  if (isLoading && courses.length === 0) {
    return <NotesSkeleton />;
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar: Course List */}
      <div className={cn(
        "w-full md:w-80 border-r bg-muted/20 flex flex-col h-full shrink-0",
        isMobile && selectedCourseId ? "hidden" : "flex"
      )}>
        <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-zinc-950">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-500">Your Courses</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-md transition-all group flex items-center gap-3",
                selectedCourseId === course.id
                  ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-900 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                selectedCourseId === course.id 
                  ? "bg-white/20" 
                  : "bg-zinc-100 dark:bg-zinc-800"
              )}>
                <Folder className={cn(
                  "h-4 w-4",
                  selectedCourseId === course.id ? "text-white dark:text-zinc-900" : "text-zinc-500"
                )} />
              </div>
              <div className="truncate flex-1">
                <p className="text-sm font-semibold leading-none mb-1 truncate">{course.name}</p>
                <p className={cn(
                  "text-[10px] uppercase tracking-wider font-medium",
                  selectedCourseId === course.id ? "text-white/70 shadow-sm" : "text-zinc-400"
                )}>
                  {course.section || "No Section"}
                </p>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                selectedCourseId === course.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
              )} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Notes View */}
      <div className={cn(
        "flex-1 overflow-y-auto bg-white dark:bg-zinc-950",
        isMobile && !selectedCourseId ? "hidden" : "flex flex-col"
      )}>
        {isMobile && selectedCourseId && (
          <div className="flex items-center p-4 border-b bg-white dark:bg-zinc-950 sticky top-0 z-10">
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
            <div className="h-24 w-24 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Select a curriculum</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mt-2">
                Choose a course from the listing to accessibility your synchronized PDF lecture records and study guides.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-6 border-zinc-100 dark:border-zinc-800 gap-4">
              <div className="space-y-1 max-w-full">
                <Badge variant="outline" className="text-[10px] font-mono tracking-[0.2em] font-bold uppercase py-0 px-2 rounded-sm border-zinc-200">
                  Course Resources
                </Badge>
                <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase italic break-words leading-tight">
                  {selectedCourse?.name}
                </h1>
                <p className="text-xs md:text-sm font-medium text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {selectedCourse?.descriptionHeading || "Curated academic materials and notes."}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{pdfMaterials.length} PDF Assets</span>
                </div>
                <div className="flex bg-muted rounded-md p-1 border">
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-6 w-6 rounded-sm", viewMode === "grid" && "bg-background shadow-sm")}
                      onClick={() => setViewMode("grid")}
                   >
                      <LayoutGrid className="h-4 w-4" />
                   </Button>
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-6 w-6 rounded-sm", viewMode === "list" && "bg-background shadow-sm")}
                      onClick={() => setViewMode("list")}
                   >
                      <List className="h-4 w-4" />
                   </Button>
                </div>
              </div>
            </div>

            {pdfMaterials.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20">
                  {pdfMaterials.map((pdf, idx) => (
                    <Card key={`${pdf.id}-${idx}`} className="group relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg" asChild>
                          <a href={pdf.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                      
                      <CardHeader className="p-0 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center overflow-hidden relative group-hover:bg-zinc-100 transition-colors">
                          <FileText className="h-16 w-16 text-zinc-200 dark:text-zinc-800 transition-transform group-hover:scale-110 duration-500" />
                          <div className="absolute bottom-3 left-3 flex gap-1">
                             <Badge className="bg-red-500 hover:bg-red-600 text-[9px] font-black italic rounded-sm">PDF</Badge>
                             <Badge variant="outline" className="bg-white/80 dark:bg-black/80 backdrop-blur text-[9px] font-black rounded-sm border-zinc-200 dark:border-zinc-700">READONLY</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="p-5 space-y-4">
                        <h4 className="font-bold text-sm tracking-tight leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                          {pdf.title}
                        </h4>
                        <div className="pt-4 flex items-center justify-between border-t border-zinc-5 dark:border-zinc-800/50">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                            Secured Asset
                          </span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            asChild 
                            className="h-8 text-[11px] font-black uppercase tracking-tighter hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md"
                          >
                            <a href={pdf.link} target="_blank" rel="noopener noreferrer">
                              Open Material
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 pb-20">
                  {pdfMaterials.map((pdf, idx) => (
                    <div 
                        key={`${pdf.id}-${idx}`}
                        className="group flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                        <div className="h-10 w-10 flex items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-red-500 shrink-0">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                {pdf.title}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                                PDF Document • Read Only
                            </p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            asChild
                            className="shrink-0"
                        >
                            <a href={pdf.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <span className="hidden sm:inline text-xs font-medium">Open</span>
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-center border-4 border-dotted rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 max-w-2xl mx-auto space-y-4">
                <div className="h-20 w-20 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-inner border border-zinc-100 dark:border-zinc-800">
                  <Folder className="h-8 w-8 text-zinc-200 dark:text-zinc-700" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">No PDF Documents Found</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs mx-auto font-medium">
                    This course has no PDF files uploaded to Classroom yet. Make sure your materials are in .pdf format.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 border-r bg-muted/20 p-6 space-y-6">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3, 4, 5].map(i => (
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
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
