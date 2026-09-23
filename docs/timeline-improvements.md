# Timeline View Improvements

## Overview

Enhanced the timeline view with better task visibility and zoom controls for improved user experience.

## Changes Made

### 1. **Auto-Scroll to Nearest Task**

- **Problem**: Users had to manually scroll to find their tasks when opening the timeline
- **Solution**: Timeline now automatically scrolls to the nearest upcoming assignment
- **Fallback**: If no upcoming assignments, scrolls to today's date
- **Implementation**:
  - Finds all assignments with due dates >= today
  - Sorts by due date
  - Centers the view on the nearest upcoming task

### 2. **Zoom Controls**

Added a floating control panel at the bottom-right corner with:

#### Zoom In/Out Buttons

- **Range**: 50% to 200% (0.5x to 2x)
- **Increment**: 25% per click
- **Icons**: ZoomIn and ZoomOut from lucide-react
- **Behavior**:
  - Zoom In: Increases dayWidth, making timeline more detailed
  - Zoom Out: Decreases dayWidth, showing more days at once
  - Buttons disable at min/max zoom levels

#### Compact View Toggle

- **Icon**: Minimize2 from lucide-react
- **Normal View**:
  - Task height: 48px (h-12)
  - Container height: 56px (h-14)
  - Spacing: 12px (space-y-3)
  - Shows course name below title
  - Min width: 140px
- **Compact View**:
  - Task height: 32px (h-8)
  - Container height: 36px (h-9)
  - Spacing: 4px (space-y-1)
  - Hides course name (title only)
  - Min width: 100px
  - Smaller icons (h-2.5 w-2.5)
  - Smaller text (text-[10px])

#### Zoom Level Indicator

- Shows current zoom percentage (50% - 200%)
- Monospace font for better readability
- Updates in real-time

### 3. **Design Consistency**

All controls match the app's minimal theme:

- **Colors**: zinc-950, zinc-200, zinc-100, zinc-50
- **Borders**: border-zinc-200
- **Shadows**: shadow-lg for panel, shadow-sm for indicator
- **Background**: white with subtle borders
- **Hover states**: hover:bg-zinc-50
- **Active state**: bg-zinc-100 for compact view toggle

## User Experience Improvements

### Before:

- ❌ Users had to scroll horizontally to find tasks
- ❌ Fixed zoom level (couldn't see overview or details)
- ❌ No way to compress view for better overview
- ❌ Timeline always centered on "today" even if no tasks nearby

### After:

- ✅ Automatically shows nearest upcoming task
- ✅ Zoom in for detailed view (200%)
- ✅ Zoom out for overview (50%)
- ✅ Compact mode to see more tasks at once
- ✅ Visual feedback with zoom percentage
- ✅ Smooth transitions and hover states

## Technical Details

### State Management

```typescript
const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2
const [compactView, setCompactView] = useState(false);
```

### Dynamic Day Width

```typescript
const baseDayWidth = 60;
const dayWidth = baseDayWidth * zoomLevel; // 30px to 120px
```

### Smart Scroll Position

```typescript
// Find nearest upcoming assignment
const upcomingAssignments = filteredAssignments
  .filter((a) => a.dueDate && new Date(a.dueDate) >= today)
  .sort(
    (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
  );

let scrollTarget =
  upcomingAssignments.length > 0
    ? new Date(upcomingAssignments[0].dueDate!)
    : today;
```

## Usage

1. **Zoom In**: Click the + button or use it to see task details better
2. **Zoom Out**: Click the - button to see more days at once
3. **Compact View**: Click the minimize icon to fit more tasks vertically
4. **Auto-Scroll**: Opens automatically centered on your next task

## Future Enhancements

Potential improvements:

- Keyboard shortcuts (Ctrl +/- for zoom)
- Pinch-to-zoom on mobile/trackpad
- Save zoom preference to localStorage
- Zoom to fit all tasks
- Custom zoom levels (dropdown)
