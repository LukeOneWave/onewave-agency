# Phase 8: Project Management + Task Kanban - Research

**Researched:** 2026-03-11
**Domain:** Drag-and-drop Kanban board, project/task CRUD, Next.js App Router
**Confidence:** HIGH

## Summary

Phase 8 adds project management with a visual Kanban board to the OneWave platform. The schema already has `Project` and `Task` models in place (added in Phase 6), so this phase is purely UI + service + API layer work — no schema migration required. The `Task.status` field uses string values (`todo | in_progress | review | done`) and `Task.order` (Int) tracks position within a column.

The drag-and-drop problem is well-solved by `@dnd-kit` (core 6.3.1, sortable 10.0.0). It is the current ecosystem standard for React 19, actively maintained, supports multi-column Kanban via nested `SortableContext` providers, and integrates cleanly with the project's existing Tailwind + shadcn/ui component patterns. `react-beautiful-dnd` is abandoned and not an option.

The key implementation challenge is persisting order after drag: tasks need both a `status` (column) and an `order` (position within column) update on `onDragEnd`. The pattern is optimistic local state update first, then a PATCH API call in the background, with revert on failure. The existing `sonner` toast library handles error feedback.

**Primary recommendation:** Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop; server component for data fetch, client component (`"use client"`) for the board; PATCH `/api/tasks/[id]` for persistence; optimistic state with revert-on-error pattern.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROJ-01 | User can create a project with name and description | projectService.create() + POST /api/projects + ProjectForm client component |
| PROJ-02 | User can assign agents to a project | Task.assignedAgentId FK already in schema; agent assignment on task create/edit; project shows agent avatars aggregated from tasks |
| PROJ-03 | User can view project progress and status | Task counts by status via Prisma groupBy or _count; progress bar UI component |
| PROJ-04 | User can create tasks within a project | taskService.create() + POST /api/projects/[id]/tasks + TaskForm modal |
| PROJ-05 | User can drag tasks between Kanban columns and position persists after reload | @dnd-kit/core + @dnd-kit/sortable; onDragEnd updates both Task.status + Task.order via PATCH /api/tasks/[id]; order loaded from DB on page refresh |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | DnD sensors, context, collision detection | Active, React 19 compatible, accessible by default |
| @dnd-kit/sortable | 10.0.0 | Multi-column sortable with useSortable hook | Built on core, handles reordering across containers |
| @dnd-kit/utilities | 3.2.2 | CSS.Transform helpers, arrayMove util | Required companion to sortable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.11 | Already installed — Kanban board local state | Client-side optimistic update state |
| sonner | 2.0.7 | Already installed — error toast on drag/save failure | Show revert notification |
| lucide-react | 0.577.0 | Already installed — Plus, GripVertical icons | Task drag handles, add buttons |
| zod | 4.3.6 | Already installed — validation schemas | ProjectCreateSchema, TaskCreateSchema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | react-beautiful-dnd is unmaintained; no React 19 support |
| @dnd-kit | @hello-pangea/dnd | Community fork of rbd; less flexible for grid/multi-container |
| Custom store | useState in board component | Fine for simple cases; Zustand adds persistence/devtools if needed |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── projects/
│   │   ├── page.tsx              # Server: list all projects (projectService.getAll)
│   │   ├── loading.tsx           # Skeleton for projects list
│   │   ├── new/
│   │   │   └── page.tsx          # Server wrapper + ProjectForm client component
│   │   └── [id]/
│   │       ├── page.tsx          # Server: project detail + tasks (projectService.getById)
│   │       └── loading.tsx       # Skeleton for Kanban board
│   └── api/
│       ├── projects/
│       │   ├── route.ts          # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts      # GET (detail), PATCH (update), DELETE
│       │       └── tasks/
│       │           └── route.ts  # GET (list), POST (create task)
│       └── tasks/
│           └── [id]/
│               └── route.ts     # PATCH (update status+order), DELETE
├── components/
│   └── projects/
│       ├── ProjectCard.tsx       # Display card on /projects list
│       ├── ProjectForm.tsx       # Create/edit form ("use client")
│       ├── KanbanBoard.tsx       # DndContext wrapper ("use client")
│       ├── KanbanColumn.tsx      # SortableContext + useDroppable per column
│       ├── TaskCard.tsx          # useSortable draggable card
│       └── TaskForm.tsx          # Create task modal ("use client")
├── lib/
│   ├── services/
│   │   ├── project.ts            # projectService (Prisma)
│   │   └── task.ts               # taskService (Prisma)
│   └── validations/
│       ├── project.ts            # ProjectCreateSchema (zod)
│       └── task.ts               # TaskCreateSchema (zod)
└── types/
    └── project.ts                # Project, Task, KanbanColumn types
```

### Pattern 1: Multi-Column Kanban with @dnd-kit/sortable

**What:** Single `DndContext` wraps all columns; each column is its own `SortableContext`. `onDragOver` handles moving items between columns, `onDragEnd` persists the final state.

**When to use:** Any fixed multi-column board (the four fixed columns map to Task.status values)

**Example:**
```typescript
// Source: dndkit.com/presets/sortable
"use client";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

const COLUMNS = ["todo", "in_progress", "review", "done"] as const;
type TaskStatus = typeof COLUMNS[number];

export function KanbanBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    const overColumn = overTask?.status ?? (over.id as TaskStatus);

    if (activeTask && activeTask.status !== overColumn) {
      setTasks(prev =>
        prev.map(t => t.id === activeTask.id ? { ...t, status: overColumn } : t)
      );
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder within column
    const activeTask = tasks.find(t => t.id === active.id)!;
    const column = tasks.filter(t => t.status === activeTask.status);
    const oldIndex = column.findIndex(t => t.id === active.id);
    const newIndex = column.findIndex(t => t.id === over.id);
    const reordered = arrayMove(column, oldIndex, newIndex);

    // Assign sequential order values
    const updates = reordered.map((t, i) => ({ id: t.id, order: i }));

    // Optimistic update
    setTasks(prev => {
      const others = prev.filter(t => t.status !== activeTask.status);
      return [...others, ...reordered.map((t, i) => ({ ...t, order: i }))];
    });

    // Persist to API
    try {
      await Promise.all(updates.map(u =>
        fetch(`/api/tasks/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: u.order, status: activeTask.status }),
        })
      ));
    } catch {
      // Revert on failure
      setTasks(initialTasks);
      toast.error("Failed to save task order. Changes reverted.");
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
                onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter(t => t.status === status)}
          />
        ))}
      </div>
    </DndContext>
  );
}
```

### Pattern 2: Sortable Task Card

**What:** Each `TaskCard` uses `useSortable` to become draggable within its column.

**When to use:** Every item in a sortable list

**Example:**
```typescript
// Source: dndkit.com/presets/sortable
"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function TaskCard({ task }: { task: Task }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}
         className="rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" {...listeners} />
        <span className="text-sm font-medium">{task.title}</span>
      </div>
    </div>
  );
}
```

### Pattern 3: Droppable Column with Empty State

**What:** Columns use both `SortableContext` (for items) and `useDroppable` (for empty column drop target).

**When to use:** To allow dragging into an empty column

**Example:**
```typescript
// Source: dndkit.com/presets/sortable
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export function KanbanColumn({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const { setNodeRef } = useDroppable({ id: status });
  const taskIds = tasks.map(t => t.id);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold text-sm">{COLUMN_LABELS[status]}</h3>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="min-h-[200px] space-y-2 rounded-lg p-2 bg-muted/30">
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      </SortableContext>
    </div>
  );
}
```

### Pattern 4: Service Layer (follows existing project patterns)

```typescript
// src/lib/services/project.ts
// Matches agentService, dashboardService patterns in this codebase
export const projectService = {
  async getAll() {
    return prisma.project.findMany({
      include: { _count: { select: { tasks: true } }, tasks: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: { assignedAgent: { select: { id: true, name: true, color: true, slug: true } } },
          orderBy: [{ status: "asc" }, { order: "asc" }],
        },
      },
    });
  },

  async create(data: { name: string; description?: string }) {
    return prisma.project.create({ data });
  },
};
```

### Anti-Patterns to Avoid
- **Marking the page server component as `"use client"`:** The page should be a server component that fetches data and passes it to `KanbanBoard` (client). Only `KanbanBoard` and below need `"use client"`.
- **Fetching tasks via `useEffect` on mount:** Pass `initialTasks` from server component as props. This removes a client-side waterfall.
- **Updating status only (not order) on drag:** Without persisting `order`, tasks will snap to incorrect positions on reload. Always update both `status` and `order`.
- **Using `over.id` as column status directly without droppable:** An empty column needs `useDroppable({ id: status })` — otherwise dragging to empty columns does nothing.
- **Single PATCH call per drag instead of batch:** When re-ordering within a column, the positions of ALL tasks in that column change. Use `Promise.all` to batch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mouse events, HTML5 drag API | @dnd-kit/core | Accessibility (keyboard/screen reader), touch support, collision detection algorithms |
| Array reordering | Custom splice logic | arrayMove from @dnd-kit/utilities | Immutable, handles edge cases |
| Drag ghost/overlay | Custom CSS clone | DragOverlay from @dnd-kit/core | Proper z-index, cursor following, portal rendering |
| Collision detection | Custom overlap calc | closestCorners from @dnd-kit/core | Multiple algorithms available (closestCenter, rectIntersection) |

**Key insight:** HTML5 drag API has poor mobile support, no keyboard navigation, and terrible touch performance. @dnd-kit uses Pointer Events API and is purpose-built for sortable lists.

## Common Pitfalls

### Pitfall 1: Stale initialTasks Reference in Revert
**What goes wrong:** `setTasks(initialTasks)` in the catch block uses the prop from initial render, not the last confirmed server state. After the first successful save, `initialTasks` is stale.
**Why it happens:** React closures capture the prop value at render time.
**How to avoid:** Keep a separate `confirmedTasks` ref that updates only after successful API calls: `const confirmedRef = useRef(initialTasks)` — update it after each successful PATCH.
**Warning signs:** Reverting a failed drag restores a state from several moves ago.

### Pitfall 2: Flickering on Drag (Optimistic Update Conflict)
**What goes wrong:** When using React Query or SWR, a background refetch can overwrite local optimistic state mid-drag, causing cards to jump.
**Why it happens:** This project uses direct fetch + useState, not React Query — so this pitfall does NOT apply here. But if SWR were added, a `mutate(data, false)` (no revalidation) pattern would be needed.
**How to avoid:** Keep board state in `useState`, not cache libraries.

### Pitfall 3: Empty Column Not Accepting Drops
**What goes wrong:** Dragging a task to an empty column does nothing.
**Why it happens:** `SortableContext` only detects drops over existing items. Empty column has no items to detect collision with.
**How to avoid:** Use `useDroppable({ id: status })` on the column container element IN ADDITION TO `SortableContext`.

### Pitfall 4: `"use client"` on Wrong Boundary
**What goes wrong:** Adding `"use client"` to the page component prevents server-side data fetching via Prisma.
**Why it happens:** Misunderstanding RSC boundaries.
**How to avoid:** Keep `app/projects/[id]/page.tsx` as a server component. Export `KanbanBoard` as a separate client component file that receives data as props.

### Pitfall 5: Task Order Starting at 0 After Insert
**What goes wrong:** New tasks always get `order: 0`, so on the next page load all tasks in a column appear in DB creation order, not visual order.
**Why it happens:** Create task endpoint doesn't calculate the next available order value.
**How to avoid:** In `taskService.create()`, query for `MAX(order)` in the target column and set `order: maxOrder + 1`.

### Pitfall 6: Agent Assignment Confusion
**What goes wrong:** PROJ-02 says "assign agents to a project" but the schema has NO direct agent-to-project relation — only `Task.assignedAgentId`.
**Why it happens:** Schema models tasks not projects as the agent relationship anchor.
**How to avoid:** PROJ-02 is satisfied by showing which agents are active in a project (aggregated from task assignments). Display agent avatars derived from `project.tasks[].assignedAgent`. No schema change needed.

## Code Examples

Verified patterns from official sources:

### Sensors Configuration (prevents accidental drag on click)
```typescript
// Source: dndkit.com/presets/sortable
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // Must move 8px before drag starts — prevents click-drag conflicts
    },
  }),
  useSensor(KeyboardSensor)  // Accessibility: arrow keys to sort
);
```

### Correct items prop for SortableContext
```typescript
// Source: dndkit.com/presets/sortable/sortable-context
// items MUST match the render order of TaskCard components
const taskIds = tasks
  .filter(t => t.status === status)
  .sort((a, b) => a.order - b.order)
  .map(t => t.id);  // string[] of IDs

<SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
```

### Task status values (maps to Prisma schema)
```typescript
// Task.status in schema.prisma is a String with these values:
export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};
```

### Project progress calculation
```typescript
// Aggregate task counts by status for PROJ-03
const progress = {
  todo: tasks.filter(t => t.status === "todo").length,
  in_progress: tasks.filter(t => t.status === "in_progress").length,
  review: tasks.filter(t => t.status === "review").length,
  done: tasks.filter(t => t.status === "done").length,
  total: tasks.length,
  percent: tasks.length ? Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100) : 0,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core + sortable | 2021 (rbd abandoned) | API is completely different; React 19 requires dnd-kit |
| HTML5 drag API | Pointer Events via @dnd-kit | 2020+ | Touch/mobile support, custom collision detection |
| Page-level data mutation | Optimistic local state + async persist | Standard 2024-2026 | Eliminates flicker, feels instant |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Officially abandoned, no React 18+ support, do not use.
- `react-sortable-hoc`: Abandoned, incompatible with React strict mode.

## Open Questions

1. **DragOverlay for visual feedback**
   - What we know: `DragOverlay` from @dnd-kit/core renders a floating ghost element during drag
   - What's unclear: Whether this project needs it — the simpler `opacity: 0.5` on the dragged item may suffice
   - Recommendation: Start without DragOverlay (simpler); add if UX feedback is poor during testing

2. **Task description field**
   - What we know: `Task.description` is optional in the schema
   - What's unclear: Should the TaskForm include a description textarea in Phase 8, or just title?
   - Recommendation: Include an optional description textarea in the form; it's already in the schema

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + Testing Library |
| Config file | `/Users/luke/onewave-agency/vitest.config.ts` |
| Quick run command | `npm test -- --reporter=dot src/lib/services/__tests__/project.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-01 | `projectService.create()` creates project with name/description | unit | `npm test -- src/lib/services/__tests__/project.test.ts -t "create"` | Wave 0 |
| PROJ-02 | Task create with `assignedAgentId` stores FK | unit | `npm test -- src/lib/services/__tests__/task.test.ts -t "assignedAgent"` | Wave 0 |
| PROJ-03 | `projectService.getById` returns tasks with status counts | unit | `npm test -- src/lib/services/__tests__/project.test.ts -t "getById"` | Wave 0 |
| PROJ-04 | `taskService.create()` creates task with correct `order` | unit | `npm test -- src/lib/services/__tests__/task.test.ts -t "create"` | Wave 0 |
| PROJ-05 | `taskService.updateStatus()` updates status+order | unit | `npm test -- src/lib/services/__tests__/task.test.ts -t "updateStatus"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- src/lib/services/__tests__/project.test.ts src/lib/services/__tests__/task.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/services/__tests__/project.test.ts` — covers PROJ-01, PROJ-03 (mock prisma.project)
- [ ] `src/lib/services/__tests__/task.test.ts` — covers PROJ-02, PROJ-04, PROJ-05 (mock prisma.task)

*(No framework install needed — Vitest already configured)*

## Sources

### Primary (HIGH confidence)
- [dndkit.com/presets/sortable](https://dndkit.com/presets/sortable) — useSortable, SortableContext, multi-container patterns
- Prisma schema at `prisma/schema.prisma` — Project and Task models confirmed in codebase
- package.json — all existing dependencies confirmed, @dnd-kit not yet installed

### Secondary (MEDIUM confidence)
- [LogRocket: Build a Kanban board with dnd kit and React](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) — useDraggable/useDroppable patterns verified against official docs
- [Marmelab: Building a Kanban Board With Drag-and-Drop in React with Shadcn (2026)](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html) — optimistic update + batch persist pattern
- [desishub: Implementing Kanban Drag and Drop with dnd-kit in a Next.js Project](https://docs.desishub.com/programming-tutorials/nextjs/kanban) — client boundary, revert-on-error pattern

### Tertiary (LOW confidence)
- npm show output: @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2 (current as of 2026-03-11, but "last published a year ago" — worth monitoring)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm versions confirmed, ecosystem consensus on @dnd-kit
- Architecture: HIGH — matches existing service/API/component patterns in codebase
- Pitfalls: MEDIUM — most verified via multiple sources; pitfall 1 (stale ref) and 5 (order on insert) are from pattern analysis, not a single authoritative source
- Schema: HIGH — read directly from codebase; Project/Task models already exist

**Research date:** 2026-03-11
**Valid until:** 2026-06-11 (stable stack; dnd-kit versions unlikely to change soon)
