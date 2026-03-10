# Project Research Summary

**Project:** OneWave AI Digital Agency v2.0
**Domain:** AI agent management platform -- v2.0 power-user features added to existing local Next.js app
**Researched:** 2026-03-10
**Confidence:** HIGH

## Executive Summary

OneWave v1.0 is a shipped, working local application (172 files, 6,823 LOC) for managing 61 AI agents with streaming chat, deliverable review, multi-agent orchestration, and a dashboard. The v2.0 research focused exclusively on NEW features: custom agent creation, Kanban boards (task + orchestration), diff view between deliverable revisions, inline editing and commenting, global search (Cmd+K), keyboard shortcuts, session history, project management, and production polish. The existing stack (Next.js 16, React 19, Prisma 7, SQLite, Zustand, shadcn/ui, Tailwind v4) is validated and unchanged. Only 6 new npm packages are needed (~60kb gzipped total): motion, @dnd-kit/core + sortable + utilities, diff, and react-diff-viewer-continued. Nine new shadcn/ui components are added via CLI (no npm deps).

The recommended approach is incremental: start with schema migration and infrastructure (new Prisma models, store conventions, shortcut registry), then build independent quick-win features (theme toggle, review queue, session history, custom agents), then tackle the complex interactive features (Kanban boards with dnd-kit, diff view, inline editing), and finish with power-user UX (Cmd+K, keyboard shortcuts) and production polish (animations, skeletons, transitions). This order is driven by three factors: schema dependencies (Project/Task/DeliverableVersion/Comment models must exist before features that use them), shared component reuse (Kanban primitives built once, used by both task board and orchestration review board), and risk sequencing (the hardest problems -- drag-and-drop, inline editing cursor management, text range commenting -- come after simpler features validate the patterns).

The top risks are: SQLite migration destroying existing data (all new foreign keys on existing tables MUST be optional), monolithic Zustand stores becoming unmaintainable (enforce one store per feature domain from day one), keyboard shortcuts firing inside text inputs (build centralized registry before any individual shortcuts), and contentEditable cursor jumping making inline editing unusable (use click-to-edit with textarea, not raw contentEditable). All four are preventable with upfront architectural decisions.

## Key Findings

### Recommended Stack

The existing stack is fully validated. New additions are minimal and targeted. See `.planning/research/STACK.md` for full rationale, alternatives considered, and installation commands.

**New dependencies (6 packages, ~60kb gzipped):**
- **motion (v12.35):** Page transitions, layout animations, drag feedback -- CSS cannot animate unmounting components or layout reflows
- **@dnd-kit/core + sortable + utilities:** Kanban drag-and-drop -- lightweight (~10kb), accessible, proven with shadcn/ui + Tailwind
- **diff + react-diff-viewer-continued:** Deliverable revision diffing -- GitHub-style split/unified diff view from string comparison

**Explicitly NOT adding:** Tiptap/Slate (overkill for markdown editing), react-hotkeys-hook (custom 50-line hook suffices), @tanstack/react-query (would create two state management patterns), any auth library (single-user local app), any search engine (SQLite LIKE is sub-millisecond at this scale).

**New shadcn/ui components (9, via CLI):** command, dialog, skeleton, switch, select, popover, context-menu, progress, collapsible.

### Expected Features

See `.planning/research/FEATURES.md` for full feature landscape with complexity estimates and dependency mapping.

**Must have (table stakes for v2.0):**
- Dark/light mode toggle -- next-themes already installed, just needs a button
- Review queue on dashboard -- aggregation query over existing Deliverable model
- Session history and resumption -- existing ChatSession/Message models, needs sidebar UI
- Keyboard shortcuts for review (j/k/a/r) -- standard Gmail/GitHub pattern
- Loading skeletons -- baseline UX in 2026
- Global search (Cmd+K) -- every modern productivity tool has this

**Should have (differentiators):**
- Custom agent builder -- transforms fixed toolkit into configurable platform
- Diff view between deliverable revisions -- makes iterative review genuinely useful
- Inline editing on deliverables -- edit without re-prompting
- Orchestration review board (Kanban) -- visual multi-agent output review
- Task Kanban with project management -- visual project workflow with agent assignment
- Page transitions and micro-interactions -- production polish

**Defer to v3+:**
- Inline commenting with text range anchoring -- highest complexity for lowest single-user value
- Full project management suite (Gantt, timelines, dependencies) -- scope creep, this is an AI tool not Monday.com
- AI-powered semantic search -- SQLite is fast enough, no vector DB needed
- Agent marketplace/sharing -- single user, no network

### Architecture Approach

v2.0 extends the established 4-layer architecture (Presentation > State > API > Service > Data) without changing patterns. New features follow existing conventions: server components fetch initial data, client components handle mutations with optimistic Zustand updates, API routes stay thin with business logic in services. See `.planning/research/ARCHITECTURE.md` for full system diagram, data flows, and ~40 new files breakdown.

**Major new components:**
1. **KanbanBoard/KanbanColumn/TaskCard** -- Shared primitives used by both task Kanban AND orchestration review board
2. **AgentEditor** -- Form for custom agent CRUD, reuses Agent detail layout
3. **DiffViewer** -- Side-by-side/unified diff between DeliverableVersion records
4. **CommandPalette** -- Cmd+K overlay using shadcn Command, searches agents/projects/sessions
5. **InlineEditor** -- Click-to-edit textarea toggle on deliverable content (NOT contentEditable)

**New Prisma models (4):** Project, Task, DeliverableVersion, Comment
**Modified models (3):** Agent (+tasks relation), ChatSession (+task relation), Deliverable (+content field, +versions, +comments)
**New Zustand stores (3):** useProjectStore, useCommandStore, useReviewStore
**New service files (3):** projectService, searchService, commentService
**New API routes (~12):** agents CRUD, projects CRUD, tasks CRUD + reorder, search, review/pending, deliverable versions, comments

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 14 pitfalls with detailed prevention strategies.

1. **SQLite migration destroys existing data** -- Adding required foreign keys to populated tables causes Prisma to suggest `migrate reset`. Prevention: all new FKs on existing tables MUST be optional, use `--create-only` to review SQL first, back up dev.db before every migration.
2. **Monolithic Zustand store** -- Adding Kanban/search/review state to existing 300-line chat store creates cascading re-renders. Prevention: dedicated stores per domain, Zustand selectors everywhere, never mix server-cache and UI state.
3. **Keyboard shortcuts fire in text inputs** -- Pressing "a" to type "and" triggers "approve deliverable." Prevention: centralized shortcut registry with ONE document listener, always check event.target for input/textarea/contenteditable.
4. **ContentEditable cursor jumping** -- React reconciliation resets browser Selection API on re-render, making inline editing unusable. Prevention: use click-to-edit with textarea toggle, NOT raw contentEditable with React state.
5. **Cmd+K search feels laggy** -- Prisma `contains` on SQLite is unindexed substring scan. Prevention: client-side fuzzy search (or simple LIKE) is fine for <1000 items at single-user scale; debounce at 150ms minimum.

## Implications for Roadmap

Based on combined research, suggested 6-phase structure driven by schema dependencies, shared component reuse, and risk sequencing.

### Phase 1: Schema Migration + Infrastructure + Quick Wins
**Rationale:** Every feature depends on schema. Store conventions and shortcut registry must be established before building features. Quick wins (theme toggle, review queue, skeletons) ship immediately to validate the upgrade path.
**Delivers:** Prisma migration (4 new models + 3 model modifications), 3 new Zustand stores (empty shells with conventions), keyboard shortcut registry, theme toggle, review queue dashboard widget, loading skeletons.
**Features addressed:** Dark/light toggle, review queue widget, loading skeletons.
**Avoids:** Data loss from careless migration (Pitfall 1), monolithic store (Pitfall 2), shortcuts in inputs (Pitfall 3).
**Stack:** No new npm deps needed -- uses existing next-themes, shadcn skeleton/switch, Zustand.

### Phase 2: Custom Agents + Session History
**Rationale:** Independent features with no cross-dependencies. Both extend existing patterns (Agent CRUD, ChatSession queries). Quick wins that are immediately visible and useful. Custom agents unlocks platform extensibility.
**Delivers:** AgentEditor form, /agents/new and /agents/[slug]/edit pages, agent API CRUD routes, enhanced /chat page with session search/filter/auto-titles, session sidebar.
**Features addressed:** Custom agent builder, session history and resumption.
**Avoids:** Broken agents from missing validation (Pitfall 8 -- Zod validation, auto-slug, protect seeded agents), session list loading all message content (Pitfall 14 -- metadata-only endpoint).
**Stack:** No new npm deps.

### Phase 3: Project Management + Task Kanban
**Rationale:** Establishes the Kanban interaction pattern (dnd-kit + shadcn Card + optimistic Zustand) that is reused in Phase 4. New Project/Task models are the organizational backbone.
**Delivers:** Project pages + API routes, KanbanBoard + KanbanColumn + TaskCard shared components, useProjectStore with optimistic drag-and-drop, agent assignment to tasks.
**Features addressed:** Task Kanban board, project management with agent assignment.
**Avoids:** Server Component hydration mismatch (Pitfall 6 -- "use client" boundary on entire board), scope creep (Pitfall 9 -- strict 2-model limit, 4 statuses only, no due dates/dependencies/subtasks).
**Stack:** @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities (install at phase start).

### Phase 4: Advanced Review Features
**Rationale:** Depends on DeliverableVersion schema (Phase 1) AND Kanban patterns (Phase 3). Groups all deliverable-enhancement features together since they share the version model and review UX.
**Delivers:** DeliverableVersion content snapshots on revision, DiffViewer component (split/unified), InlineEditor (click-to-edit textarea), comment system with character anchoring, MissionKanban (reuses Phase 3 Kanban primitives), orchestration review board tab.
**Features addressed:** Diff view between revisions, inline editing, inline commenting, orchestration review board.
**Avoids:** ContentEditable cursor jumping (Pitfall 4 -- textarea toggle, not contentEditable), diff performance on large deliverables (Pitfall 7 -- virtualization, cache diffs), N+1 review queue queries (Pitfall 10 -- single Prisma include with nested relations).
**Stack:** diff + react-diff-viewer-continued (install at phase start).

### Phase 5: Power User UX
**Rationale:** Search needs routes from Phases 2-4 to have navigation targets. Shortcuts need reviewable content from Phase 4 to act on. These are cross-cutting features that span all surfaces.
**Delivers:** CommandPalette (Cmd+K) with grouped results, useCommandStore, keyboard navigation (j/k/a/r) for review queue, shortcut help overlay (?), keyboard-first review workflow.
**Features addressed:** Global search (Cmd+K), keyboard shortcuts for review.
**Avoids:** Search lag (Pitfall 5 -- client-side filtering sufficient at this scale, debounce 150ms).
**Stack:** shadcn command component (install via CLI at phase start).

### Phase 6: Production Polish
**Rationale:** Polish is cosmetic. Apply once functionality is stable across all routes. Animations added last avoid jank during rapid feature development.
**Delivers:** Page transitions (AnimatePresence), entrance animations, micro-interactions (hover/press), empty states for all new pages, refined loading states.
**Features addressed:** Page transitions and animations, micro-interactions.
**Avoids:** Animation jank in lists (Pitfall 13 -- CSS transitions first, motion sparingly, virtualize before animating).
**Stack:** motion (install at phase start).

### Phase Ordering Rationale

- Schema first because Project, Task, DeliverableVersion, and Comment models are referenced by features in every subsequent phase.
- Quick wins (toggle, queue, skeletons) in Phase 1 to ship immediate visible progress.
- Custom agents and session history are independent, zero cross-dependencies -- parallel-friendly.
- Task Kanban before advanced review because the Kanban interaction pattern (dnd-kit wiring, optimistic store updates, column reordering) is reused by the orchestration review board.
- All deliverable-enhancement features (diff, inline edit, comments) grouped together because they share the DeliverableVersion model and review UX context.
- Power user UX (search, shortcuts) last among functional features because they are cross-cutting and need navigation targets from all prior phases.
- Polish last because it spans every surface and benefits from stable foundations.

### Research Flags

**Phases likely needing `/gsd:research-phase` during planning:**
- **Phase 3 (Kanban):** dnd-kit cross-container sorting with optimistic reordering has nuances. The Georgegriff reference implementation should be studied closely. Moderate complexity.
- **Phase 4 (Advanced Review):** Deliverable content snapshotting (extracting content from Message.content using parseDeliverables) is the most impactful schema change. The inline comment anchoring strategy (character offset vs text snippet) needs a firm design decision.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Infrastructure):** Standard Prisma migration, Zustand store setup, shadcn component installation. Well-documented.
- **Phase 2 (Custom Agents + Sessions):** CRUD forms, API routes, session list queries. Extends existing patterns exactly.
- **Phase 5 (Power User UX):** shadcn Command component is purpose-built for Cmd+K. Keyboard shortcut hook is ~50 lines.
- **Phase 6 (Polish):** Motion library has extensive documentation and examples.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 6 new packages, all actively maintained with recent releases. Existing stack validated at current versions. Zero speculative choices. |
| Features | MEDIUM-HIGH | Table stakes are clear from competitive analysis. Priority ordering is well-reasoned. Inline commenting complexity may be underestimated -- consider deferring to v3. |
| Architecture | HIGH | Direct codebase analysis of 172 existing files. New features follow established patterns exactly. ~40 new files, ~12 modified files -- scope is well-defined. |
| Pitfalls | HIGH | 14 pitfalls identified across critical/moderate/minor. Top 5 are verified with authoritative sources. Phase-specific warnings mapped to mitigation strategies. |

**Overall confidence:** HIGH

### Gaps to Address

- **DeliverableVersion content extraction:** The existing `parseDeliverables()` regex extracts deliverable content at render time from `Message.content`. For versioning, this content must be snapshotted into `Deliverable.content`. The exact trigger point (on message save? on first review action?) needs a design decision during Phase 1 migration planning.
- **Comment anchoring strategy:** STACK.md recommends character offset (`anchorStart`/`anchorEnd`), FEATURES.md recommends text snippet (`anchorText`). These break differently when content is edited. Need to pick one strategy before Phase 4. Recommendation: text snippet is more resilient to edits but harder to highlight precisely.
- **Kanban card ordering algorithm:** When a task is dropped between two existing cards, how are `order` values recalculated? Fractional indexing, gap-based integers, or full reorder? Needs decision during Phase 3 planning.
- **Search scope:** Does Cmd+K search message content or just entity names/titles? Message content search at scale needs FTS5 raw queries. Entity-only search is trivially fast with LIKE. Recommendation: entity-only for v2.0, defer message search.
- **Minor STACK.md vs FEATURES.md disagreement:** FEATURES.md recommends react-hotkeys-hook; STACK.md recommends a custom hook. Recommendation: custom hook (STACK.md rationale is stronger -- <10 shortcuts does not justify a dependency).

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: 172 files, 6,823 LOC TypeScript
- [Motion v12.35 docs](https://motion.dev/docs/react) -- animation library
- [dnd-kit official docs](https://dndkit.com/) -- drag-and-drop
- [dnd-kit + shadcn/ui Kanban reference](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui)
- [react-diff-viewer-continued v4.1.2](https://www.npmjs.com/package/react-diff-viewer-continued) -- diff rendering
- [diff (jsdiff) v8.0.3](https://www.npmjs.com/package/diff) -- text diffing engine
- [shadcn/ui Command component](https://ui.shadcn.com/docs/components/radix/command) -- Cmd+K
- [shadcn/ui dark mode + next-themes](https://ui.shadcn.com/docs/dark-mode/next) -- theme integration
- Prisma schema analysis: 7 existing models, Agent.isCustom already present

### Secondary (MEDIUM confidence)
- [Marmelab Kanban tutorial (Jan 2026)](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html)
- [React ContentEditable caret issue #2047](https://github.com/facebook/react/issues/2047) -- cursor jumping bug
- [Prisma FTS5 SQLite issue #9414](https://github.com/prisma/prisma/issues/9414) -- search limitations
- [PatternFly chatbot conversation history](https://www.patternfly.org/patternfly-ai/chatbot/chatbot-conversation-history/) -- session history UX
- [Atlassian Inline Edit pattern](https://developer.atlassian.com/platform/forge/ui-kit/components/inline-edit/) -- editing UX

### Tertiary (needs validation)
- Inline comment text-snippet anchoring resilience -- described in concept, no production reference for single-user review tool
- Kanban fractional indexing for card ordering -- multiple approaches exist, no consensus on best for SQLite

---
*Research completed: 2026-03-10*
*Ready for roadmap: yes*
