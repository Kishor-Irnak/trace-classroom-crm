# Design Guidelines: Student CRM for Google Classroom

## Design Approach

**Selected Approach:** Design System with Industry References (Hybrid)

**Primary References:** Linear (project management), Attio (CRM), Notion (productivity)

**Justification:** This is a utility-focused productivity tool requiring information density, clarity, and speed. The monochrome constraint and need for fast data processing align with Linear's minimalist approach while supporting high-volume task management similar to Attio's CRM interface.

**Core Principles:**
- Information density without clutter
- Minimal chrome, maximum clarity
- Speed-optimized interactions
- Keyboard-first navigation
- Whitespace as hierarchy tool

---

## Typography System

**Font Stack:**
- Primary: Inter or System UI stack (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)
- Monospace: JetBrains Mono or SF Mono (for assignment IDs, dates, grades)

**Hierarchy:**
- Page Titles: 24px/32px, semibold (600)
- Section Headers: 18px/24px, medium (500)
- Card Titles: 14px/20px, medium (500)
- Body Text: 14px/20px, regular (400)
- Metadata/Labels: 12px/16px, regular (400)
- Small Text: 11px/14px, regular (400) for timestamps, tags

**Treatment:**
- Use letter-spacing: -0.01em for headings
- Apply font-feature-settings: "tnum" for tabular numbers in dashboard metrics
- Maintain consistent line-height ratios (1.4-1.5) for readability

---

## Layout System

**Spacing Primitives:** Tailwind units 1, 2, 3, 4, 6, 8, 12, 16, 20, 24

**Common Patterns:**
- Card padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Page margins: px-6 to px-8, py-6
- Component spacing: space-y-4 or space-y-6
- Button padding: px-4 py-2 (small), px-6 py-3 (medium)

**Grid System:**
- Pipeline columns: Equal-width flex layout with gap-4
- Dashboard metrics: grid-cols-2 md:grid-cols-4 with gap-4
- Timeline: Single column with consistent left alignment
- Assignment cards: Full-width within column, min-height for consistency

**Container Widths:**
- Main content: max-w-7xl (1280px)
- Narrow content (settings): max-w-3xl (768px)

---

## Component Library

### Navigation
**Top Bar:**
- Fixed horizontal bar, height: h-14
- Logo/title on left, navigation tabs center, user menu right
- Tabs: Pipeline, Timeline, Dashboard, Settings
- Tab styling: px-4 py-2, subtle underline indicator for active state
- User menu: Avatar (32px circle), dropdown with account info, disconnect, delete options

### Pipeline View (Primary Feature)

**Board Layout:**
- Five equal-width columns in scrollable horizontal container
- Column headers: Title + count badge, sticky positioning
- Min column width: 280px, maintains layout on standard laptops

**Assignment Cards:**
- Rectangular with rounded-md (border-radius: 6px)
- Shadow: Subtle elevation (shadow-sm, hover: shadow-md)
- Padding: p-4
- Structure (top to bottom):
  - Course tag (small pill, 11px text, px-2 py-1, rounded-full)
  - Assignment title (14px, medium weight, truncate after 2 lines)
  - Due date (12px, with calendar icon, 16px icon size from Heroicons)
  - Status row (grade if available, submission status)
  - Footer: Note indicator (if notes exist) + drag handle (right-aligned, 6-dot grip icon)

**Card States:**
- Default: subtle border
- Hover: slight elevation increase, border opacity shift
- Dragging: increased shadow, slight rotation (1-2deg), reduced opacity on original position
- Overdue indicator: Small dot or exclamation icon (12px) before due date

**Drag-and-Drop:**
- Smooth 200ms transitions
- Drop zones: Indicate with subtle background shift during drag
- Ghost card: Semi-transparent placeholder in original position

### Timeline View

**Layout:**
- Grouped by date headers (16px, semibold)
- Date headers: Sticky positioning, background fill, py-3 px-6
- Assignment rows: Horizontal layout with columns for time, title, course, status
- Row spacing: py-3, border-bottom between items

**Row Structure:**
- Fixed-width date/time column (120px)
- Flexible title column with course tag inline
- Status badge column (right-aligned, 100px)
- Expand icon for assignment details (16px chevron)

**Filters Bar:**
- Horizontal toolbar above timeline, sticky below navigation
- Filter chips: Rounded-full pills with X to remove
- Dropdowns for course selection, status, date range
- Clear all filters button (text link style)

### Dashboard Overview

**Metrics Cards:**
- Grid layout: grid-cols-2 md:grid-cols-4
- Card structure: p-6, rounded-lg, subtle border
- Large number (32px, semibold) above label (12px)
- Icon indicator (24px) top-right corner

**Sections:**
1. Top Metrics Row: Upcoming (3d), Upcoming (7d), Overdue, Total Active
2. Next Actions List: Card-style with mini assignment cards (simplified version of pipeline cards)
3. Weekly Workload: Horizontal bar chart or simplified list showing assignments per day

**Weekly Workload Visualization:**
- Seven columns (Mon-Sun), equal width
- Bar height represents count, max-height reference line
- Count number above bar (12px)
- Today indicator: Subtle highlight on current day column

### Assignment Detail Modal/Sidebar

**Trigger:** Click card in any view

**Layout:**
- Slide-in panel from right (400px width) or centered modal (600px)
- Header: Assignment title (18px), close button (top-right X, 20px)
- Content sections with spacing (space-y-6):
  - Course and due date row
  - Description (if available from Classroom)
  - Status timeline (Created → Submitted → Graded with connecting line)
  - Notes section with add/edit interface
  - External link to Google Classroom assignment

**Notes Interface:**
- Text area: min-height 100px, p-3, rounded-md border
- Save/Cancel buttons below (right-aligned button group)
- Existing notes list: Each note as card with timestamp, edit/delete icons
- Important toggle: Star icon (16px) to mark note

### Forms & Inputs

**Text Inputs:**
- Height: h-10 (40px)
- Padding: px-3
- Border: 1px rounded-md
- Focus: Ring effect (ring-2) with subtle offset

**Buttons:**
- Primary: px-4 py-2 (small), px-6 py-3 (medium), rounded-md, medium font weight
- Secondary: Same sizing, border style, transparent background
- Ghost/Text: No border, subtle hover background
- Icon buttons: Square (32px or 40px), centered icon (16px or 20px)

**Dropdowns/Selects:**
- Height matches text inputs (h-10)
- Chevron icon right-aligned (12px)
- Dropdown menu: absolute, shadow-lg, rounded-md, max-height with scroll

### Settings Page

**Layout:**
- Single column, max-w-3xl centered
- Section groups with headers (18px, semibold), mb-8 between sections
- Settings rows: Label (left, 14px) and control (right) in flex layout
- Dividers: Border-bottom between setting groups

**Sections:**
1. Connected Account (Google email, disconnect button)
2. Sync Settings (Toggle switches for background sync)
3. Preferences (Time zone dropdown)
4. Danger Zone (Delete account button, destructive styling)

---

## Interaction Patterns

**Micro-interactions:**
- All state changes: 150-200ms ease-out transitions
- Hover states: Subtle opacity/border shifts, no dramatic changes
- Loading states: Skeleton screens matching content structure, pulse animation
- Success feedback: Subtle check icon animation (500ms) for saves

**Keyboard Navigation:**
- Tab order: Logical left-to-right, top-to-bottom
- Arrow keys: Navigate between pipeline columns
- Enter/Space: Open assignment detail
- Escape: Close modals/cancel actions
- Visual focus indicators: Ring-2 outline, never remove

**Empty States:**
- Centered content with icon (48px), message (16px), and action button
- Pipeline empty column: "No assignments" with subtle icon
- Dashboard with no data: Prompt to sync Google Classroom

**Loading & Sync:**
- Initial load: Skeleton cards in pipeline columns
- Background sync: Subtle indicator in top bar (rotating icon, 16px)
- Optimistic updates: Immediate UI response, rollback on error with toast notification

---

## Responsive Behavior

**Breakpoints:**
- Mobile (<768px): Stack pipeline columns vertically, simplified metrics grid (1 column)
- Tablet (768-1024px): 2-3 pipeline columns visible with horizontal scroll
- Desktop (>1024px): Full 5-column pipeline, 4-column dashboard metrics

**Mobile Adaptations:**
- Navigation: Hamburger menu for main tabs, sticky header
- Cards: Full-width, slightly reduced padding (p-3)
- Timeline: Simplified row layout, stack date and status
- Modals: Full-screen overlays instead of panels

---

## Accessibility

**WCAG AA Compliance:**
- All text meets contrast requirements (monochrome advantage)
- Focus indicators: Always visible, minimum 2px outline
- Touch targets: Minimum 44px for interactive elements
- Screen reader: Proper ARIA labels for drag-drop, status updates
- Keyboard-only operation: All features accessible without mouse

**Semantic HTML:**
- Proper heading hierarchy (h1 → h6)
- List elements for card collections
- Button vs link distinction (buttons for actions, links for navigation)

This monochrome, information-dense design prioritizes speed and clarity while maintaining professional polish. The system supports high-volume task management with minimal cognitive load through consistent patterns, clear hierarchy, and purposeful use of space.