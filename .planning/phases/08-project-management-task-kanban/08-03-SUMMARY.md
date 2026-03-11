---
phase: 08-project-management-task-kanban
plan: 03
subsystem: ui
tags: [nextjs, react, typescript, tailwind, dnd-kit, kanban, drag-and-drop]

# Dependency graph
requires:
  - phase: 08-project-management-task-kanban
    plan: 01
    provides: projectService.getById(), agentService.getAll(), PATCH /api/tasks/[id], POST /api/projects/[id]/tasks
  - phase: 08-project-management-task-kanban
    plan: 02
    provides: /projects page with ProjectCard links to /projects/[id]
provides:
  - /projects/[id] server component page with Kanban board
  - KanbanBoard client component with drag-and-drop, optimistic updates, revert-on-error
  - KanbanColumn with SortableContext + useDroppable
  - TaskCard with useSortable and agent avatar
  - TaskForm modal with title/description/agent assignment, POST on submit
  - Loading skeleton for /projects/[id]
affects:
  - User can now manage tasks visually across 4 columns with persistence

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core": "^6.x"
    - "@dnd-kit/sortable": "^8.x"
    - "@dnd-kit/utilities": "^3.x"
  patterns:
    - DndContext with DragOverlay for drag ghost rendering
    - confirmedRef pattern: useRef for revert-on-error instead of stale prop
    - Optimistic state update + batch PATCH + revert-on-error with toast
    - Server component page calling service layer directly, passing agents as prop to client component
    - useDroppable on column container for empty-column drops

key-files:
  created:
    - src/app/projects/[id]/page.tsx
    - src/app/projects/[id]/loading.tsx
    - src/components/projects/KanbanBoard.tsx
    - src/components/projects/KanbanColumn.tsx
    - src/components/projects/TaskCard.tsx
    - src/components/projects/TaskForm.tsx
  modified: []

key-decisions:
  - "confirmedRef pattern: useRef tracks last confirmed server state for revert-on-error (avoids stale closure on initialTasks prop)"
  - "DragOverlay renders TaskCard clone during drag for smooth ghost UI"
  - "Batch PATCH via Promise.all for all changed tasks on dragEnd — one round-trip per drag"
  - "Agent list fetched server-side in page.tsx and passed as prop to KanbanBoard (avoids client-side fetch)"
  - "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 layout for responsive board on smaller screens"

# Metrics
duration: ~3min
completed: 2026-03-11
---

# Phase 08 Plan 03: Kanban Board with Drag-and-Drop and Task Creation

**dnd-kit Kanban board at /projects/[id] with drag-and-drop persistence, task creation modal with agent assignment, and revert-on-error optimistic updates**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-11T15:06:12Z
- **Completed:** 2026-03-11T15:09:01Z
- **Tasks:** 2 (Task 3 is a human-verify checkpoint)
- **Files created:** 6

## Accomplishments

- Project detail page at `/projects/[id]` — server component fetching project via `projectService.getById()` and agents via `agentService.getAll()`, renders progress summary and KanbanBoard
- KanbanBoard with full dnd-kit setup: PointerSensor (distance:8 activation), KeyboardSensor, closestCorners collision, DragOverlay for drag ghost
- KanbanColumn with SortableContext + useDroppable for empty-column drops
- TaskCard with useSortable, GripVertical drag handle, agent avatar (colored circle with 2-letter initial)
- Optimistic state updates on drag with batch PATCH and revert-on-error using confirmedRef pattern
- TaskForm modal: title, description, agent select, POST to `/api/projects/{id}/tasks`, toast feedback, Escape/click-outside close
- Loading skeleton with 4-column pulse animation matching actual layout

## Task Commits

1. **Task 1: Kanban board components** - `cb28a0c` (feat)
2. **Task 2: Task creation form with agent assignment** - `6c24beb` (feat)

## Files Created

- `src/app/projects/[id]/page.tsx` - Server component: project title, progress summary, KanbanBoard
- `src/app/projects/[id]/loading.tsx` - 4-column Kanban skeleton with pulse animation
- `src/components/projects/KanbanBoard.tsx` - DndContext wrapper, sensors, drag handlers, Add Task button, TaskForm integration
- `src/components/projects/KanbanColumn.tsx` - SortableContext + useDroppable, sorted task list, task count badge
- `src/components/projects/TaskCard.tsx` - useSortable, GripVertical drag handle, agent avatar
- `src/components/projects/TaskForm.tsx` - Modal overlay, title/description/agent fields, POST to API

## Decisions Made

- Used `confirmedRef` (useRef) to track last confirmed server state rather than relying on the stale `initialTasks` prop for revert-on-error — avoids stale closure bugs
- `DragOverlay` renders a TaskCard clone during drag for a smooth ghost UI (prevents layout shifts in the source column)
- Agent list fetched server-side in `page.tsx` and passed as serialized prop to `KanbanBoard` to avoid client-side fetches on every interaction
- Used `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for responsive Kanban — still functional on mobile/tablet

## Deviations from Plan

None - plan executed exactly as written.

## Checkpoint: Human Verification Required

Task 3 is a `checkpoint:human-verify`. The dev server is running at http://localhost:3000.

**Verification steps:**
1. Navigate to http://localhost:3000 — verify "Projects" appears in sidebar
2. Click "Projects" — should show empty state or project list
3. Click "New Project" — fill in name and description, submit
4. Verify redirect to /projects with project card visible
5. Click the project card — should open /projects/[id] with Kanban board (4 columns)
6. Click "Add Task" — fill in title, optionally assign an agent, submit
7. Verify task appears in "To Do" column
8. Create 2-3 more tasks
9. Drag a task from "To Do" to "In Progress" — verify it moves
10. Drag a task from "In Progress" to "Done" — verify it moves
11. Reload the page — verify tasks remain in new columns and positions
12. Go back to /projects — verify progress bar shows updated counts
