# Trace --- Teacher Timetable Feature

## Complete UI/UX + Functional Implementation Prompt

Build a production-quality **Teacher Timetable Builder** feature inside
the existing **Trace** application.

The existing Trace application already has a teacher dashboard with: -
Trace branding - Teacher profile/sidebar - Dashboard - Courses -
Settings - Light/Dark mode - Logout - Existing course/attendance
functionality

**Do not redesign or replace the existing application.** The new feature
must feel like a native part of Trace and use the same visual language,
spacing, typography, borders, buttons, cards, dark/light mode behavior,
and navigation patterns already present.

The screenshots supplied with this task are the visual references. The
existing Trace UI is represented by the screenshots showing the "Your
Courses" page. The timetable references show the desired drag-and-drop
scheduling experience.

------------------------------------------------------------------------

# 1. Main Goal

Create a **Timetable Builder for Teachers**.

The first phase is ONLY the teacher-side timetable creation and
management experience.

Do NOT implement student calendar synchronization yet.

The future architecture should make student synchronization possible,
but for this phase focus on:

1.  Teacher creates a weekly timetable.
2.  Teacher selects the academic/class context.
3.  Teacher creates subjects/lecture cards.
4.  Teacher drags subjects into timetable slots.
5.  Teacher can edit lecture details.
6.  Teacher can move lectures using drag and drop.
7.  Teacher can delete lectures.
8.  Teacher can save timetable as draft.
9.  Teacher can publish timetable.
10. Teacher can preview the timetable.
11. Teacher can make quick changes from mobile.
12. Data should be structured so the future student-calendar/reminder
    feature can consume it.

------------------------------------------------------------------------

# 2. Design Direction

The visual direction should be:

-   Modern SaaS
-   Minimal
-   Professional
-   Clean
-   Premium
-   Teacher/admin productivity software
-   Inspired by Linear, Notion, modern project-management tools and the
    provided timetable references
-   But visually consistent with the existing Trace UI

Do NOT make it look like a generic Google Calendar clone.

Trace should remain visually recognizable.

## Existing Trace visual language

Use:

-   White background in light mode
-   Near-black background in dark mode
-   Black primary buttons
-   Subtle gray borders
-   Rounded cards
-   Very light shadows
-   Clean typography
-   Generous whitespace
-   Small, restrained icons
-   Compact labels
-   Professional dashboard spacing
-   Minimal visual noise

Avoid:

-   Excessive gradients
-   Excessive glassmorphism
-   Huge colorful elements
-   Heavy shadows
-   Excessively rounded cartoon-style UI
-   Overly decorative illustrations

------------------------------------------------------------------------

# 3. Desktop Layout

Create a new sidebar navigation item:

**Timetable**

Place it between:

Courses Timetable Attendance

Use a calendar icon.

When selected, it should have the same active-state treatment as the
existing Courses page.

Desktop structure:

``` text
-------------------------------------------------------------
| Sidebar | Header / Timetable Builder                     |
|         |                                                |
|         | Page title + actions                           |
|         |                                                |
|         | Academic/Class filters                          |
|         |                                                |
|         | Weekly View | List View | Settings             |
|         |                                                |
|         |----------------------------------------------- |
|         |                                                |
|         | Timetable Grid                  Subjects Panel |
|         |                                                |
|         |                                                |
-------------------------------------------------------------
```

------------------------------------------------------------------------

# 4. Page Header

Page title:

**Timetable Builder**

Subtitle:

**Create and manage class timetables with a simple drag and drop
interface**

Top-right actions:

-   Preview
-   Save as Draft
-   Publish Timetable

Primary action:

**Publish Timetable**

Secondary action:

**Save as Draft**

Preview should be an outlined button.

Use appropriate Lucide/icon-library icons if the project already has
one.

------------------------------------------------------------------------

# 5. Context Selector

Under the page header create a horizontal filter/context bar.

Fields:

### Academic Year

Example:

`2025 - 2026`

### Department

Example:

`Computer Engineering`

### Year

Example:

`2nd Year`

### Division

Example:

`A`

### Semester

Example:

`3`

Each should be a clean select/dropdown.

The timetable belongs to this exact context.

Changing the context should load the corresponding timetable.

Do not allow accidental mixing of timetables between divisions.

------------------------------------------------------------------------

# 6. Main Timetable Navigation

Create three tabs:

### Weekly View

Default.

### List View

Shows all scheduled lectures in a compact list.

### Settings

Contains timetable-specific configuration.

Weekly View should be active by default.

Below the tabs, include:

**Clear All**

This must have a confirmation dialog before deleting all timetable
entries.

------------------------------------------------------------------------

# 7. Weekly Timetable Grid

Create a professional timetable grid.

Columns:

-   Time
-   Monday
-   Tuesday
-   Wednesday
-   Thursday
-   Friday
-   Saturday

Rows should represent configurable time slots.

Default example:

``` text
8:00 AM
9:00 AM
10:00 AM
11:00 AM
12:00 PM
1:00 PM
2:00 PM
3:00 PM
4:00 PM
5:00 PM
```

The grid must be responsive.

Each day column should support drag-and-drop.

------------------------------------------------------------------------

# 8. Drag-and-Drop System

This is the most important interaction.

Teachers should be able to:

1.  Drag a subject from the Subjects panel.
2.  Hover over a timetable slot.
3.  See a visual drop indicator.
4.  Release the subject.
5.  Open a lecture-detail dialog OR create the lecture using sensible
    defaults.
6.  The lecture appears in that slot.

Also support:

-   Drag existing lecture to another time
-   Drag existing lecture to another day
-   Reorder/move lecture
-   Delete lecture
-   Edit lecture
-   Duplicate lecture

Use smooth but subtle drag animations.

When dragging:

-   The source card should become slightly transparent.
-   The destination slot should highlight.
-   Show a clear insertion/drop indicator.
-   Do not allow dropping into invalid areas.

------------------------------------------------------------------------

# 9. Subject Panel

Desktop right-side panel:

### Subjects

Top-right button:

**+ Add Subject**

Each subject card should contain:

-   Drag handle
-   Color indicator
-   Subject name
-   Teacher name
-   More menu

Example:

``` text
⋮⋮  ● Mathematics
      Shubhanshree Mam
```

Subjects:

1.  Mathematics Shubhanshree Mam

2.  Data Structures Amit Sir

3.  DBMS Rahul Sir

4.  Computer Graphics Neha Mam

5.  Operating System Priya Mam

6.  Web Technologies Karan Sir

7.  Mini Project Project Guide

8.  Seminar Department

Subject cards should be draggable.

------------------------------------------------------------------------

# 10. Add Subject

Clicking:

**+ Add Subject**

opens a modal/drawer.

Fields:

-   Subject Name
-   Teacher
-   Default Room
-   Color
-   Optional Short Code

Example:

``` text
Subject Name
[ Mathematics ]

Teacher
[ Shubhanshree Mam ]

Default Room
[ FF110 ]

Color
[ Blue ]

[Cancel] [Add Subject]
```

Validation:

-   Subject name required.
-   Teacher required.
-   Room optional.
-   Prevent accidental duplicate subjects for the same timetable
    context.

------------------------------------------------------------------------

# 11. Lecture Card

Each scheduled lecture should look like a compact modern card.

Example:

``` text
Mathematics
Shubhanshree Mam
FF110
```

Visually:

-   Colored left border
-   Very subtle tinted background
-   Subject title bold
-   Teacher secondary text
-   Room tertiary text

Example schedule:

Monday:

9:00 AM - 10:00 AM

Mathematics Shubhanshree Mam FF110

Tuesday:

9:00 AM - 10:00 AM

Data Structures Amit Sir FF102

Wednesday:

9:00 AM - 10:00 AM

Computer Graphics Neha Mam Lab 2

Thursday:

9:00 AM - 10:00 AM

DBMS Rahul Sir FF205

Friday:

9:00 AM - 10:00 AM

Mathematics Shubhanshree Mam FF110

------------------------------------------------------------------------

# 12. Lunch Break

Support a non-lecture timetable block:

**Lunch Break**

Example:

1:00 PM - 2:00 PM

Display it as a neutral gray horizontal block.

Lunch break should not behave like a normal subject.

Allow teacher to configure its start/end time in timetable settings.

------------------------------------------------------------------------

# 13. Lecture Details Modal

Clicking an existing lecture should open an edit modal/drawer.

Fields:

### Subject

Dropdown

### Teacher

Dropdown

### Day

Dropdown

### Start Time

Time picker

### End Time

Time picker

### Room

Text field

### Lecture Type

Options:

-   Lecture
-   Lab
-   Tutorial
-   Seminar
-   Practical
-   Other

### Notes

Optional textarea

Actions:

**Delete Lecture**

**Cancel**

**Save Changes**

------------------------------------------------------------------------

# 14. More Menu

Each lecture should have a three-dot menu:

-   Edit
-   Duplicate
-   Move
-   Delete

For subject cards:

-   Edit Subject
-   Duplicate Subject
-   Remove Subject

Do not delete immediately.

Show confirmation for destructive actions.

------------------------------------------------------------------------

# 15. Duplicate Lecture

Add an efficient duplicate feature.

Example:

Teacher clicks:

`Mathematics → Duplicate`

Then the UI allows selecting:

``` text
Day:
[ Thursday ]

Time:
[ 2:00 PM ]

Room:
[ FF110 ]
```

Save.

This is useful because the same subject may occur multiple times per
week.

------------------------------------------------------------------------

# 16. List View

Create a clean table/list view.

Columns:

-   Day
-   Time
-   Subject
-   Teacher
-   Room
-   Type
-   Actions

Example:

``` text
Monday    9:00-10:00    Mathematics       Shubhanshree Mam   FF110
Monday    11:00-12:00   DBMS              Rahul Sir          FF205
Tuesday   9:00-10:00    Data Structures   Amit Sir            FF102
```

Allow:

-   Search
-   Filter by teacher
-   Filter by subject
-   Filter by room
-   Edit
-   Delete

------------------------------------------------------------------------

# 17. Preview

The Preview button should open a clean read-only timetable preview.

Hide editing controls.

Show:

-   Class
-   Division
-   Semester
-   Academic Year
-   Weekly timetable

This should represent exactly what students will eventually see.

Do not implement student syncing yet.

------------------------------------------------------------------------

# 18. Save Draft

Teacher can save incomplete work.

Draft status:

**Draft**

Show a subtle status indicator near the timetable title.

Example:

`Draft • Last saved 2 minutes ago`

Auto-save can be implemented if practical, but manual Save as Draft must
always work.

Prevent accidental loss of timetable edits.

------------------------------------------------------------------------

# 19. Publish Timetable

Publish action should open confirmation:

``` text
Publish Timetable?

You are about to publish the timetable for:

Computer Engineering
2nd Year
Division A
Semester 3

Students will eventually receive this timetable when student synchronization is enabled.

[Cancel]
[Publish Timetable]
```

After publishing:

Show:

**Timetable Published**

Status:

`Published`

Also store:

-   publishedAt
-   publishedBy
-   version

This versioning will be useful later.

------------------------------------------------------------------------

# 20. Timetable Settings

Settings should include:

### Working Days

Checkboxes:

-   Monday
-   Tuesday
-   Wednesday
-   Thursday
-   Friday
-   Saturday

### Working Hours

Start:

`8:00 AM`

End:

`5:00 PM`

### Slot Duration

Options:

-   30 minutes
-   45 minutes
-   50 minutes
-   60 minutes
-   Custom

### Breaks

Add/edit:

-   Lunch Break
-   Short Break
-   Other

Do not overcomplicate the first version.

------------------------------------------------------------------------

# 21. Mobile UI

Mobile is NOT required to replicate the full desktop drag-and-drop
builder.

The mobile experience should prioritize:

-   Viewing
-   Quick editing
-   Moving important lectures
-   Changing room
-   Changing teacher
-   Changing time
-   Publishing changes
-   Checking today's timetable

The desktop remains the primary timetable-building experience.

------------------------------------------------------------------------

# 22. Mobile Header

Mobile layout:

``` text
☰   Trace       🔔   KI
```

Below:

**Timetable**

`2nd Year • Div A • Sem 3`

Right-side:

**Change**

The Change button opens context selectors.

------------------------------------------------------------------------

# 23. Mobile Week Selector

Use compact date/day pills:

``` text
Mon 22
Tue 23
Wed 24
Thu 25
Fri 26
Sat 27
```

Selected day should use the existing Trace black primary style.

Below it, show that day's lectures as vertical cards.

------------------------------------------------------------------------

# 24. Mobile Lecture Cards

Example:

``` text
● Mathematics                         ⋮
  9:00 AM – 10:00 AM
  Shubhanshree Mam • FF110
```

Next:

``` text
● DBMS                               ⋮
  11:00 AM – 12:00 PM
  Rahul Sir • FF205
```

Lunch:

``` text
🍴 Lunch Break
   1:00 PM – 2:00 PM
```

Use the same subject colors as desktop.

------------------------------------------------------------------------

# 25. Mobile Quick Edit

At bottom of today's timetable:

**Quick Edit (Today)**

This opens a mobile-friendly editor.

The teacher can:

-   Change room
-   Change time
-   Change teacher
-   Move lecture to another day
-   Cancel lecture
-   Edit notes

Do not force a complicated drag-and-drop interaction on mobile.

Use forms and bottom sheets instead.

------------------------------------------------------------------------

# 26. Mobile Navigation

Use the existing Trace mobile navigation pattern if one exists.

Suggested:

``` text
Dashboard
Timetable
Attendance
More
```

Timetable should be highlighted when active.

------------------------------------------------------------------------

# 27. Mobile Important Actions

The mobile interface should expose:

-   Save
-   Publish
-   Edit
-   Delete
-   Quick Edit
-   Preview

Do NOT expose every advanced configuration option directly on mobile.

Advanced settings can remain desktop-first.

------------------------------------------------------------------------

# 28. Responsive Behavior

Desktop:

-   Sidebar visible
-   Full weekly grid
-   Subject panel visible

Tablet:

-   Sidebar may collapse
-   Subject panel may become drawer
-   Grid remains usable with horizontal scrolling

Mobile:

-   Sidebar becomes hamburger menu
-   Subject panel becomes bottom sheet
-   Weekly grid becomes day-based list
-   Quick Edit replaces complex drag/drop
-   Horizontal scrolling should be avoided wherever possible

------------------------------------------------------------------------

# 29. Dark Mode

The feature must fully support the existing Trace dark mode.

Do not simply invert colors.

Create proper dark-mode tokens.

Dark mode should use:

-   Dark page background
-   Dark cards
-   Subtle borders
-   Light text
-   Muted secondary text
-   Black/near-black primary controls adjusted for contrast
-   Same subject accent colors but carefully toned down if needed

The existing Trace dark mode should remain visually consistent.

------------------------------------------------------------------------

# 30. Data Model

Prepare the architecture for future student synchronization.

Suggested structure:

``` text
timetables/
  {timetableId}
    academicYear
    department
    year
    division
    semester
    status
    version
    createdBy
    createdAt
    updatedAt
    publishedAt
    publishedBy

subjects/
  {subjectId}
    timetableId
    name
    teacherId
    teacherName
    defaultRoom
    color
    shortCode
    createdAt
    updatedAt

lectures/
  {lectureId}
    timetableId
    subjectId
    subjectName
    teacherId
    teacherName
    dayOfWeek
    startTime
    endTime
    room
    type
    notes
    createdAt
    updatedAt
```

If the existing project already has a database schema, adapt to it
instead of creating unnecessary duplicate collections.

------------------------------------------------------------------------

# 31. Important Future Compatibility

The first phase must NOT implement student calendar synchronization.

However, design lecture records so later they can support:

-   Student calendar events
-   Notifications
-   10-minute reminders
-   Room-change notifications
-   Cancelled lecture notifications
-   Substitute teacher notifications
-   Timetable versioning
-   Student-specific class/division filtering

Potential future fields:

``` text
notificationEnabled
reminderMinutes
recurrenceRule
isCancelled
cancelledAt
changeHistory
```

Do not implement these unless needed now.

------------------------------------------------------------------------

# 32. Time Representation

Do not store only human-readable strings like:

`9:00 AM`

Use structured values.

Example:

``` text
startTime: "09:00"
endTime: "10:00"
```

Day:

``` text
dayOfWeek: 1
```

or another consistent enum.

Keep the data timezone-aware at the application level.

Future reminders will depend on accurate time handling.

------------------------------------------------------------------------

# 33. Validation

Prevent:

-   End time before start time
-   Empty subject
-   Empty teacher where teacher is required
-   Invalid timetable context
-   Duplicate overlapping lectures in the same day/slot
-   Lecture placed inside a configured break
-   Invalid room/time values

When an overlap happens:

``` text
Schedule conflict

Mathematics already occupies this time slot.

Please choose another time or day.
```

Do not silently overwrite an existing lecture.

------------------------------------------------------------------------

# 34. UX Details

Use subtle micro-interactions:

-   Drag hover state
-   Card lift while dragging
-   Smooth modal transitions
-   Button loading state
-   Save confirmation
-   Publish confirmation
-   Delete confirmation
-   Toast notifications

Example toast:

`Timetable saved successfully`

`Lecture moved to Thursday, 2:00 PM`

`Timetable published successfully`

Keep animations fast and professional.

------------------------------------------------------------------------

# 35. Accessibility

Support:

-   Keyboard navigation
-   Visible focus states
-   Proper labels
-   Good contrast
-   Accessible dialogs
-   Accessible dropdowns
-   Keyboard-friendly lecture editing

Drag-and-drop should have a non-drag alternative.

For example:

**Move lecture**

opens a form to choose day/time.

------------------------------------------------------------------------

# 36. Empty States

If no timetable exists:

Show:

**Create your first timetable**

`Drag subjects into the weekly schedule to build your class timetable.`

Button:

**Add Subject**

or

**Start Building**

Do not show an empty confusing grid without explanation.

------------------------------------------------------------------------

# 37. Unsaved Changes

If teacher modifies timetable and attempts to leave:

Show:

**You have unsaved changes**

Options:

-   Stay
-   Save Draft
-   Leave without saving

------------------------------------------------------------------------

# 38. Performance

Do not unnecessarily re-render the entire timetable when moving one
lecture.

Use sensible component separation.

Suggested components:

``` text
TimetablePage
TimetableHeader
TimetableContextSelector
TimetableTabs
WeeklyTimetable
TimetableGrid
TimeColumn
DayColumn
TimeSlot
LectureCard
SubjectPanel
SubjectCard
AddSubjectModal
LectureEditorModal
PreviewModal
PublishConfirmation
TimetableSettings
ListView
MobileTimetable
MobileDaySelector
MobileLectureCard
MobileQuickEdit
```

Use reusable components.

------------------------------------------------------------------------

# 39. Suggested Routing

If the existing project uses React Router, add something like:

``` text
/teacher/timetable
```

Potential future routes:

``` text
/teacher/timetable/preview
/teacher/timetable/settings
```

But avoid unnecessary routes if the existing architecture prefers
modals/drawers.

------------------------------------------------------------------------

# 40. State Management

Follow the existing project's state-management pattern.

Do not introduce Redux/Zustand/etc. if the project does not already use
it unless there is a strong technical reason.

Keep timetable state structured:

``` text
selectedContext
subjects
lectures
breaks
viewMode
selectedDay
isDirty
saveStatus
publishStatus
```

------------------------------------------------------------------------

# 41. Example Timetable Data

Use realistic demo data for the UI:

### Monday

9:00--10:00 Mathematics Shubhanshree Mam FF110

11:00--12:00 DBMS Rahul Sir FF205

2:00--3:00 Web Technologies Karan Sir Lab 1

### Tuesday

9:00--10:00 Data Structures Amit Sir FF102

11:00--12:00 Operating System Priya Mam FF204

2:00--3:00 Computer Graphics Neha Mam Lab 2

4:00--5:00 Mini Project Project Guide Lab 3

### Wednesday

9:00--10:00 Computer Graphics Neha Mam Lab 2

11:00--12:00 Data Structures Amit Sir FF102

2:00--3:00 DBMS Rahul Sir FF205

4:00--5:00 Seminar Department Auditorium

### Thursday

9:00--10:00 DBMS Rahul Sir FF205

11:00--12:00 Computer Graphics Neha Mam Lab 2

2:00--3:00 Mathematics Shubhanshree Mam FF110

### Friday

9:00--10:00 Mathematics Shubhanshree Mam FF110

11:00--12:00 Operating System Priya Mam FF204

2:00--3:00 Web Technologies Karan Sir Lab 1

### Saturday

Keep mostly empty with + Add placeholders.

------------------------------------------------------------------------

# 42. Mobile Demo Data

Mobile default selected day:

**Monday 22**

Show:

9:00--10:00 Mathematics Shubhanshree Mam • FF110

11:00--12:00 DBMS Rahul Sir • FF205

1:00--2:00 Lunch Break

2:00--3:00 Web Technologies Karan Sir • Lab 1

4:00--5:00 Mini Project Project Guide • Lab 3

------------------------------------------------------------------------

# 43. Desktop + Mobile Consistency

The desktop and mobile versions must clearly feel like the same product.

Use:

-   Same Trace logo
-   Same typography
-   Same icons
-   Same colors
-   Same subject colors
-   Same button styles
-   Same card language
-   Same naming
-   Same data

Do not create a completely separate visual system for mobile.

------------------------------------------------------------------------

# 44. Important Product Principle

The teacher should feel:

> "I can build my entire weekly timetable in a few minutes."

The core interaction should be:

``` text
Create Subjects
      ↓
Drag Subject
      ↓
Drop into Day + Time
      ↓
Set Room / Details
      ↓
Repeat
      ↓
Preview
      ↓
Save Draft
      ↓
Publish
```

Keep the workflow fast.

Avoid forcing the teacher to fill a large form every time they add a
lecture.

------------------------------------------------------------------------

# 45. Do Not Build Yet

Do NOT implement in this phase:

-   Student calendar synchronization
-   Student push notifications
-   10-minute lecture reminders
-   FCM
-   Student-specific notification settings
-   Parent notifications
-   Attendance integration with timetable
-   Automatic attendance marking
-   Google Calendar integration

These will be phase 2.

However, the database/API structure should not make these future
features difficult.

------------------------------------------------------------------------

# 46. Final Quality Requirements

Before considering the feature complete:

-   Test desktop
-   Test tablet
-   Test mobile
-   Test light mode
-   Test dark mode
-   Test drag and drop
-   Test keyboard editing alternative
-   Test overlapping lectures
-   Test delete confirmation
-   Test save draft
-   Test publish
-   Test preview
-   Test mobile quick edit
-   Test context switching
-   Test empty state
-   Test unsaved changes
-   Test responsive navigation

Do not break existing Trace features.

Do not modify existing Courses or Attendance behavior unless required
for navigation integration.

------------------------------------------------------------------------

# 47. Implementation Priority

Build in this order:

### Phase 1 --- UI shell

1.  Sidebar navigation item
2.  Timetable page
3.  Header
4.  Context selector
5.  Weekly grid
6.  Subject panel

### Phase 2 --- Core interaction

7.  Add subject
8.  Drag subject to timetable
9.  Edit lecture
10. Move lecture
11. Delete lecture
12. Duplicate lecture

### Phase 3 --- Management

13. Save draft
14. Preview
15. Publish
16. List view
17. Timetable settings

### Phase 4 --- Mobile

18. Mobile timetable
19. Day selector
20. Mobile lecture cards
21. Quick edit
22. Mobile publish/save

### Phase 5 --- Polish

23. Loading states
24. Empty states
25. Error states
26. Toasts
27. Dark mode
28. Accessibility
29. Responsive testing

------------------------------------------------------------------------

# 48. Critical Instruction to the Developer/AI

Before writing code:

1.  Inspect the existing Trace project.
2.  Identify the existing layout/sidebar components.
3.  Identify the existing button, card, modal, dropdown, toast and
    typography components.
4.  Reuse existing components wherever possible.
5.  Identify the existing database structure.
6.  Do not duplicate existing functionality.
7.  Follow the existing naming conventions.
8.  Follow the existing routing structure.
9.  Follow the existing authentication/authorization system.
10. Do not replace the existing design system.

The new Timetable feature must look like it was designed as part of
Trace from day one.

Do not blindly copy the reference screenshot.

Use the screenshots as **UX and visual inspiration**, while preserving
Trace's existing identity.

------------------------------------------------------------------------

# 49. Final Expected Result

When a teacher opens:

`Teacher → Timetable`

they should see a polished Trace timetable builder.

Desktop:

``` text
Trace
Teacher

Timetable Builder
Create and manage class timetables with a simple drag and drop interface

[Preview] [Save as Draft] [Publish Timetable]

[Academic Year] [Department] [Year] [Division] [Semester]

Weekly View | List View | Settings

                    SUBJECTS
                    + Add Subject

TIME | MON | TUE | WED | THU | FRI | SAT

9 AM | Maths | DSA | CG | DBMS | Maths | + Add
     |       |     |    |      |       |

11AM | DBMS | OS | DSA | CG | OS | + Add

1 PM |              LUNCH BREAK

2 PM | Web | CG | DBMS | Maths | Web | + Add

4 PM | +Add | Mini | Seminar | +Add | +Add | +Add
```

Mobile:

``` text
Trace                 🔔

Timetable
2nd Year • Div A • Sem 3

Mon 22 | Tue 23 | Wed 24 | Thu 25 | Fri 26

Mathematics
9:00–10:00
Shubhanshree Mam • FF110

DBMS
11:00–12:00
Rahul Sir • FF205

Lunch Break
1:00–2:00

Web Technologies
2:00–3:00
Karan Sir • Lab 1

[ Quick Edit (Today) ]
```

The final result should feel like a **premium academic productivity
tool**, not an ordinary timetable form.

Build it carefully, incrementally, and without breaking the existing
Trace application.
