# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-10
**Phases:** 5 | **Plans:** 14 | **Commits:** 85

### What Was Built
- Full agent catalog with 61 agents across 9 divisions, searchable and filterable
- Real-time streaming chat with Claude API, markdown rendering, model selection
- Deliverable review system with approve/revise workflow and automatic revision loop
- Multi-agent orchestration with parallel streaming lanes and team collaboration context
- Dashboard with stats aggregation, activity feed, and Recharts utilization chart

### What Worked
- Strict dependency chain (agents → chat → review → orchestration → dashboard) kept each phase focused and buildable
- SSE for both single-agent and multi-agent streaming — simple, reliable, no WebSocket overhead
- XML `<deliverable>` tags for deliverable extraction — deterministic, testable, no LLM parsing needed
- Team collaboration context via system prompt amendment — each agent knows its team without inter-agent messaging
- TDD approach in later phases caught integration issues early (dashboard service, orchestration tests)

### What Was Inefficient
- Phase 1 VERIFICATION.md was not generated (early phase before verifier was added)
- Phase 1 plan checkboxes in ROADMAP.md never got checked despite completion
- Integration bugs (messageId handoff, AgentLane wrong API endpoint) only caught during milestone audit — earlier cross-phase integration testing would have caught these sooner
- Some Vitest worker timeout issues on full suite runs (intermittent, not blocking)

### Patterns Established
- Multiplexed SSE with lane-tagged events for parallel agent streaming
- Shared `deliverableInstruction` constant appended to all agent system prompts
- Optimistic UI updates with server revert pattern for deliverable actions
- `prisma db push` for non-destructive schema evolution during development
- Promise.all for parallel Prisma queries in service layers

### Key Lessons
1. Always include messageId in SSE done events when downstream features need to reference persisted messages
2. Cross-phase wiring should be verified before milestone completion, not just per-phase verification
3. Team collaboration context in system prompts is a lightweight alternative to inter-agent messaging
4. Decoupling async operations from navigation (createMission vs connectStream) prevents UI blocking

### Cost Observations
- Model mix: 100% sonnet for execution, sonnet for verification
- Sessions: ~6 (planning + execution across 5 phases + fixes)
- Notable: Entire v1.0 built in a single day — GSD workflow parallelization was highly effective

---

## Milestone: v2.0 — Power User Platform

**Shipped:** 2026-03-12
**Phases:** 6 | **Plans:** 16 | **Commits:** ~90

### What Was Built
- Custom agent CRUD with form builder, clone flow, delete guards, and session history browsing
- Project management with drag-and-drop Kanban board (dnd-kit), task creation, agent assignment
- Advanced review: side-by-side diff viewer (react-diff-viewer-continued), inline content editor, version tracking
- Orchestration review board — Kanban for mission deliverables with optimistic drag updates
- Global Cmd+K command palette (cmdk) with debounced search across agents, projects, sessions
- Production polish: page transitions, hover/press feedback, staggered entrance animations, loading skeletons

### What Worked
- Wave-based parallel execution for independent plans within phases (e.g., Phase 7 plans 1-3 in parallel)
- dnd-kit drag-and-drop pattern established in Phase 8 Kanban, cleanly reused in Phase 9 ReviewBoard
- confirmedRef pattern for optimistic UI with server-confirmed revert — solved stale closure problem elegantly
- motion-safe: CSS prefix strategy for accessible animations — zero extra JS, pure CSS
- TDD for service layers (search, task, deliverable) caught edge cases before UI integration
- Milestone audit caught taskService.create missing assignedAgent include — fixed before it became a user-facing bug

### What Was Inefficient
- Phase 6 ROADMAP checkboxes not marked complete (cosmetic tracking gap carried from v1.0)
- VALIDATION.md nyquist_compliant frontmatter never updated to true across all 6 phases — purely cosmetic
- PageTransition had animation bugs (missing fill-mode-both, duplicate classes) caught during visual testing, not unit tests
- Deliverable cards not clickable until manually noticed — needed message.sessionId include in Prisma query
- Dev server occasionally bogged down requiring full .next cache clear and restart

### Patterns Established
- confirmedRef: useRef tracks server-confirmed state for drag-and-drop revert-on-error
- Stagger entrance: motion-safe:animate-in with capped delay (Math.min(i * interval, 240ms))
- Card hover pattern: transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]
- shouldFilter={false} for server-filtered cmdk command palettes
- Dual API call on deliverable save: PATCH content + POST version snapshot in sequence
- Lazy-load pattern: DiffViewer fetches versions only on first panel open

### Key Lessons
1. Visual bugs (animation displacement, missing fill-mode) are hard to catch with unit tests — need visual verification checkpoints
2. Include all related data in Prisma create/update responses (e.g., assignedAgent) to avoid stale UI on initial render
3. Reusing established patterns (Kanban, optimistic updates) across features accelerates development significantly
4. motion-safe: prefix is the right default for all CSS animations — accessibility at zero cost
5. Server-filtered results need shouldFilter={false} in cmdk — otherwise double-filtering produces empty results

### Cost Observations
- Model mix: sonnet for execution subagents, opus for orchestration and planning
- Sessions: ~8 (research + planning + execution across 6 phases + fixes + audit)
- Notable: Full v2.0 built in 3 days — 16 plans, 19 requirements, all passing audit

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 85 | 5 | Baseline — established GSD workflow with wave-based execution |
| v2.0 | ~90 | 6 | Pattern reuse across phases (Kanban, optimistic UI), parallel plan execution |

### Cumulative Quality

| Milestone | Tests | LOC | New Dependencies |
|-----------|-------|-----|-----------------|
| v1.0 | 36+ | 6,823 | recharts (1 new) |
| v2.0 | 50+ | 12,504 | dnd-kit, cmdk, react-diff-viewer-continued, tw-animate-css |

### Top Lessons (Verified Across Milestones)

1. Cross-phase integration testing catches bugs that per-phase verification misses
2. Strict dependency ordering between phases prevents circular coupling
3. Pattern reuse (Kanban, optimistic updates, TDD mocks) compounds development speed across phases
4. Visual verification checkpoints are essential — unit tests alone miss animation and interaction bugs
5. Always include related data in Prisma mutation responses to avoid stale UI
