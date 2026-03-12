---
phase: 08-project-management-task-kanban
plan: 01
subsystem: api
tags: [prisma, zod, nextjs, typescript, vitest, tdd]

# Dependency graph
requires:
  - phase: 06-infrastructure-quick-wins
    provides: Prisma schema with Project and Task models already migrated to DB
provides:
  - projectService CRUD (create, getAll with counts, getById with tasks, delete)
  - taskService CRUD (create with auto-order, updateStatus, delete)
  - Zod validations for CreateProject, UpdateProject, CreateTask, UpdateTaskStatus
  - TypeScript types: TaskStatus, TASK_STATUSES, COLUMN_LABELS, ProjectWithTasks, TaskWithAgent
  - GET/POST /api/projects, GET/DELETE /api/projects/[id]
  - GET/POST /api/projects/[id]/tasks
  - PATCH/DELETE /api/tasks/[id]
affects:
  - 08-02 (kanban UI consumes projectService, taskService, and task API routes)
  - 08-03 (project management UI consumes project API routes and types)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zod v4 import via zod/v4 (matches existing codebase pattern)
    - Service layer delegates Prisma queries; routes delegate to services
    - Error keyword matching drives HTTP status codes (not found -> 404)
    - TDD with Vitest: vi.mock @/lib/prisma pattern for mocked unit tests
    - Task ordering via prisma.task.aggregate _max to set next order

key-files:
  created:
    - src/types/project.ts
    - src/lib/validations/project.ts
    - src/lib/validations/task.ts
    - src/lib/services/project.ts
    - src/lib/services/task.ts
    - src/lib/services/__tests__/project.test.ts
    - src/lib/services/__tests__/task.test.ts
    - src/app/api/projects/route.ts
    - src/app/api/projects/[id]/route.ts
    - src/app/api/projects/[id]/tasks/route.ts
    - src/app/api/tasks/[id]/route.ts
  modified: []

key-decisions:
  - "Task auto-ordering uses prisma.task.aggregate _max on same project+status; first task gets order=0, subsequent get max+1"
  - "projectService.getAll() includes _count.tasks and status-only task select for dashboard counts without loading full task data"
  - "API routes use Next.js 15 async params pattern (params: Promise<{ id: string }>)"

patterns-established:
  - "Task order auto-assignment: aggregate max order per column on create"
  - "Service layer isolation: API routes never call Prisma directly except tasks list in /[id]/tasks GET"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 08 Plan 01: Types, Services, and API Routes for Project Management

**Zod-validated REST API (projects/tasks) with Prisma service layer, auto-ordering task creation, and 11 passing vitest unit tests using mock pattern**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-11T14:56:19Z
- **Completed:** 2026-03-11T14:59:42Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Full service layer for projects and tasks with all CRUD operations and auto-ordering logic
- 11 unit tests (TDD) covering create, getAll, getById, updateStatus, and delete for both services
- Four API route files wired to services with Zod validation and error keyword HTTP status mapping

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Types, validations, failing tests** - `f3da044` (test)
2. **Task 1 GREEN: projectService and taskService** - `d905ef7` (feat)
3. **Task 2: API routes for projects and tasks** - `ed1c2aa` (feat)

_Note: TDD task has test commit (RED) + implementation commit (GREEN)_

## Files Created/Modified
- `src/types/project.ts` - TaskStatus, TASK_STATUSES, COLUMN_LABELS, ProjectWithTasks, TaskWithAgent exports
- `src/lib/validations/project.ts` - CreateProjectSchema, UpdateProjectSchema (zod/v4)
- `src/lib/validations/task.ts` - CreateTaskSchema, UpdateTaskStatusSchema (zod/v4)
- `src/lib/services/project.ts` - projectService: getAll, getById, create, delete
- `src/lib/services/task.ts` - taskService: create (auto-order), updateStatus, delete
- `src/lib/services/__tests__/project.test.ts` - 4 tests for projectService
- `src/lib/services/__tests__/task.test.ts` - 7 tests for taskService
- `src/app/api/projects/route.ts` - GET/POST /api/projects
- `src/app/api/projects/[id]/route.ts` - GET/DELETE /api/projects/[id]
- `src/app/api/projects/[id]/tasks/route.ts` - GET/POST /api/projects/[id]/tasks
- `src/app/api/tasks/[id]/route.ts` - PATCH/DELETE /api/tasks/[id]

## Decisions Made
- Used Next.js 15 async params pattern (`params: Promise<{ id: string }>`) for all dynamic route handlers
- `projectService.getAll()` uses dual include: `_count` for totals and `tasks: { select: { status } }` for column distribution, keeping response lean
- Task auto-ordering queries aggregate max order on same project+status column, sets 0 for first task

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `agent-crud.test.ts` (missing `color` field) were present before this plan. Not caused by this work, out-of-scope, logged to deferred items.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All API contracts defined and tested - UI Plans 02 and 03 can proceed
- Types exported from `src/types/project.ts` ready for UI import
- Kanban drag-and-drop will use `PATCH /api/tasks/[id]` with UpdateTaskStatusSchema
- No blockers

---
*Phase: 08-project-management-task-kanban*
*Completed: 2026-03-11*
