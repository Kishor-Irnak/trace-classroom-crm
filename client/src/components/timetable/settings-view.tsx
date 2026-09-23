import { useState } from "react";
import { Plus, Trash2, Settings, MoreVertical, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DAY_NAMES,
  SLOT_DURATION_OPTIONS,
  genId,
  toMinutes,
  fromMinutes,
  type TimeBlock,
} from "@/services/timetable-service";
import { useTimetableStore } from "./timetable-store";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { settings, updateSettings } = useTimetableStore();
  const isCustom = !SLOT_DURATION_OPTIONS.some((o) => o.value === settings.defaultLectureDuration);

  const [addBreakOpen, setAddBreakOpen] = useState(false);
  const [addCustomSlotOpen, setAddCustomSlotOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const [breakForm, setBreakForm] = useState({ name: "Short Break", start: "11:15", end: "11:30" });
  const [customSlotForm, setCustomSlotForm] = useState<{ type: "lecture" | "break"; name: string; start: string; end: string }>({ type: "lecture", name: "", start: "11:30", end: "12:30" });

  const toggleDay = (day: number, checked: boolean) => {
    const set = new Set(settings.workingDays);
    if (checked) set.add(day);
    else set.delete(day);
    updateSettings({ workingDays: Array.from(set).sort((a, b) => a - b) });
  };

  const removeBlock = (id: string) => {
    updateSettings({ timeStructure: (settings.timeStructure || []).filter((b) => b.id !== id) });
  };

  const handleAddBreak = () => {
    const b: TimeBlock = {
      id: genId(),
      type: "break",
      name: breakForm.name,
      startTime: breakForm.start,
      endTime: breakForm.end,
    };
    const newStructure = [...(settings.timeStructure || []), b].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    updateSettings({ timeStructure: newStructure });
    setAddBreakOpen(false);
  };

  const handleAddCustomSlot = () => {
    const b: TimeBlock = {
      id: genId(),
      type: customSlotForm.type,
      name: customSlotForm.type === "break" ? customSlotForm.name : undefined,
      startTime: customSlotForm.start,
      endTime: customSlotForm.end,
    };
    const newStructure = [...(settings.timeStructure || []), b].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    updateSettings({ timeStructure: newStructure });
    setAddCustomSlotOpen(false);
  };

  const generateSlots = () => {
    const start = toMinutes(settings.startTime);
    const end = toMinutes(settings.endTime);
    const dur = settings.defaultLectureDuration > 0 ? settings.defaultLectureDuration : 60;
    
    const structure: TimeBlock[] = [];
    let current = start;
    
    while (current < end) {
      const isOvershoot = current + dur > end;
      structure.push({
        id: genId(),
        type: "lecture",
        startTime: fromMinutes(current),
        endTime: fromMinutes(isOvershoot ? end : current + dur),
      });
      current += dur;
    }
    
    updateSettings({ timeStructure: structure });
    setGenerateOpen(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working Days</CardTitle>
          <CardDescription>Which days appear as columns in the grid.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={settings.workingDays.includes(d)}
                onCheckedChange={(c) => toggleDay(d, c === true)}
              />
              {DAY_NAMES[d]}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working Hours</CardTitle>
          <CardDescription>Defines the start and end of the working day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input
                type="time"
                value={settings.startTime}
                onChange={(e) => updateSettings({ startTime: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input
                type="time"
                value={settings.endTime}
                onChange={(e) => updateSettings({ endTime: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5 pt-2">
            <Label>Default Lecture Duration</Label>
            <div className="flex gap-2">
              <Select
                value={isCustom ? "custom" : String(settings.defaultLectureDuration)}
                onValueChange={(v) => {
                  if (v !== "custom") updateSettings({ defaultLectureDuration: Number(v) });
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {isCustom && (
                <Input
                  type="number"
                  min={10}
                  max={180}
                  value={settings.defaultLectureDuration}
                  onChange={(e) =>
                    updateSettings({ defaultLectureDuration: Number(e.target.value) || 60 })
                  }
                  className="w-24"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Time Structure</CardTitle>
            <CardDescription>
              Define your dynamic schedule: lectures, practicals, and breaks.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Generate Slots
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAddBreakOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Break
            </Button>
            <Button size="sm" onClick={() => setAddCustomSlotOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(settings.timeStructure || []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
              No time slots configured. Generate slots or add them manually.
            </div>
          ) : (
            <div className="flex flex-col rounded-lg border">
              {(settings.timeStructure || []).map((b, i) => {
                const isBreak = b.type === "break";
                const dur = toMinutes(b.endTime) - toMinutes(b.startTime);
                const isInvalid = !isBreak && dur !== settings.defaultLectureDuration;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "flex items-center justify-between p-3 text-sm",
                      i !== (settings.timeStructure || []).length - 1 && "border-b",
                      isBreak ? "bg-muted/50 text-muted-foreground font-medium" : "bg-card"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-32 tabular-nums">
                        {b.startTime} &ndash; {b.endTime}
                      </span>
                      <span className="w-24 text-muted-foreground">
                        {dur} mins
                      </span>
                      <span>
                        {isBreak ? b.name || "Break" : "Lecture"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {isInvalid && (
                        <span className="text-xs text-destructive">
                          Duration mismatch
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => removeBlock(b.id)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Break Dialog */}
      <Dialog open={addBreakOpen} onOpenChange={setAddBreakOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Break</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Break Name</Label>
              <Input
                value={breakForm.name}
                onChange={(e) => setBreakForm({ ...breakForm, name: e.target.value })}
                placeholder="e.g., Lunch Break"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={breakForm.start}
                  onChange={(e) => setBreakForm({ ...breakForm, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={breakForm.end}
                  onChange={(e) => setBreakForm({ ...breakForm, end: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBreakOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBreak}>Add Break</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Slot Dialog */}
      <Dialog open={addCustomSlotOpen} onOpenChange={setAddCustomSlotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Slot</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Slot Type</Label>
              <Select
                value={customSlotForm.type}
                onValueChange={(v: "lecture" | "break") => setCustomSlotForm({ ...customSlotForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecture">Lecture / Practical</SelectItem>
                  <SelectItem value="break">Break</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {customSlotForm.type === "break" && (
              <div className="space-y-2">
                <Label>Break Name</Label>
                <Input
                  value={customSlotForm.name}
                  onChange={(e) => setCustomSlotForm({ ...customSlotForm, name: e.target.value })}
                  placeholder="e.g., Short Break"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={customSlotForm.start}
                  onChange={(e) => setCustomSlotForm({ ...customSlotForm, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={customSlotForm.end}
                  onChange={(e) => setCustomSlotForm({ ...customSlotForm, end: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCustomSlotOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCustomSlot}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Slots Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Time Structure</DialogTitle>
            <DialogDescription>
              This will overwrite your current time structure with sequential slots based on your Working Hours ({settings.startTime} &ndash; {settings.endTime}) and Default Lecture Duration ({settings.defaultLectureDuration} mins).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={generateSlots}>Generate Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
