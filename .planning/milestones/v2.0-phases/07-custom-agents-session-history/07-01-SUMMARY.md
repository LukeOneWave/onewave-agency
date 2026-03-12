---
phase: 07-custom-agents-session-history
plan: 01
subsystem: api
tags: [zod, prisma, nextjs, agent-crud, validation, tdd]

# Dependency graph
requires:
  - phase: 06-infrastructure-quick-wins
    provides: Prisma schema with Agent model including isCustom field and sessions relation

provides:
  - Zod v4 CreateAgentSchema and UpdateAgentSchema for agent form validation
  - agentService.create with slug generation, collision handling, systemPrompt composition
  - agentService.update with isCustom guard and field recomposition
  - agentService.delete with session count guard and seeded agent guard
  - agentService.getForClone returning form-ready data with (Copy) name suffix
  - POST /api/agents route handler (201 on success, 400 on invalid input)
  - PATCH /api/agents/[id] route handler (200, 400, 403, 404)
  - DELETE /api/agents/[id] route handler (200, 403, 404, 409)
  - AgentCreateInput, AgentUpdateInput, AgentFormData types

affects: [07-02-agent-builder-ui, 07-03-session-history]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod v4 imported as `import { z } from 'zod/v4'` (consistent with seed.ts convention)"
    - "Service layer guards: check isCustom before mutate, check session count before delete"
    - "systemPrompt composed from ## Role / ## Personality / ## Process markdown sections"
    - "Route handlers use async params pattern: `const { id } = await params`"
    - "Error message-based status code routing in route handlers (403/409/404)"

key-files:
  created:
    - src/lib/validations/agent.ts
    - src/app/api/agents/[id]/route.ts
    - src/app/api/agents/__tests__/route.test.ts
    - src/lib/services/__tests__/agent-crud.test.ts
  modified:
    - src/lib/services/agent.ts
    - src/types/agent.ts
    - src/app/api/agents/route.ts

key-decisions:
  - "Separate agent-crud.test.ts from existing agent.test.ts to isolate mocked vs real-DB tests"
  - "extractSection() helper parses existing systemPrompt to preserve unchanged sections on partial update"
  - "Error message keyword matching (seeded/sessions/not found) drives HTTP status codes in route handlers"

patterns-established:
  - "Agent system prompts: buildSystemPrompt({role, personality, process}) returns ## headings format"
  - "Slug uniqueness: generateSlug() + ensureUniqueSlug() appends -2/-3 suffix on conflict"
  - "TDD flow: write failing tests in separate file, commit RED, implement GREEN, verify"

requirements-completed: [AGNT-01, AGNT-02, AGNT-04]

# Metrics
duration: 10min
completed: 2026-03-11
---

# Phase 07 Plan 01: Custom Agents CRUD Backend Summary

**Agent CRUD backend with Zod v4 validation, slug collision handling, systemPrompt composition from role/personality/process sections, and guarded POST/PATCH/DELETE API endpoints**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-11T04:53:46Z
- **Completed:** 2026-03-11T05:04:11Z
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- Agent service CRUD methods with full guard logic (isCustom check, session count check)
- Zod v4 schema validation for create/update with type inference exported for form components
- Three new API endpoints (POST, PATCH, DELETE) returning correct status codes and error messages
- 25 automated tests passing (16 service tests + 9 route handler tests)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing service tests** - `293ddb7` (test)
2. **Task 1 GREEN: Validation schemas, service CRUD, types** - `e48ad40` (feat)
3. **Task 2: API route handlers with route tests** - `399ea72` (feat)

**Plan metadata:** (pending docs commit)

_Note: Task 1 used TDD — separate commits for RED (failing tests) and GREEN (implementation)_

## Files Created/Modified

- `src/lib/validations/agent.ts` - CreateAgentSchema and UpdateAgentSchema (Zod v4)
- `src/lib/services/agent.ts` - Extended with create, update, delete, getForClone methods plus helpers
- `src/types/agent.ts` - Added AgentCreateInput, AgentUpdateInput, AgentFormData types
- `src/app/api/agents/route.ts` - Added POST handler
- `src/app/api/agents/[id]/route.ts` - New PATCH and DELETE handlers
- `src/lib/services/__tests__/agent-crud.test.ts` - 16 service CRUD tests (mocked prisma)
- `src/app/api/agents/__tests__/route.test.ts` - 9 route handler tests (mocked service)

## Decisions Made

- Kept new CRUD tests in `agent-crud.test.ts` (separate from `agent.test.ts`) to isolate mocked vs real-DB tests — mixing them would break the existing integration tests
- `extractSection()` helper parses the existing systemPrompt markdown to recover role/personality/process on partial updates, so unchanged sections are preserved without requiring the caller to send all fields
- Route handlers use error message keyword matching to determine 403 vs 409 vs 404 — keeps error semantics in the service layer where the context is known

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

One pre-existing test failure in `src/app/api/chat/__tests__/route.test.ts` (unrelated streaming test). Confirmed pre-existing by stashing changes and verifying it fails on the prior commit. Out of scope per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All service methods and API endpoints ready for agent builder UI (Plan 02) to consume
- AgentCreateInput/AgentUpdateInput/AgentFormData types available for form component props
- POST, PATCH, DELETE endpoints tested and returning documented status codes
- No blockers for Plan 02

---
*Phase: 07-custom-agents-session-history*
*Completed: 2026-03-11*

## Self-Check: PASSED

All created files verified present. All task commits verified in git history.
