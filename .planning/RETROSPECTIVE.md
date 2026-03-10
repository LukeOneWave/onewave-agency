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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 85 | 5 | Baseline — established GSD workflow with wave-based execution |

### Cumulative Quality

| Milestone | Tests | LOC | New Dependencies |
|-----------|-------|-----|-----------------|
| v1.0 | 36+ | 6,823 | recharts (1 new) |

### Top Lessons (Verified Across Milestones)

1. Cross-phase integration testing catches bugs that per-phase verification misses
2. Strict dependency ordering between phases prevents circular coupling
