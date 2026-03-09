# Project Research Summary

**Project:** OneWave AI Digital Agency
**Domain:** AI agent management platform (local, single-user, review-centric)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

OneWave is a local Next.js application for managing 61 specialized AI agents organized across 9 divisions. The product's unique position is treating AI output as reviewable work product rather than disposable chat -- the review workflow is the centerpiece. Research confirms this is a genuine gap: no existing platform (CrewAI, Vibe Kanban, ChatGPT/Claude UI) combines a specialized agent catalog with structured deliverable review. The recommended approach is a monolithic Next.js 15 App Router application with a service-layer architecture, using AI SDK 6 for Claude streaming, Prisma 7 with SQLite for zero-config persistence, and shadcn/ui for a polished component library.

The build should follow a strict dependency chain: agents first (the atomic unit everything references), then chat with streaming (the primary interaction that produces raw material), then the review system (the core differentiator), then project management (organizational scaffolding), then multi-agent orchestration (the most complex feature), and finally polish. This ordering is not arbitrary -- each layer depends on the one before it. Attempting to build orchestration before chat and review are solid will result in compounding bugs.

The top risks are: SSE streaming error handling (errors arrive mid-stream after HTTP 200, requiring event-level error detection), SQLite write contention during parallel agent execution (requires WAL mode and write buffering from day one), and the review workflow becoming unused dead weight if it feels bolted onto chat rather than integrated into it. All three are preventable with upfront architectural decisions documented in detail across the research files.

## Key Findings

### Recommended Stack

The stack is modern, well-supported, and specifically chosen for a single-user local application. Every technology is at its current stable version with strong ecosystem support. See `.planning/research/STACK.md` for full rationale and installation commands.

**Core technologies:**
- **Next.js 15.x + React 19 + TypeScript:** App framework with App Router, SSR, API routes. Not 14 (too old) or 16 (breaking changes still settling).
- **AI SDK 6 + @ai-sdk/anthropic 3.x:** Streaming chat, tool execution, agent orchestration. Replaces need to hand-roll SSE streaming from Claude.
- **Prisma 7 + SQLite (better-sqlite3 adapter):** Type-safe ORM with zero-config file database. No Docker, no external services.
- **shadcn/ui + Tailwind CSS 4:** Component library as source code (full ownership) with utility-first CSS. Includes Command palette, drag-and-drop via dnd-kit.
- **Zustand 5:** Lightweight client state for app-level concerns. Chat state lives in AI SDK's useChat hook.

### Expected Features

**Must have (table stakes):**
- Agent catalog with division filtering and search
- Agent detail view (personality, process, tools from YAML frontmatter)
- Chat with streaming responses and markdown/code rendering
- Conversation history and persistence
- Settings with API key management (gate for all AI functionality)
- Dashboard with activity overview and review queue
- Dark mode (default), loading/empty/error states
- Global search (Cmd+K) and keyboard shortcuts

**Should have (differentiators):**
- Review workflow for agent deliverables (approve, revise, edit inline, comment) -- THE core differentiator
- Review queue surfaced prominently on dashboard
- Inline editing of agent output with diff view
- Project management with agent assignment and task Kanban
- Multi-agent orchestration with parallel execution lanes
- Orchestration review board (Kanban for deliverable status)

**Defer (v2+):**
- Custom agent creation/editing (61 built-in agents are sufficient initially)
- Agent utilization charts (needs accumulated usage data)
- Orchestration review board (depends on both orchestration AND review being solid)
- Usage billing / cost dashboards (show token counts, defer cost analytics)

### Architecture Approach

A monolithic Next.js App Router application with clearly separated layers: thin API routes and Server Actions handling HTTP concerns, a service layer (AgentService, ChatService, ProjectService, ReviewService, OrchestrationService, DeliverableService) containing all business logic, and Prisma as the data access layer over SQLite. The architecture is review-centric -- every data flow ultimately produces deliverables that enter the review pipeline. See `.planning/research/ARCHITECTURE.md` for full data model, directory structure, and data flow diagrams.

**Major components:**
1. **Service Layer** -- Six services encapsulating all business logic, keeping API routes thin and testable
2. **Deliverable System** -- First-class entities extracted from chat (typed, versioned, with review status), not just chat messages
3. **Centralized Orchestrator** -- Single OrchestrationService dispatches to agents and collects results; no peer-to-peer agent communication
4. **SSE Streaming** -- All real-time data (chat, orchestration progress, review updates) via Server-Sent Events, not WebSockets

### Critical Pitfalls

1. **Streaming errors after 200 OK** -- Claude streaming returns 200 immediately; mid-stream errors (429, 529, network drops) bypass HTTP error handling. Must listen for SSE error events, track message completion status, and show retry buttons on partial responses.
2. **SQLite write contention** -- Parallel agents in orchestration trigger concurrent writes. Enable WAL mode, buffer writes in memory, batch to DB at intervals, and set generous busy_timeout. Design the write-buffering pattern in the chat phase so orchestration inherits it.
3. **Review workflow nobody uses** -- If review feels like separate bureaucracy bolted onto chat, users skip it. Surface review inline in chat when deliverables are detected, keep actions to one-click, and make the dashboard's primary CTA the pending review count.
4. **SSE connection leaks** -- Orphaned SSE connections from navigation/unmounting hit browser's 6-connection limit. Use AbortController in every streaming fetch, implement a connection manager singleton, and multiplex parallel agent streams over a single SSE connection.
5. **The prompting fallacy** -- When multi-agent output is poor, teams tweak prompts instead of fixing architectural issues (output format inconsistency, missing context sharing). Define explicit output schemas per agent role and validate outputs before review.

## Implications for Roadmap

Based on combined research, the build should follow 6 phases driven by dependency chains. Each phase produces a working increment.

### Phase 1: Foundation and Agent Catalog
**Rationale:** Agents are the atomic unit -- every feature references them. Database and UI scaffolding must exist before anything else.
**Delivers:** Working app with Prisma schema, SQLite setup, agent seeding from markdown files, agent browsing/filtering UI, agent detail view, settings page with API key management, dark mode, app shell with navigation.
**Features addressed:** Agent catalog, agent detail, settings, dark mode, loading/empty states.
**Pitfalls to avoid:** Prisma singleton pattern (HMR creates multiple clients without it), agent seeding fragility (use gray-matter + Zod validation), API key must stay server-side only.
**Research needed:** LOW -- standard CRUD patterns, well-documented.

### Phase 2: Chat and Streaming
**Rationale:** Chat is the primary interaction and produces the raw material (messages) for everything downstream. Must get streaming, error handling, and connection management right here.
**Delivers:** Working chat with any agent via streaming Claude responses, conversation history, markdown/code rendering, message persistence.
**Features addressed:** Chat with streaming, conversation history, rich markdown rendering.
**Pitfalls to avoid:** SSE error handling after 200 (track message completion status), connection leak management (AbortController + connection manager singleton), markdown XSS (use rehype-sanitize), write buffering pattern (establish here for orchestration to inherit).
**Research needed:** MEDIUM -- AI SDK 6 Agent abstraction and streaming patterns may warrant a quick `/gsd:research-phase` to nail the exact API usage.

### Phase 3: Review System
**Rationale:** The core differentiator. Must exist before project management and orchestration, which both produce deliverables in bulk. Building review after orchestration means a flood of unreviewed deliverables with no workflow to handle them.
**Delivers:** Deliverable extraction from chat, review panel (approve/revise/edit inline/comment), review queue on dashboard, deliverable versioning on revision.
**Features addressed:** Review workflow, review queue, inline editing, review comments.
**Pitfalls to avoid:** Review feeling bolted on (surface review inline in chat, auto-detect deliverables, one-click actions, keyboard shortcuts a/r/j/k). This is the make-or-break phase for the product's value proposition.
**Research needed:** MEDIUM -- the deliverable extraction heuristic (identifying reviewable content in chat) has no established pattern. Needs design thinking.

### Phase 4: Project Management and Kanban
**Rationale:** Organizational scaffolding that ties agents, tasks, and deliverables together. Depends on agents (Phase 1) and deliverables (Phase 3).
**Delivers:** Project CRUD, task Kanban board with drag-and-drop, agent assignment to tasks, deliverables tab on projects.
**Features addressed:** Project management, task Kanban, agent assignment, deliverables aggregation.
**Pitfalls to avoid:** Kanban performance (use dnd-kit from the start, memoize cards, optimistic updates).
**Research needed:** LOW -- dnd-kit + shadcn/ui Kanban is a well-documented pattern with multiple open-source references.

### Phase 5: Multi-Agent Orchestration
**Rationale:** Most complex feature. Depends on chat (Phase 2), review (Phase 3), and projects (Phase 4) all being solid. Building this too early compounds bugs from incomplete foundations.
**Delivers:** Orchestration runs with parallel agent execution, independent SSE streams per agent, orchestration progress UI with parallel lanes, deliverables flowing into review queue.
**Features addressed:** Multi-agent orchestration, parallel execution, orchestration review board.
**Pitfalls to avoid:** SQLite write contention (WAL mode + write queue + batch writes), SSE connection limits (multiplex streams), prompting fallacy (enforce output schemas, start sequential before parallel), token cost blindness (track and display cost per orchestration run).
**Research needed:** HIGH -- multi-agent coordination, stream multiplexing, and the orchestrator pattern need dedicated research. This is where novel engineering happens.

### Phase 6: Polish and Search
**Rationale:** Touches all surfaces; benefits from stable underlying features. Data-dependent features (utilization charts, activity feeds) need accumulated usage.
**Delivers:** Dashboard stats and activity feed, Cmd+K global search, keyboard shortcuts across all views, animations, refined loading/empty states.
**Features addressed:** Global search, keyboard shortcuts, agent utilization charts, dashboard enhancements.
**Pitfalls to avoid:** Search performance on large datasets (use SQLite FTS5 for chat messages), glassmorphism contrast issues in dark mode.
**Research needed:** LOW -- standard UI polish patterns.

### Phase Ordering Rationale

- Agents first because they are referenced by every other entity (sessions, tasks, orchestration steps).
- Chat before review because review operates on deliverables extracted from chat output.
- Review before orchestration because orchestration produces many deliverables simultaneously -- without a working review pipeline, they pile up with no workflow.
- Projects after review because project deliverables tab aggregates review statuses.
- Orchestration last among core features because it depends on chat + review + projects all working correctly.
- Polish last because it spans all surfaces and needs stable foundations to refine.

### Research Flags

**Phases likely needing `/gsd:research-phase` during planning:**
- **Phase 2 (Chat):** AI SDK 6 streaming patterns, SSE error recovery strategies, connection management architecture.
- **Phase 3 (Review):** Deliverable extraction heuristics -- no established pattern for identifying reviewable content in LLM chat responses.
- **Phase 5 (Orchestration):** Multi-agent coordination, stream multiplexing, write contention prevention, output schema enforcement. This is the highest-risk phase.

**Phases with standard patterns (skip research):**
- **Phase 1 (Foundation):** Standard Next.js + Prisma + shadcn/ui setup. Well-documented.
- **Phase 4 (Project/Kanban):** dnd-kit + shadcn/ui Kanban has multiple production references.
- **Phase 6 (Polish):** Standard UI refinement patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are current stable versions with official documentation. AI SDK 6 and Prisma 7 are mature. No speculative choices. |
| Features | MEDIUM-HIGH | Table stakes are clear from competitive analysis. Differentiator value (review workflow) is validated by the gap analysis but untested with real users. |
| Architecture | HIGH | Monolithic Next.js with service layer is the standard pattern. Data model is well-defined. Build order rationale is dependency-driven. |
| Pitfalls | HIGH | Critical pitfalls are verified across multiple authoritative sources (Anthropic docs, SQLite docs, browser specs). Review UX pitfall is MEDIUM confidence -- synthesized from patterns, no direct precedent. |

**Overall confidence:** HIGH

### Gaps to Address

- **Deliverable extraction logic:** How exactly to detect reviewable content in agent chat responses (code blocks? document markers? agent-declared deliverables?). Needs design decision during Phase 3 planning.
- **Stream multiplexing for orchestration:** The exact pattern for multiplexing N agent streams over one SSE connection is not well-documented. Needs prototyping during Phase 5.
- **Review UX validation:** No precedent for a single-user review workflow for AI output. The UX assumptions (inline review in chat, one-click actions) need validation during Phase 3 implementation. Be prepared to iterate.
- **Agent YAML consistency:** The 61 agent markdown files may have formatting inconsistencies. The seed script needs to be robust, but specific edge cases are unknown until implementation.
- **Token cost display:** Anthropic pricing is public, but the exact token metadata available in AI SDK 6 streaming responses needs verification during Phase 2.

## Sources

### Primary (HIGH confidence)
- [AI SDK 6 Documentation](https://ai-sdk.dev/docs/introduction) -- streaming, agents, tool calling
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) -- Claude integration
- [Prisma Next.js Guide](https://www.prisma.io/nextjs) -- singleton pattern, SQLite setup
- [Prisma SQLite Quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite) -- schema, migrations
- [Next.js 15 Blog](https://nextjs.org/blog/next-15) -- version rationale
- [Anthropic Streaming Docs](https://platform.claude.com/docs/en/build-with-claude/streaming) -- SSE event types, error handling
- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) -- 429/529 handling
- [Microsoft AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) -- orchestrator pattern
- [dnd-kit](https://dndkit.com/) -- drag-and-drop library
- [SQLite Concurrent Writes](https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/) -- WAL mode, contention

### Secondary (MEDIUM confidence)
- [GitHub Blog: Multi-agent workflows](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/) -- orchestration failure patterns
- [Anthropic Engineering: Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) -- agent coordination
- [O'Reilly: Multi-Agent Architectures](https://www.oreilly.com/radar/designing-effective-multi-agent-architectures/) -- prompting fallacy
- [Vibe Kanban](https://vibekanban.com/) -- competitive analysis, parallel agent execution patterns
- [CrewAI](https://crewai.com/) -- competitive analysis, multi-agent platform patterns
- [Permit.io HITL Patterns](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo) -- review workflow patterns
- [Designative: Agentic AI UX](https://www.designative.info/2025/11/20/flows-age-agentic-ai-what-if-our-core-ux-models-no-longer-apply/) -- review workflow UX

### Tertiary (needs validation)
- shadcn/ui CLI v4 agent-friendly skills -- referenced but changelog needs verification during implementation
- better-sqlite3 adapter "100x faster" claim -- directionally correct but benchmark conditions unknown
- Multi-agent stream multiplexing pattern -- described in concept, no production reference found

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
