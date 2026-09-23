import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertDialogContent2,
  AlertDialogDescription as AlertDialogDescription2,
  AlertDialogFooter as AlertDialogFooter2,
  AlertDialogHeader as AlertDialogHeader2,
  AlertDialogTitle as AlertDialogTitle2,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  colorHex,
  hexToRgba,
  type Lecture,
  type Subject,
} from "@/services/timetable-service";
import {
  TimetableStoreProvider,
  useTimetableStore,
} from "@/components/timetable/timetable-store";
import {
  ContextSelector,
  TimetableHeader,
  TimetableTabs,
} from "@/components/timetable/timetable-controls";
import { SubjectPanel } from "@/components/timetable/subject-panel";
import { WeeklyGrid } from "@/components/timetable/weekly-grid";
import { SubjectDialog } from "@/components/timetable/subject-dialog";
import {
  DuplicateDialog,
  LectureEditorDialog,
  MoveDialog,
} from "@/components/timetable/lecture-dialogs";
import { PreviewDialog } from "@/components/timetable/preview-dialog";
import { ListView } from "@/components/timetable/list-view";
import { SettingsView } from "@/components/timetable/settings-view";
import { MobileTimetable } from "@/components/timetable/mobile-timetable";
import {
  ClearAllConfirmDialog,
  PublishConfirmDialog,
  RemoveSubjectConfirmDialog,
  UnsavedChangesDialog,
} from "@/components/timetable/confirm-dialogs";

interface ActiveDrag {
  kind: "subject" | "lecture";
  label: string;
  sub: string;
  color: string;
}

export default function TimetablePage() {
  return (
    <TimetableStoreProvider>
      <TimetableInner />
    </TimetableStoreProvider>
  );
}

function TimetableInner() {
  const store = useTimetableStore();
  const isMobile = useIsMobile();
  const {
    timetable,
    subjects,
    lectures,
    settings,
    loading,
    viewMode,
    addLecture,
    moveLecture,
    deleteLecture,
  } = store;

  // modal state
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [removeSubject, setRemoveSubject] = useState<Subject | null>(null);
  const [lectureEditor, setLectureEditor] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [preset, setPreset] = useState<{ day: number; start: string } | null>(
    null,
  );
  const [dupLecture, setDupLecture] = useState<Lecture | null>(null);
  const [moveTarget, setMoveTarget] = useState<Lecture | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lecture | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [changeCtxOpen, setChangeCtxOpen] = useState(false);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const openAddSubject = () => {
    setEditingSubject(null);
    setSubjectDialog(true);
  };
  const openEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setSubjectDialog(true);
  };
  const openEditLecture = (l: Lecture) => {
    setEditingLecture(l);
    setPreset(null);
    setLectureEditor(true);
  };
  const openQuickAdd = (day: number, start: string) => {
    setEditingLecture(null);
    setPreset({ day, start });
    setLectureEditor(true);
  };

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (!data) return;
    if (data.kind === "subject") {
      const s = subjects.find((x) => x.id === data.subjectId);
      if (s)
        setActiveDrag({
          kind: "subject",
          label: s.name,
          sub: s.teacherName,
          color: colorHex(s.color),
        });
    } else if (data.kind === "lecture") {
      const l = lectures.find((x) => x.id === data.lectureId);
      if (l) {
        const s = subjects.find((x) => x.id === l.subjectId);
        setActiveDrag({
          kind: "lecture",
          label: l.subjectName,
          sub: l.teacherName,
          color: colorHex(s?.color || "blue"),
        });
      }
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;
    const aData = active.data.current;
    const oData = over.data.current;
    if (!aData || !oData || oData.kind !== "cell") return;

    const day = oData.day as number;
    const start = oData.start as string;

    if (aData.kind === "subject") {
      addLecture({
        subjectId: aData.subjectId as string,
        dayOfWeek: day,
        startTime: start,
      });
    } else if (aData.kind === "lecture") {
      moveLecture(aData.lectureId as string, day, start);
    }
  };

  /* ---------------- Mobile ---------------- */
  if (isMobile) {
    return (
      <>
        <MobileTimetable
          onEditLecture={openEditLecture}
          onMoveLecture={(l) => setMoveTarget(l)}
          onDeleteLecture={(l) => setDeleteTarget(l)}
          onPreview={() => setPreviewOpen(true)}
          onSaveDraft={() => store.saveDraft()}
          onPublish={() => setPublishOpen(true)}
          onChangeContext={() => setChangeCtxOpen(true)}
        />

        <Dialog open={changeCtxOpen} onOpenChange={setChangeCtxOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Class</DialogTitle>
              <DialogDescription>Select the class context.</DialogDescription>
            </DialogHeader>
            <ContextSelector />
          </DialogContent>
        </Dialog>

        {renderModals()}
      </>
    );
  }

  /* ---------------- Desktop ---------------- */
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <TimetableHeader
        onPreview={() => setPreviewOpen(true)}
        onSaveDraft={() => store.saveDraft()}
        onPublish={() => setPublishOpen(true)}
      />

      <ContextSelector />

      <TimetableTabs onClearAll={() => setClearAllOpen(true)} />

      {loading || !timetable ? (
        <LoadingGrid />
      ) : viewMode === "settings" ? (
        <SettingsView />
      ) : viewMode === "list" ? (
        <ListView
          onEdit={openEditLecture}
          onDelete={(l) => setDeleteTarget(l)}
        />
      ) : subjects.length === 0 ? (
        <EmptyState onAddSubject={openAddSubject} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveDrag(null)}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <WeeklyGrid
                settings={settings}
                lectures={lectures}
                subjects={subjects}
                onEdit={openEditLecture}
                onDuplicate={(l) => setDupLecture(l)}
                onMove={(l) => setMoveTarget(l)}
                onDelete={(l) => setDeleteTarget(l)}
                onQuickAdd={openQuickAdd}
              />
            </div>
            <div className="w-full shrink-0 lg:w-80">
              <SubjectPanel
                onAddSubject={openAddSubject}
                onEditSubject={openEditSubject}
                onRemoveSubject={(s) => setRemoveSubject(s)}
              />
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeDrag && (
              <div
                className="w-40 rounded-md border border-transparent border-l-[3px] p-2 shadow-lg"
                style={{
                  borderLeftColor: activeDrag.color,
                  backgroundColor: hexToRgba(activeDrag.color, 0.15),
                }}
              >
                <p className="truncate text-xs font-semibold">
                  {activeDrag.label}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {activeDrag.sub}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {renderModals()}
    </div>
  );

  function renderModals() {
    return (
      <>
        <SubjectDialog
          open={subjectDialog}
          onOpenChange={setSubjectDialog}
          editing={editingSubject}
        />
        <RemoveSubjectConfirmDialog
          subject={removeSubject}
          onOpenChange={(o) => {
            if (!o) setRemoveSubject(null);
          }}
        />
        <LectureEditorDialog
          open={lectureEditor}
          onOpenChange={setLectureEditor}
          lecture={editingLecture}
          preset={preset}
        />
        <DuplicateDialog
          open={!!dupLecture}
          onOpenChange={(o) => {
            if (!o) setDupLecture(null);
          }}
          lecture={dupLecture}
        />
        <MoveDialog
          open={!!moveTarget}
          onOpenChange={(o) => {
            if (!o) setMoveTarget(null);
          }}
          lecture={moveTarget}
        />
        <PreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          timetable={timetable}
        />
        <PublishConfirmDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
        />
        <ClearAllConfirmDialog
          open={clearAllOpen}
          onOpenChange={setClearAllOpen}
        />

        {/* Delete lecture confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent2>
            <AlertDialogHeader2>
              <AlertDialogTitle2>Delete lecture?</AlertDialogTitle2>
              <AlertDialogDescription2>
                {deleteTarget
                  ? `Remove ${deleteTarget.subjectName} with ${deleteTarget.teacherName} from the timetable?`
                  : ""}
              </AlertDialogDescription2>
            </AlertDialogHeader2>
            <AlertDialogFooter2>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) deleteLecture(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter2>
          </AlertDialogContent2>
        </AlertDialog>

        {store.pendingContext && <UnsavedChangesDialog />}
      </>
    );
  }
}

function EmptyState({ onAddSubject }: { onAddSubject: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <CalendarPlus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Create your first timetable</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Drag subjects into the weekly schedule to build your class timetable.
      </p>
      <Button className="mt-5" onClick={onAddSubject}>
        Add Subject
      </Button>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="h-[520px] animate-pulse rounded-xl border border-border bg-muted/50" />
      </div>
      <div className="w-full shrink-0 lg:w-80">
        <div className="h-[520px] animate-pulse rounded-xl border border-border bg-muted/50" />
      </div>
    </div>
  );
}
