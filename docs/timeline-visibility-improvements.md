# Timeline Task Visibility Improvements

## Problem

Users couldn't see all their tasks without scrolling vertically, and they had no indication that there were more tasks below the viewport. This led to:

- Tasks being hidden at the bottom
- Users not knowing there were more tasks to see
- Poor discoverability of assignments

## Solution

### 1. **Dynamic Container Height**

The timeline now calculates its height based on the number of tasks:

**Normal View:**

```typescript
minHeight = Math.max(400, taskCount * 60) + "px";
```

- Each task needs ~60px of vertical space
- Minimum 400px to ensure proper layout
- Container grows to fit all tasks

**Compact View:**

```typescript
minHeight = Math.max(300, taskCount * 40) + "px";
```

- Each task needs ~40px of vertical space
- Minimum 300px
- More efficient use of space

### 2. **Scroll Indicator**

Added a visual indicator that appears when:

- Content height exceeds viewport height
- User hasn't scrolled to the bottom

**Features:**

- **Position**: Bottom center of screen
- **Animation**: Gentle bounce effect (`animate-bounce`)
- **Message**: "More tasks below" with down arrow
- **Auto-hide**: Disappears when user scrolls to bottom
- **Non-intrusive**: `pointer-events-none` so it doesn't block clicks

**Design:**

- White background with zinc border
- Rounded pill shape
- Subtle shadow
- Matches app's minimal theme

### 3. **Scroll Detection Logic**

```typescript
const checkScroll = () => {
  if (verticalScrollRef.current) {
    const { scrollHeight, clientHeight, scrollTop } = verticalScrollRef.current;

    // Check if content is scrollable
    setHasVerticalScroll(scrollHeight > clientHeight);

    // Check if user is at bottom (with 10px tolerance)
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
  }
};
```

**Triggers:**

- On component mount
- On scroll events
- On window resize
- When task count changes (filteredAssignments)
- When compact view toggles

## User Experience

### Before:

- ❌ Fixed 500px min-height regardless of task count
- ❌ Tasks hidden below fold
- ❌ No indication of hidden content
- ❌ Users had to guess if there were more tasks

### After:

- ✅ **Dynamic height** adapts to task count
- ✅ **Visual indicator** shows when more tasks exist
- ✅ **Auto-scroll** to nearest task on load
- ✅ **Indicator disappears** when at bottom
- ✅ **Responsive** to window resize and view changes

## Technical Implementation

### State Management

```typescript
const [hasVerticalScroll, setHasVerticalScroll] = useState(false);
const [isAtBottom, setIsAtBottom] = useState(false);
const verticalScrollRef = useRef<HTMLDivElement>(null);
```

### Dual Ref Assignment

```typescript
ref={(el) => {
  scrollContainerRef.current = el;  // For horizontal scroll
  verticalScrollRef.current = el;    // For vertical scroll detection
}}
```

### Event Listeners

- `scroll` event on container
- `resize` event on window
- Cleanup on unmount

### Conditional Rendering

```typescript
{
  hasVerticalScroll && !isAtBottom && <ScrollIndicator />;
}
```

## Visual Design

### Scroll Indicator

- **Background**: `bg-white`
- **Border**: `border-zinc-200`
- **Shadow**: `shadow-lg`
- **Padding**: `px-3 py-2`
- **Border Radius**: `rounded-full`
- **Icon**: ArrowDown (4x4, zinc-950)
- **Text**: "More tasks below" (xs, font-medium, zinc-900)
- **Animation**: `animate-bounce`
- **Z-index**: 40 (above tasks, below zoom controls)

### Positioning

- **Bottom**: 96px (24 \* 4) from bottom
- **Horizontal**: Centered (`left-1/2 -translate-x-1/2`)
- **Above**: Zoom controls and footer

## Benefits

1. **Better Discoverability**

   - Users immediately know if there are more tasks
   - Clear visual cue to scroll down

2. **Adaptive Layout**

   - Container grows with content
   - No wasted space with few tasks
   - No cramped layout with many tasks

3. **User Confidence**

   - Indicator confirms they've seen all tasks when it disappears
   - No uncertainty about hidden content

4. **Professional UX**
   - Smooth animations
   - Non-intrusive design
   - Matches app aesthetic

## Edge Cases Handled

1. **No Tasks**: Minimum height prevents empty look
2. **Many Tasks**: Container grows appropriately
3. **Window Resize**: Recalculates scroll state
4. **View Toggle**: Updates when switching compact/normal
5. **Filter Changes**: Recalculates when tasks filtered
6. **At Bottom**: Indicator hides automatically

## Performance

- Event listeners properly cleaned up
- Debounced through React's event system
- Minimal re-renders (only on scroll/resize)
- Efficient DOM measurements
