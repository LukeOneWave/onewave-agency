---
phase: 08-project-management-task-kanban
plan: 02
subsystem: ui
tags: [nextjs, react, typescript, tailwind, server-components]

# Dependency graph
requires:
  - phase: 08-project-management-task-kanban
    plan: 01
    provides: projectService.getAll(), ProjectWithTasks type, POST /api/projects
provides:
  - /projects page listing all projects with progress bars and agent avatars
  - /projects/new page with controlled form POSTing to /api/projects
  - ProjectCard component with task progress bar and agent avatar circles
  - ProjectForm client component with validation, error handling, and loading state
  - Updated Sidebar with Projects nav item (FolderKanban icon, between Agents and Chat)
affects:
  - 08-03 (kanban board accessible via ProjectCard links to /projects/[id])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component pages calling service layer directly (no fetch)
    - Inline Tailwind classes on Link for button-style CTAs (avoids buttonVariants client import in server components)
    - Agent avatar deduplication via Map by agent.id before rendering
    - Controlled form with useState + onBlur inline validation pattern

key-files:
  created:
    - src/app/projects/page.tsx
    - src/app/projects/loading.tsx
    - src/app/projects/new/page.tsx
    - src/components/projects/ProjectCard.tsx
    - src/components/projects/ProjectForm.tsx
  modified:
    - src/components/layout/Sidebar.tsx

key-decisions:
  - "Inline Tailwind classes on Link for New Project CTA (server component pattern, consistent with Phase 07 decision)"
  - "ProjectCard derives progress from tasks array status counts (no separate _count needed for done calculation)"
  - "Agent avatars deduplicated using Map<id, agent> before rendering, capped at 5 with overflow count"

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 08 Plan 02: Projects UI - List Page, Create Form, and Sidebar Navigation

**Server component projects list with progress bars and agent avatars, client form with validation, and sidebar nav entry**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-11T15:01:40Z
- **Completed:** 2026-03-11T15:03:40Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Projects list page (`/projects`) as a server component calling `projectService.getAll()` directly, rendering a 3-column grid of ProjectCard components
- ProjectCard showing project name, truncated description, progress bar (done/total), and up to 5 agent avatar circles with overflow count
- `/projects/new` page with a client-side `ProjectForm` featuring controlled inputs, onBlur name validation, sonner toast on error, and redirect on success
- Sidebar updated with FolderKanban icon for Projects nav item between Agents and Chat
- Loading skeleton for projects page matching the 3-column card grid layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Projects list page, ProjectCard, sidebar nav** - `41d0865` (feat)
2. **Task 2: Create project form and /projects/new page** - `147799f` (feat)

## Files Created/Modified

- `src/components/layout/Sidebar.tsx` - Added FolderKanban import and Projects nav item
- `src/components/projects/ProjectCard.tsx` - Progress bar, agent avatars (deduped), link to project detail
- `src/components/projects/ProjectForm.tsx` - Controlled form, POST to /api/projects, redirect, error toast
- `src/app/projects/page.tsx` - Server component listing projects in 3-col grid with empty state
- `src/app/projects/loading.tsx` - Skeleton grid with 6 card skeletons, matching page structure
- `src/app/projects/new/page.tsx` - Server wrapper for ProjectForm in max-w-lg container

## Decisions Made

- Used inline Tailwind classes on Link for the "New Project" CTA button in the server component page — consistent with Phase 07 decision to avoid importing `buttonVariants` (a client module) in server components
- ProjectCard calculates `doneTasks` by filtering `project.tasks` array for `status === "done"`, giving exact done count per card without additional DB queries
- Agent avatars use `Map<id, agent>` deduplication so each assigned agent appears only once even if assigned to multiple tasks

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

All created files verified to exist and all commits verified in git log.
