# Feature Landscape

**Domain:** AI agent management platform -- v2.0 power-user capabilities
**Researched:** 2026-03-10
**Focus:** NEW features only (v1.0 features already shipped, see PROJECT.md)
**Overall confidence:** MEDIUM-HIGH

## Existing v1.0 Features (Already Built)

For reference -- these are shipped and working:
- Agent browsing/search/filter across 9 divisions
- Agent detail pages with personality/process/metrics
- Streaming chat with Claude API (SSE)
- Rich markdown/code rendering with syntax highlighting
- Deliverable review panel (approve/revise with feedback loop)
- Multi-agent orchestration with parallel lanes
- Dashboard with stats, activity feed, utilization charts
- Settings with API key management and model selection
- Dark mode (dark default)

---

## Table Stakes

Features v2.0 users expect. Missing these and the upgrade feels incomplete.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Dark/light mode toggle | v1.0 has dark-only; users expect a toggle, especially for daytime. Every modern app has this. | Low | Tailwind v4 dark mode classes already in place; add `next-themes` provider + toggle button |
| Review queue on dashboard | Users need one place to see ALL pending deliverables across sessions and missions. Without it, they hunt through individual chats. | Low | Existing `Deliverable` model with `status` field; aggregation query + dashboard widget |
| Session history and resumption | 96% of chatbot users report frustration restarting from zero. ChatGPT/Claude.ai both have sidebar session lists. `ChatSession` + `Message` already persist. | Medium | Existing `ChatSession` + `Message` models; needs sidebar UI, session list API, date grouping |
| Keyboard shortcuts for review | Power users expect j/k navigation, a/approve, r/revise. Standard Gmail/GitHub pattern. | Low | Existing review panel; add hotkey listener with `react-hotkeys-hook` |
| Loading skeletons | Baseline UX in 2026. Bare spinners feel like a prototype. | Low | shadcn/ui `Skeleton` component; apply per-page where data loads |
| Global search (Cmd+K) | Every modern productivity tool has Cmd+K. Users will try it instinctively. Linear, Vercel, Notion, VS Code all have it. | Medium | shadcn/ui `Command` component (built on cmdk); search across agents, sessions, projects |

## Differentiators

Features that transform OneWave from a chat-and-review tool into a genuine agency platform. Not expected, but provide significant value.

| Feature | Value Proposition | Complexity | Dependencies on Existing |
|---------|-------------------|------------|--------------------------|
| Custom agent builder | Users define their own specialized agents -- persona, system prompt, tools, division. Transforms OneWave from fixed toolkit to configurable platform. | Medium | `Agent.isCustom` field already exists; needs create/edit form, system prompt editor, live preview |
| Diff view between revisions | See exactly what changed between deliverable revision rounds. Makes review-centric workflow genuinely useful for iterative content. | Medium | Needs new `DeliverableVersion` model; existing `Deliverable` model for association |
| Inline editing on deliverables | Edit agent-generated content directly rather than re-prompting. Click to switch from rendered markdown to editable raw content. | Medium | Existing deliverable rendering pipeline; toggle between view/edit modes |
| Inline commenting on deliverables | Select text, add annotation. Comment anchored to specific text range. Google Docs-style but for single-user review notes. | High | New `Comment` model; text range anchoring logic; highlight overlay on rendered content |
| Orchestration review board (Kanban) | Visual board showing mission deliverables by status across agent lanes. Review multi-agent output at a glance instead of drilling into each lane. | Medium | Existing `Mission` + `MissionLane` + `Deliverable` models; new Kanban UI components |
| Task Kanban board | Drag-and-drop task management (To Do / In Progress / Review / Done). Visual project workflow. | High | New `Project` + `Task` models; dnd-kit for drag-and-drop; shared Kanban components |
| Project management with agent assignment | Group tasks into projects, assign agents, track progress across deliverables. | High | New `Project` + `Task` + `ProjectAgent` models; multiple new routes and UIs |
| Deliverables tab on projects | Aggregated view of all agent outputs for a project with review status. | Medium | Depends on Project model existing; queries existing `Deliverable` through project->task->session chain |
| Page transitions and animations | Smooth route transitions, entrance animations, micro-interactions. Feels polished and intentional. | Medium | New dependency: Motion (Framer Motion) library |

## Anti-Features

Features to explicitly NOT build for v2.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time collaboration / multi-cursor | Single-user local app. Collaboration SDK adds massive complexity for zero users. | Inline commenting is single-user: review notes on own deliverables |
| WYSIWYG rich text editor for deliverables | Agent output is markdown/code. Full editor (Slate, TipTap) fights the markdown rendering pipeline and adds huge dependency weight. | Inline editing = toggle raw content textarea; re-render markdown on save |
| Full project management suite (Gantt, time tracking, resource allocation) | Scope creep. This is an AI agent tool, not Monday.com. | Lightweight: Kanban + task list + agent assignment. No timelines or calendaring |
| AI-powered semantic search | Adds vector DB dependency and embedding pipeline for Cmd+K. SQLite queries are plenty fast for local data. | Simple text matching for Cmd+K search. 61 agents + sessions = trivially fast client-side filtering |
| Agent marketplace / sharing / export | Single user, no network. Serialization adds complexity with no immediate payoff. | Custom agents live in local SQLite. Export can come later |
| Notification / toast system for everything | Single user already looking at the app. Over-notifying is noise. | Toast only for destructive actions (delete confirmation) and async completions (mission done). Review queue surfaces pending items passively |
| Undo/redo for Kanban drag-and-drop | Complex state management for minimal value at single-user scale. | Drag commits immediately; user drags back if needed |
| Automated approval rules | Defeats the purpose. The review workflow IS the product. Automating it removes the core value. | Surface smart defaults but always require human decision |

## Feature Details: Expected UX Patterns

### Custom Agent Builder

**What users expect:** A form where they define name, division, description, color, system prompt (the core), and tools/capabilities. Preview how the agent appears in the directory.

**UX pattern:** Single-page form with sections -- NOT a multi-step wizard (too many steps for 5-6 fields). Live preview panel on the right showing the agent card. Large textarea or code editor for system prompt. "Test Chat" button to try before saving.

**Implementation notes:**
- Routes: `/agents/new` and `/agents/[slug]/edit`
- Reuse Agent detail page layout
- `Agent.isCustom = true` distinguishes from seeded agents
- Custom agents visually distinguished in directory (badge or card border treatment)
- Protect seeded agents from editing (or allow "clone to custom")

### Kanban Boards (Task + Orchestration)

**What users expect:** Columns for fixed status categories. Cards with title, assignee (agent), status indicator. Drag-and-drop between columns. Click card opens detail panel (sheet/drawer, not full page navigation).

**Industry-standard UX:**
- Column headers show card count
- Cards show: title, agent avatar, brief preview, priority indicator
- Smooth drag animation with drop placeholder
- Column scroll when many cards
- Empty column shows helpful "drop here" state

**Library decision:** Use **dnd-kit** -- ~10KB, zero dependencies, proven with shadcn/ui + Tailwind. Mature open-source Kanban examples exist (Georgegriff/react-dnd-kit-tailwind-shadcn-ui). Do NOT use react-beautiful-dnd (deprecated) or hello-pangea/dnd (heavier than needed).

**Shared components:** Both task Kanban and orchestration review board use the same `KanbanBoard`, `KanbanColumn`, `KanbanCard` primitives. Orchestration board reads existing Mission/Deliverable data; task board reads new Project/Task data.

### Diff View Between Revisions

**What users expect:** Side-by-side or unified diff showing what changed. Red for removed, green for added. Word-level highlighting within lines. Similar to GitHub's diff view.

**UX pattern:**
- Toggle between split (side-by-side) and unified (inline) view
- Word-level diff highlighting within changed lines
- Collapsible unchanged sections
- Version selector: "v1 vs v2" dropdown

**Critical prerequisite:** Current `Deliverable` model stores status and feedback but NOT content per revision. Content lives in `Message.content`. To support diff:
- **Recommended:** New `DeliverableVersion` model storing content snapshots per revision
- **Not recommended:** Parsing content from sequential messages -- fragile, depends on agent reproducing full content

**Library:** Use **react-diff-viewer** -- mature, GitHub-style UI, supports split/unified, word diff, syntax highlighting. Lightweight. Alternative: diff-match-patch for algorithm + custom rendering.

### Global Search (Cmd+K)

**What users expect:** Press Cmd+K, type anything, see results grouped by type (Agents, Sessions, Projects). Arrow keys navigate, Enter goes. Recent searches shown before typing. Escape closes.

**Established pattern (Linear, Vercel, Raycast):**
- Modal overlay with autofocused search input
- Results grouped: "Agents", "Recent Sessions", "Projects", "Actions"
- Fuzzy matching on names/titles
- Actions group: "Go to Dashboard", "New Chat", "Go to Settings"
- Keyboard-only navigable
- Recent/frequent items pre-populated

**Implementation:** shadcn/ui `CommandDialog` component -- near-zero effort since the project already uses shadcn/ui. Add `CommandDialog` wrapper triggered by Cmd+K global listener. For 61 agents + modest session count, client-side filtering is sufficient. No server-side search or FTS5 needed.

### Inline Editing and Commenting

**Inline editing (Medium complexity):**
- "Edit" button on deliverable toggles from rendered markdown to textarea/code editor with raw content
- User edits, clicks "Save" -- creates new `DeliverableVersion`
- Rendered view updates immediately
- No WYSIWYG needed; editing raw markdown/text is appropriate for this audience

**Inline commenting (High complexity):**
- Select text in rendered deliverable, click "Comment" from popover
- Comment anchored to text range (stored as text snippet, not character offset -- more resilient to content changes)
- Comments appear as yellow highlights in rendered view
- Comment thread sidebar shows all comments for current deliverable
- Resolve/unresolve comments

**New models:**
- `Comment` (id, deliverableId, content, anchorText, resolved, createdAt)
- `DeliverableVersion` (id, deliverableId, version, content, createdAt) -- shared with diff view

### Keyboard Shortcuts

**Expected shortcuts (Gmail/GitHub convention):**
- `j` / `k` -- next/previous deliverable in review queue
- `a` -- approve current deliverable
- `r` -- open revise dialog for current deliverable
- `Escape` -- close dialogs/panels
- `Cmd+K` -- open global search
- `?` -- show keyboard shortcut help overlay

**Library:** Use **react-hotkeys-hook** -- most popular, well-maintained, integrates cleanly with hooks and Zustand. Must disable shortcuts when user is typing in input/textarea (`enableOnFormTags: false`).

**Discoverability:** Shortcut hints shown in tooltips (e.g., approve button shows "a" hint). Help overlay accessible via `?` key.

### Session History and Resumption

**Established pattern (ChatGPT, Claude.ai):**
- Collapsible sidebar in chat layout
- Sessions grouped by date: "Today", "Yesterday", "Last 7 days", "Older"
- Each entry: agent avatar, session title, last message preview, timestamp
- Click to load full conversation and resume
- Rename session (inline edit on title)
- Delete session with confirmation
- Current session highlighted

**Implementation:**
- Session list API with pagination and date grouping
- Sidebar component in chat layout
- Auto-title: use first user message truncated, or ask Claude to generate title
- Session switching updates Zustand chat store without full page reload

### Production Polish

| Polish Item | Implementation | Complexity |
|-------------|---------------|------------|
| Loading skeletons | shadcn/ui `Skeleton` component per page; match layout shape | Low |
| Page transitions | Motion `AnimatePresence` + `motion.div` wrapping route content | Medium |
| Micro-interactions | Hover scale on cards, button press feedback, list item entrance stagger | Low |
| Toast notifications | shadcn/ui `Sonner` for approve/revise/save confirmations | Low |
| Empty states | Helpful text + illustration for no sessions, no projects, no results | Low |
| Focus management | Visible focus rings, focus trap in modals (shadcn/ui handles via Radix) | Already handled |

## Feature Dependencies

```
Independent (no new models):
  Dark/light toggle --------> next-themes provider
  Loading skeletons --------> shadcn/ui Skeleton
  Keyboard shortcuts -------> react-hotkeys-hook + existing review panel
  Page transitions ---------> Motion library

Existing data only:
  Review queue widget ------> Deliverable.status queries
  Session history ----------> ChatSession + Message queries + new sidebar UI
  Cmd+K search -------------> Agent + ChatSession queries + shadcn/ui Command
  Orchestration board ------> Mission + MissionLane + Deliverable + new Kanban UI

New models required:
  Custom agent builder -----> Agent.isCustom (exists) + form UI
  Diff view ----------------> DeliverableVersion model (NEW)
  Inline editing -----------> DeliverableVersion model (NEW, shared with diff)
  Inline commenting --------> Comment model (NEW) + DeliverableVersion (NEW)
  Task Kanban + Projects ---> Project + Task + ProjectAgent models (ALL NEW)
  Deliverables tab ---------> Project model (NEW) + existing Deliverable queries

Shared UI components:
  Kanban primitives --------> Used by BOTH orchestration board AND task board
  DeliverableVersion -------> Used by BOTH diff view AND inline editing
```

## MVP Recommendation

**Priority 1 -- Quick wins, immediate value (build first):**

1. **Dark/light toggle** -- Low complexity, expected, infrastructure exists
2. **Review queue widget** -- Low complexity, immediate value, existing data
3. **Loading skeletons** -- Low complexity, instant production feel
4. **Keyboard shortcuts** -- Low complexity, power-user delight
5. **Session history and resumption** -- Medium complexity, huge UX uplift, data already persists

**Priority 2 -- Medium effort, high impact:**

6. **Cmd+K global search** -- shadcn/ui Command makes it near-free
7. **Custom agent builder** -- `isCustom` field ready, unlocks platform extensibility
8. **Orchestration review board (Kanban)** -- Reads existing mission data, builds reusable Kanban primitives

**Priority 3 -- Higher complexity, new schemas:**

9. **Diff view** -- Needs DeliverableVersion model; build after version tracking exists
10. **Inline editing** -- Shares DeliverableVersion model with diff; build together
11. **Page transitions** -- New dependency (Motion), applies polish across all routes

**Priority 4 -- Highest complexity, most new code:**

12. **Project management + Task Kanban** -- New Project/Task/ProjectAgent models, multiple new routes, most net-new code
13. **Deliverables tab on projects** -- Depends on Project model existing
14. **Inline commenting** -- Text anchor complexity is disproportionate to single-user value

**Defer if time-constrained:**
- **Inline commenting** -- Text range anchoring is the hardest problem in the entire feature set for relatively low single-user value. Simple feedback textarea (already exists) covers 80% of the need.
- **Full project management** -- Can ship orchestration Kanban as the "board view" without the full project/task system. Add projects later as a follow-up.

## Schema Changes Required for v2.0

```prisma
model DeliverableVersion {
  id            String      @id @default(cuid())
  deliverableId String
  deliverable   Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  version       Int
  content       String      // Full content snapshot
  createdAt     DateTime    @default(now())

  @@unique([deliverableId, version])
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      String   @default("active") // active | archived
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tasks       Task[]
  agents      ProjectAgent[]
}

model Task {
  id             String   @id @default(cuid())
  projectId      String
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title          String
  description    String?
  status         String   @default("todo") // todo | in_progress | review | done
  assignedAgentId String?
  assignedAgent  Agent?   @relation(fields: [assignedAgentId], references: [id])
  sessionId      String?  // Links to chat session when agent works on task
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ProjectAgent {
  id        String  @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  agentId   String
  agent     Agent   @relation(fields: [agentId], references: [id])

  @@unique([projectId, agentId])
}

model Comment {
  id            String      @id @default(cuid())
  deliverableId String
  deliverable   Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  content       String
  anchorText    String      // The selected text this comment is anchored to
  resolved      Boolean     @default(false)
  createdAt     DateTime    @default(now())
}
```

## Sources

- [shadcn/ui Command component](https://ui.shadcn.com/docs/components/radix/command) -- built on cmdk, already in design system (HIGH confidence)
- [dnd-kit Kanban + shadcn/ui example](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui) -- proven pattern (HIGH confidence)
- [Marmelab: Kanban with shadcn (Jan 2026)](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html) -- recent tutorial (MEDIUM confidence)
- [react-diff-viewer](https://github.com/praneshr/react-diff-viewer) -- GitHub-style diff component (HIGH confidence)
- [Motion (Framer Motion)](https://motion.dev/) -- 18M+ monthly npm downloads (HIGH confidence)
- [react-hotkeys-hook](https://react-hotkeys-hook.vercel.app/) -- keyboard shortcuts for React (HIGH confidence)
- [TanStack Hotkeys](https://tanstack.com/hotkeys/latest) -- type-safe hotkey alternative (MEDIUM confidence)
- [PatternFly Chatbot conversation history](https://www.patternfly.org/patternfly-ai/chatbot/chatbot-conversation-history/) -- session history UX patterns (MEDIUM confidence)
- [Atlassian Inline Edit pattern](https://developer.atlassian.com/platform/forge/ui-kit/components/inline-edit/) -- inline editing UX reference (HIGH confidence)
- [LogRocket: Inline editable UI in React](https://blog.logrocket.com/build-inline-editable-ui-react/) -- implementation patterns (MEDIUM confidence)
