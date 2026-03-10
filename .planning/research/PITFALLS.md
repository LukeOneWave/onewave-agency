# Domain Pitfalls

**Domain:** Adding v2.0 features (custom agents, Kanban, diff view, global search, inline editing, project management, keyboard shortcuts, production polish) to existing Next.js 16 + Prisma 7 + SQLite app
**Researched:** 2026-03-10
**Existing codebase:** 172 files, 6,823 LOC TypeScript

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major architectural debt.

### Pitfall 1: SQLite Schema Migration Destroys Existing Data

**What goes wrong:** Adding Project, Task, Comment, and AgentVersion models with relations to existing Agent, Deliverable, and ChatSession models. Running `prisma migrate dev` on the existing `dev.db` can fail or require a database reset, wiping all 61 seeded agents and chat history.

**Why it happens:** Prisma's SQLite support has limitations around adding required foreign keys to existing tables. If a new migration adds a required `projectId` column to an existing table, SQLite cannot add NOT NULL columns without defaults to populated tables. Prisma may suggest `prisma migrate reset` which drops everything.

**Consequences:** Loss of seeded agent data (61 agents), chat history, mission data. Users must re-seed and lose all work.

**Prevention:**
- All new foreign keys on existing tables MUST be optional (`projectId String?`) or have defaults
- New models (Project, Task, Comment) can have required fields since they start empty
- Run `prisma migrate dev --create-only` first, review the generated SQL before applying
- Back up `dev.db` before every migration: `cp prisma/dev.db prisma/dev.db.backup`
- Test migrations against a copy of the database, not the original
- The `Agent.isCustom` field already exists (good foresight from v1.0) -- use it to distinguish custom agents rather than adding a separate table

**Detection:** Migration error messages mentioning "cannot add NOT NULL column" or prompts to reset the database.

**Phase:** Address at the start of every phase that touches the schema. Establish migration backup discipline as phase 1 infrastructure.

### Pitfall 2: Monolithic Zustand Store Becomes Unmaintainable

**What goes wrong:** The app currently has 3 Zustand stores (`app.ts`, `chat.ts`, `orchestration.ts`). Adding Kanban state, project management state, search state, keyboard shortcut registry, and inline editing state to existing stores or as ad-hoc additions creates a tangled state graph where actions in one domain trigger unexpected re-renders in others.

**Why it happens:** Each feature feels small enough to "just add to the existing store." The chat store already handles streaming, deliverables, and sessions at 300 lines -- adding review queue state there would be the natural-but-wrong instinct. By feature 5, stores are 500+ lines with interdependent slices.

**Consequences:** Debugging state becomes archaeological. Component re-renders cascade. Optimistic updates in one feature corrupt state in another. Every Kanban drag triggers chat component re-renders because they share state ancestry.

**Prevention:**
- Create dedicated stores per domain: `useProjectStore`, `useKanbanStore`, `useSearchStore`, `useShortcutStore`
- Use Zustand selectors everywhere to prevent unnecessary re-renders: `const title = useProjectStore(s => s.activeProject?.title)`
- Use `persist` with `partialize` -- do NOT persist Kanban drag state or streaming state
- Keep server state (projects list, agents list) fetched via API; keep Zustand for UI-only state (active selection, panel visibility, drag position)
- Do NOT mix server-cache state and UI state in the same store

**Detection:** More than 15 actions in one store. Components re-rendering when unrelated state changes. State bugs that require reading 3+ stores to debug.

**Phase:** Address in Phase 1 (before building any features). Establish store architecture conventions as infrastructure.

### Pitfall 3: Keyboard Shortcuts Fire Inside Text Inputs

**What goes wrong:** Global keyboard shortcuts (j/k navigate, a approve, r revise, Cmd+K search) fire when users are typing in chat input, revision feedback textarea, inline editing fields, or project name inputs. Pressing "a" to type "and" in a chat message triggers "approve deliverable."

**Why it happens:** Event listeners attached to `document` or `window` don't distinguish between "user is typing content" and "user is issuing a command." Each feature adds its own `addEventListener('keydown')` independently, creating conflicts and memory leaks. With 20+ listeners accumulated, there are also performance implications.

**Consequences:** Unusable text inputs. Users cannot type letters that are bound to shortcuts. Phantom approvals or navigation jumps while typing. Multiple listeners for same key create race conditions.

**Prevention:**
- Build a centralized shortcut registry (`useShortcutStore`) with ONE document-level keydown listener
- Always check `event.target` -- ignore shortcuts when target is `input`, `textarea`, `select`, or `[contenteditable]`
- Use modifier keys for destructive actions: Cmd+A for approve (not bare "a") when in contexts where text input exists nearby
- Implement shortcut scoping: shortcuts only active when their parent component/panel is focused
- Use a callback ref pattern to avoid putting the callback in useEffect dependency arrays (prevents unnecessary teardown/setup cycles)
- Provide a shortcut cheat sheet (? key) so users can discover bindings

**Detection:** Typing in any text field triggers unintended actions. Multiple handlers firing for same keystroke. Memory climbing as components mount/unmount without cleaning up listeners.

**Phase:** Build the shortcut registry BEFORE building any individual shortcut features. This is Phase 1 infrastructure.

### Pitfall 4: Inline Editing with ContentEditable Cursor Jumping

**What goes wrong:** Implementing inline editing of deliverables using `contentEditable` divs. On every React re-render, the cursor jumps to the beginning or end of the editable area. Safari and Firefox are especially affected. This is a long-standing React issue (facebook/react#2047, open since 2014, never fully resolved).

**Why it happens:** React's reconciliation replaces DOM nodes on re-render, which resets the browser's Selection API state. The `dangerouslySetInnerHTML` approach compounds this -- any state update during typing triggers a re-render which resets cursor position. The browser's selection system is completely decoupled from React's state management.

**Consequences:** Users cannot type more than a few characters without the cursor jumping. Editing becomes practically impossible. This single bug makes the entire inline editing feature unusable -- it is not a minor annoyance, it is a complete blocker.

**Prevention:**
- Do NOT use raw `contentEditable` with React state-driven updates
- Use a click-to-edit pattern: display deliverable as read-only, click opens a controlled `<textarea>` overlay, save on blur/Enter -- this sidesteps the cursor problem entirely
- If contenteditable is truly required, use `react-contenteditable` library which handles cursor preservation internally
- If rich text editing is needed, use Tiptap or Plate (proper editors with their own DOM management) rather than raw contenteditable
- If you must use contenteditable, use `useLayoutEffect` (not `useEffect`) to restore cursor position synchronously after DOM mutations
- Store edits in a local ref, only sync to React state on blur/save -- never update React state on every keystroke

**Detection:** Cursor jumping when typing. Edits appearing to duplicate or lose characters. Bug reports saying "editing doesn't work on Safari."

**Phase:** Phase where inline editing is built. Decide on click-to-edit vs contenteditable upfront. Recommendation: click-to-edit with textarea for v2.0; upgrade to Tiptap only if rich formatting is explicitly needed.

### Pitfall 5: Global Search (Cmd+K) Without Proper Full-Text Search

**What goes wrong:** Implementing Cmd+K search across agents, projects, sessions, and deliverables using Prisma `contains` queries on SQLite. This performs sequential LIKE scans across multiple tables, returning results in 500ms+ which feels sluggish for a command palette that needs <100ms response times.

**Why it happens:** Prisma does NOT natively support SQLite FTS5 (full-text search). The `fullTextSearch` preview feature only works with PostgreSQL and MySQL. Developers default to `where: { name: { contains: query } }` which is an unindexed substring scan. For a command palette, users expect instant results as they type.

**Consequences:** Cmd+K palette feels laggy. Users type ahead of results. Search ranking is arbitrary (no relevance scoring). Cannot find partial matches or handle typos.

**Prevention:**
- For a single-user local app with <1000 searchable items, use client-side fuzzy search with Fuse.js or MiniSearch -- this is simpler and faster than any database approach
- Load a search index on app initialization: all agent names/descriptions, project names, recent session titles -- this fits easily in memory
- Debounce search input at 150ms minimum
- Show results grouped by category (Agents, Projects, Sessions) with 5 results per category max
- If database search is needed later (searching within message content), use `prisma.$queryRaw` with SQLite FTS5 virtual tables -- FTS5 is built into SQLite but not exposed through Prisma's query builder
- Do NOT try to search through all message content via Prisma `contains` -- it will not scale

**Detection:** Typing in Cmd+K palette and seeing visible delay before results appear. Search not finding partial matches or handling typos.

**Phase:** Phase where global search is built. Recommendation: Fuse.js client-side search for this app's data volume. Only escalate to FTS5 raw queries if message content search is needed.

---

## Moderate Pitfalls

### Pitfall 6: Kanban Drag-and-Drop Breaks with Server Components

**What goes wrong:** dnd-kit requires client-side interactivity (pointer events, drag sensors, DOM measurements). Wrapping Kanban columns or cards in Server Components (Next.js 16 default) causes hydration mismatches or completely non-functional drag handles.

**Why it happens:** Next.js 16 App Router defaults to Server Components. Developers create a Kanban page as a Server Component, then try to add drag behavior to child components without properly establishing the client boundary. The DndContext provider must be in a client component, and all draggable/droppable children must also be client components.

**Prevention:**
- Mark the entire Kanban board and all draggable children as `"use client"` components
- Keep the data-fetching wrapper as a Server Component, pass serializable data as props to the client Kanban board
- Use `@dnd-kit/core` + `@dnd-kit/sortable` (not react-beautiful-dnd which is unmaintained)
- Test drag-and-drop ACROSS columns, not just within columns -- cross-container sorting is where most bugs hide in dnd-kit
- Persist column changes optimistically: update UI immediately, PATCH to API in background, revert on failure
- There is a shadcn/ui + dnd-kit + Tailwind Kanban reference implementation (Georgegriff/react-dnd-kit-tailwind-shadcn-ui) that matches the existing tech stack

**Detection:** Drag handles not responding. Console errors about hydration mismatches. Items snapping back to original position after drop.

**Phase:** Phase where Kanban is built.

### Pitfall 7: Diff View Performance on Large Deliverables

**What goes wrong:** Computing and rendering diffs for large deliverables (generated code files, long documents) blocks the main thread. The diff algorithm is O(n*m) on text length, running synchronously, causing the UI to freeze for 1-3 seconds on deliverables with 500+ lines.

**Why it happens:** Diff algorithms are computationally expensive. Most React diff viewer libraries compute the diff synchronously in the render path. When a user clicks "show diff" on a large deliverable, the entire UI locks while the diff computes.

**Prevention:**
- Use `react-diff-viewer-continued` (maintained fork) or `git-diff-view` -- NOT the original `react-diff-viewer` which is abandoned
- For deliverables >500 lines, compute diff in a Web Worker to avoid blocking the main thread
- Enable virtualization (only render visible diff lines) for large diffs -- both recommended libraries support this
- Cache computed diffs -- same two versions always produce the same diff, no need to recompute
- Consider storing deliverable versions as separate records (a `DeliverableVersion` model) rather than trying to reconstruct versions from message history
- Show a loading skeleton while diff computes

**Detection:** UI freezing when opening diff view. Browser "page unresponsive" warnings on large deliverables.

**Phase:** Phase where diff view is built.

### Pitfall 8: Custom Agent CRUD Without Validation Creates Broken Agents

**What goes wrong:** Users create custom agents with missing system prompts, invalid division names, duplicate slugs, or prompts that cause Claude API errors. The existing `Agent` schema allows this because seeded agents were always well-formed from the agency-agents repository.

**Why it happens:** The seed script guarantees data quality at import time. A CRUD form has no such guarantees. The current schema has only one constraint on agents (`slug @unique`), so Prisma will happily store an agent with an empty system prompt.

**Consequences:** Chat page crashing when using a custom agent (empty system prompt sent to Claude API). Duplicate slug errors breaking page routing. Agents appearing in wrong divisions or with missing metadata.

**Prevention:**
- Add Zod validation on the API route for agent creation/update -- validate before it hits Prisma
- System prompt is REQUIRED and must be non-empty (minimum 50 chars is reasonable)
- Auto-generate slug from name with collision detection: `my-agent`, `my-agent-2`, etc.
- Division must be from a predefined list (reuse existing 9 divisions + a "Custom" division)
- Use the existing `isCustom` boolean field to protect seeded agents from editing/deletion -- seeded agents should be read-only
- Client-side validation should mirror server-side but never replace it
- Preview/test button that makes a minimal Claude API call with the custom system prompt before saving

**Detection:** Empty agent cards on the agents page. Chat failing with API errors for specific agents. Duplicate slug 500 errors.

**Phase:** Phase where custom agent CRUD is built.

### Pitfall 9: Project Management Scope Creep

**What goes wrong:** "Project management" balloons from simple task tracking into a full PM tool with timelines, dependencies, resource allocation, Gantt charts, and reporting. Each addition seems small but collectively they triple the scope and complexity of the milestone.

**Why it happens:** Project management is a deep domain with infinite features. Once you build tasks, you want subtasks. Once you have subtasks, you want dependencies. Once you have dependencies, you want a timeline view. The existing review workflow and orchestration features create natural expansion points that feel like they "need" PM features.

**Consequences:** v2.0 ships late or never ships. The PM features are half-built and worse than not having them. Core features (custom agents, review improvements, search) get deprioritized for PM features nobody asked for.

**Prevention:**
- Define a strict MVP scope: Project = name + description + assigned agents + tasks (title, status, assignee)
- Task statuses are exactly 4: To Do, In Progress, Review, Done (the Kanban columns)
- No due dates, no dependencies, no time tracking, no subtasks in v2.0
- A deliverable belongs to a task; a task belongs to a project -- that is the full relationship model
- Resist adding "just one more field" -- every field needs UI, validation, API route, migration, and tests
- The schema should add at most 2 new models: Project and Task (reuse Deliverable for task outputs)

**Detection:** Schema has more than 3 new models for project management. Task model has more than 8 columns. PM features are taking more than 40% of v2.0 development time.

**Phase:** Phase where project management is built. Define scope explicitly in the roadmap and treat it as a hard boundary.

### Pitfall 10: Review Queue Widget N+1 Query Problem

**What goes wrong:** The dashboard review queue widget fetches pending deliverables, then for each deliverable fetches the associated message, then the session, then the agent. This N+1 query pattern on SQLite creates cascading database reads that compound in latency.

**Why it happens:** Prisma makes it easy to write code that fetches a list, then `.include`s relations in a loop. The deliverable -> message -> session -> agent chain is 4 levels deep. Without explicit eager loading, each level triggers a separate query.

**Prevention:**
- Single Prisma query with nested `include` to join deliverables -> messages -> sessions -> agents
- Filter at database level: `where: { status: 'pending' }` with `take: 10`
- Return denormalized data from the API: `{ deliverableId, agentName, agentSlug, sessionTitle, contentPreview, createdAt }`
- Add a database index on `Deliverable.status` since it will be queried frequently for review queue

**Detection:** Dashboard takes >500ms to load. Multiple sequential database queries visible in server logs for a single widget render.

**Phase:** Phase where review queue is built.

### Pitfall 11: SSE Streaming Conflicts with New Real-Time Features

**What goes wrong:** The existing SSE streaming for chat and orchestration assumes one active stream per page. Adding review queue real-time updates, project status changes, or Kanban live updates creates multiple competing SSE connections or requires multiplexing that the current architecture does not support.

**Why it happens:** Each new "live" feature seems to need its own event stream. Developers add `/api/review-queue/stream`, `/api/projects/stream`, etc. Browser connection limits (6 per domain for HTTP/1.1) get consumed quickly, especially combined with existing chat and orchestration streams.

**Consequences:** After opening chat + dashboard + Kanban, streaming stops working. New connections fail silently.

**Prevention:**
- Do NOT add more SSE endpoints for new features. This is a single-user local app -- real-time push is unnecessary for dashboard widgets
- Use polling or refetch-on-focus for dashboard widgets (review queue count, project status)
- Only chat and orchestration need streaming (already implemented and working)
- If real-time updates are truly needed later, consolidate into a single multiplexed event bus rather than per-feature SSE endpoints

**Detection:** Multiple `EventSource` connections open simultaneously in DevTools Network tab. Stale data in widgets while chat is active.

**Phase:** All phases. Establish the convention early: SSE for AI streaming only, polling/refetch for UI freshness.

---

## Minor Pitfalls

### Pitfall 12: Dark/Light Toggle FOUC (Flash of Unstyled Content)

**What goes wrong:** Theme toggle causes a flash of wrong-theme content on page load because the theme is stored in JavaScript state (Zustand) but CSS renders before JS hydrates. User sees white flash on dark mode, or dark flash on light mode.

**Prevention:**
- Use `next-themes` library which injects a blocking `<script>` in `<head>` to set theme class before paint
- Do NOT store theme in Zustand persist or in the database -- `next-themes` handles localStorage + script injection correctly
- shadcn/ui already has dark mode support via CSS class strategy -- `next-themes` with `attribute="class"` is the intended integration
- The existing app already has dark mode (v1.0 shipped with "dark default") -- check if `next-themes` is already in the stack before adding it

**Detection:** White flash on page load in dark mode. Theme "blinks" during hydration. Theme reverts to default briefly on navigation.

**Phase:** Phase where dark/light toggle is built.

### Pitfall 13: Animation/Transition Performance in Lists

**What goes wrong:** Adding Framer Motion `layout` animations to Kanban cards, review queue items, and search results causes jank when lists have 20+ items. Each `AnimatePresence` exit/enter triggers layout recalculation across all siblings.

**Prevention:**
- Use CSS transitions for simple opacity/transform animations (no library needed, zero bundle cost)
- Reserve Framer Motion for complex orchestrated animations only (page transitions, modal enters)
- For Kanban card moves, animate only `transform` (GPU-accelerated) -- never animate `width`, `height`, or `top`/`left`
- Add loading skeletons as simple CSS animations, not Framer Motion components
- Virtualize long lists BEFORE adding animations to them

**Detection:** Dropped frames visible in Chrome DevTools Performance tab during Kanban drag. Visible jank when filtering search results or expanding lists.

**Phase:** Production polish phase. Add animations LAST, not during feature development.

### Pitfall 14: Session History Loads All Message Content

**What goes wrong:** The "past session browsing" feature fetches all sessions with all messages to display a session list. For a user with 100+ sessions containing long Claude responses, this returns megabytes of data for what should be a simple list view.

**Prevention:**
- Session list API returns only metadata: id, title, agent name, created date, message count
- Load full messages only when a specific session is opened
- Auto-generate session titles from first user message (the `title` field already exists as optional on `ChatSession`)
- Paginate session history (20 per page)
- Add an index on `ChatSession.updatedAt` for efficient recent-first sorting

**Detection:** Slow page load on session history view. Large network payloads (>1MB) visible in DevTools for session list.

**Phase:** Phase where session history is built.

---

## Cross-Cutting Concerns

### Integration Pitfall: Features Built in Isolation Never Connect

**What goes wrong:** The biggest meta-pitfall for v2.0 is building features as standalone pages that don't integrate with each other. Projects should link to tasks, tasks should link to chat sessions, chat sessions should produce deliverables, deliverables should appear in the review queue, and the Kanban board should be a view over tasks. If each feature is built independently, the app becomes a collection of disconnected tools rather than an integrated platform.

**Prevention:** Define the entity relationship graph BEFORE building any features:

```
Project -> Task -> ChatSession -> Message -> Deliverable
                                                  |
                                          Review Queue (view over pending deliverables)
                                          Kanban Board (view over tasks by status)
```

Kanban and Review Queue are VIEWS over existing data, not separate data models. This insight must drive the schema design.

### Integration Pitfall: API Route Explosion

**What goes wrong:** v1.0 has 5 API route files. v2.0 could easily add 15+ more (agents CRUD, projects CRUD, tasks CRUD, search, comments, session history, etc.). Each route duplicates error handling, validation, and response formatting.

**Prevention:**
- Create shared API utilities: `apiHandler(fn)` wrapper with consistent error handling and response formatting
- Use Zod for all request validation, shared across routes
- Group related routes: `/api/projects/[id]/tasks/route.ts` not `/api/tasks/route.ts` with query param filtering
- Reuse the existing Prisma client instance from `src/lib/prisma.ts`

### Integration Pitfall: Component Library Sprawl

**What goes wrong:** Each feature introduces its own card, modal, dropdown, and list components because developers don't discover existing shadcn/ui components or prior custom components. The `src/components/ui/` directory has shadcn primitives, but feature components don't compose them consistently.

**Prevention:**
- Audit existing shadcn/ui components before building any feature
- Use shadcn/ui's `Dialog` for all modals, `Command` for Cmd+K (it's literally built for this), `Card` for all cards
- Create a shared `DataTable` component if multiple features need sortable/filterable tables
- Maintain a component checklist: before building a new component, search for an existing one

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Infrastructure / Store Setup | Monolithic store grows unmanageable | Split stores by domain before building features |
| Infrastructure / Shortcuts | Shortcuts fire in text inputs | Build centralized registry with input filtering first |
| Schema Migrations | Data loss on existing tables | Optional foreign keys, backup dev.db, --create-only review |
| Custom Agent CRUD | Broken agents from missing validation | Zod validation, auto-slug, protect seeded agents via `isCustom` |
| Review Queue | N+1 queries on dashboard | Single Prisma include query with nested relations |
| Inline Editing | ContentEditable cursor jumping | Use click-to-edit with textarea, not raw contenteditable |
| Diff View | Main thread blocking on large diffs | react-diff-viewer-continued with virtualization |
| Kanban Boards | Server Component hydration mismatch | "use client" boundary on entire board, use dnd-kit |
| Project Management | Scope creep into full PM tool | Strict 2-model limit (Project + Task), 4 statuses only |
| Global Search (Cmd+K) | Prisma lacks SQLite FTS, laggy results | Client-side Fuse.js for this app's scale |
| Dark/Light Toggle | FOUC on page load | next-themes library, not custom Zustand state |
| Session History | Loading all message content for list | Metadata-only list endpoint, paginate, load on open |
| SSE Architecture | Connection limit hit with new streams | SSE for AI streaming only, polling for UI freshness |
| Production Polish | Animation jank in lists | CSS transitions first, Framer Motion sparingly, virtualize first |

---

## Sources

- [Prisma FTS5 SQLite Issue #9414](https://github.com/prisma/prisma/issues/9414)
- [Prisma Full-Text Search Docs](https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search)
- [React ContentEditable Caret Issue #2047](https://github.com/facebook/react/issues/2047)
- [ContentEditable Caret Fix with useLayoutEffect](https://www.codegenes.net/blog/caret-position-reverts-to-start-of-contenteditable-span-on-re-render-in-react-in-safari-and-firefox/)
- [dnd-kit Official Documentation](https://dndkit.com/)
- [Shadcn/ui + dnd-kit Kanban Reference](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui)
- [Building Kanban Board with dnd-kit (LogRocket)](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/)
- [react-diff-viewer-continued](https://github.com/Aeolun/react-diff-viewer-continued)
- [Primer React: Overlay Events Conflicting with Global Shortcuts](https://github.com/primer/react/issues/1802)
- [Keyboard Shortcut Hook in React (Tania Rascia)](https://www.taniarascia.com/keyboard-shortcut-hook-react/)
- [Zustand GitHub Repository](https://github.com/pmndrs/zustand)
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025)
- [Prisma Migrate Documentation](https://www.prisma.io/docs/orm/prisma-migrate)
- [Prisma SQLite Shadow Tables Issue #8106](https://github.com/prisma/prisma/issues/8106)
- [App Router Pitfalls (imidef)](https://imidef.com/en/2026-02-11-app-router-pitfalls)
