---
phase: 07-custom-agents-session-history
plan: 02
subsystem: ui
tags: [nextjs, react, forms, agents, crud-ui, sonner, lucide-react]

# Dependency graph
requires:
  - phase: 07-custom-agents-session-history
    plan: 01
    provides: POST/PATCH/DELETE /api/agents endpoints, agentService CRUD methods, AgentFormData type

provides:
  - AgentForm component (create/edit mode) with all fields: name, division, description, role, personality, process, color (8 presets), tools
  - /agents/new page with clone-from query param support
  - /agents/[slug]/edit page with isCustom guard and pre-filled form
  - AgentDetail with clone/edit/delete action buttons; delete with confirmation and 409 handling
  - Custom badge on AgentCard and AgentDetail for isCustom agents
  - Create Agent button in catalog header
  - Fully dynamic /agents/[slug] page (removed generateStaticParams)

affects: [07-03-session-history]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buttonVariants() + Link for styled link-buttons (Button component does not support asChild)"
    - "systemPrompt parsing: extractSection() regex recovers role/personality/process from ## headings"
    - "AgentForm initializes from agent (edit), cloneData (clone), or empty (create)"
    - "Delete flow: window.confirm -> fetch DELETE -> 409 check -> toast + router.push"

key-files:
  created:
    - src/components/agents/AgentForm.tsx
    - src/app/agents/new/page.tsx
    - src/app/agents/[slug]/edit/page.tsx
  modified:
    - src/components/agents/AgentDetail.tsx
    - src/components/agents/AgentCard.tsx
    - src/app/agents/page.tsx
    - src/app/agents/[slug]/page.tsx
    - src/types/agent.ts

key-decisions:
  - "Used buttonVariants() + Link instead of Button asChild - base-ui Button does not support asChild prop"
  - "Clone button shown for all agents (seeded and custom) as any agent is a valid clone starting point"
  - "Removed generateStaticParams from [slug]/page.tsx - custom agents are dynamic and would 404 under SSG"

patterns-established:
  - "Styled link-buttons: cn(buttonVariants({ variant: 'outline' })) applied to <Link> elements"

requirements-completed: [AGNT-01, AGNT-02, AGNT-03]

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 07 Plan 02: Agent Builder UI Summary

**Agent builder UI with shared create/edit form, clone-from query param flow, custom badge on cards, and edit/clone/delete action buttons on agent detail page**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T05:07:02Z
- **Completed:** 2026-03-11T05:11:32Z
- **Tasks:** 2
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments

- AgentForm client component with all required fields, color preset buttons, and conditional POST/PATCH API routing
- Create page at /agents/new reads `cloneFrom` query param to pre-fill form from any agent
- Edit page at /agents/[slug]/edit guards non-custom agents with notFound()
- AgentDetail converted to client component with edit/clone/delete actions (clone for all, edit/delete for custom only)
- Custom badge on AgentCard and AgentDetail for custom agents; isCustom added to AgentCardData type
- Agent catalog page shows Create Agent button in header

## Task Commits

Each task was committed atomically:

1. **Task 1: AgentForm component and create/edit pages** - `79447f2` (feat)
2. **Task 2: Agent detail actions, card badges, and catalog create button** - `7c55cdf` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/components/agents/AgentForm.tsx` - Shared create/edit form with all fields, color presets, POST/PATCH routing
- `src/app/agents/new/page.tsx` - Server component, reads cloneFrom param, fetches divisions
- `src/app/agents/[slug]/edit/page.tsx` - Server component, guards isCustom, pre-fills agent data
- `src/components/agents/AgentDetail.tsx` - Client component with clone/edit/delete action buttons
- `src/components/agents/AgentCard.tsx` - Shows Custom badge when isCustom=true
- `src/app/agents/page.tsx` - Adds isCustom to cardData, Create Agent link-button in header
- `src/app/agents/[slug]/page.tsx` - Removed generateStaticParams, set dynamicParams=true
- `src/types/agent.ts` - Extended AgentCardData to include isCustom

## Decisions Made

- Used `buttonVariants()` utility + `<Link>` for styled navigation buttons instead of `Button asChild` — the base-ui Button component does not expose an `asChild` prop, causing TypeScript errors
- Clone button is shown for all agents (not just custom) because any agent is a valid starting point for a clone
- Removed `generateStaticParams` from the agent detail page so custom agents (created after build time) load correctly at runtime

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced Button asChild with buttonVariants-styled Links**
- **Found during:** Task 2 (AgentDetail actions, agents/page.tsx Create Agent button)
- **Issue:** Plan specified `<Button variant="outline" asChild>` pattern but `@base-ui/react/button` does not support `asChild` prop — TypeScript error during build
- **Fix:** Used `cn(buttonVariants({ variant: "outline" }))` applied to `<Link>` elements for navigation buttons; kept `<Button>` for the delete action (non-navigating click handler)
- **Files modified:** src/components/agents/AgentDetail.tsx, src/app/agents/page.tsx
- **Verification:** `npx next build` passes with no TypeScript errors
- **Committed in:** 7c55cdf (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in plan's Button usage pattern)
**Impact on plan:** Required fix for build to succeed. Functional outcome identical — styled link buttons navigate correctly.

## Issues Encountered

None beyond the auto-fixed Button asChild incompatibility.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Agent builder UI fully functional: create, edit, clone, delete flows ready for end-to-end testing
- Custom agents created via UI will appear in catalog with Custom badge
- Edit/delete buttons gated on isCustom, matching seeded agent read-only expectation
- No blockers for Plan 03 (session history)

---
*Phase: 07-custom-agents-session-history*
*Completed: 2026-03-11*
