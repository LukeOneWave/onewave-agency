# Architecture Research

**Domain:** AI agent management platform -- v2.0 feature integration into existing codebase
**Researched:** 2026-03-10
**Confidence:** HIGH (direct codebase analysis of 172 existing files, 6,823 LOC)

## System Overview

v2.0 adds new features to an established architecture. The diagram shows existing (solid) and new (dashed) components:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  EXISTING: ChatPage, AgentGrid, Dashboard, Orchestration, │  │
│  │  ReviewPanel, MessageBubble, Sidebar, Header, AppShell    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│    NEW: AgentEditor, KanbanBoard, DiffViewer, InlineEditor,    │
│  │ CommandPalette, ReviewQueue, MissionKanban, ThemeToggle,  │  │
│    KeyboardShortcutsProvider, ProjectPage, SessionBrowser       │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
├─────────────────────────────────────────────────────────────────┤
│                      State Layer (Zustand)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │ chatStore│ │ appStore │ │ orchStore│   NEW:               │  │
│  │(existing)│ │(existing)│ │(existing)│ │ useProjectStore  │  │
│  │          │ │          │ │          │   useCommandStore     │  │
│  │          │ │          │ │          │ │ useReviewStore   │  │
│  └──────────┘ └──────────┘ └──────────┘ └ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
├─────────────────────────────────────────────────────────────────┤
│                     API Layer (Next.js Routes)                   │
│  EXISTING: /api/chat, /api/agents, /api/deliverables/[id],      │
│            /api/orchestration, /api/settings                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│    NEW: /api/agents/[slug] (PUT/DEL), /api/projects,             │
│  │ /api/tasks, /api/search, /api/review/pending,             │  │
│    /api/deliverables/[id]/versions, /api/deliverables/[id]/      │
│  │ comments, /api/comments/[id]                              │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Service Layer (lib/services/)                │
│  EXISTING: agentService, chatService, deliverableService,        │
│            dashboardService, orchestrationService                │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│    NEW: projectService, searchService, commentService            │
│  │ EXTENDED: agentService (+CRUD), deliverableService        │  │
│    (+versioning), chatService (+search), dashboardService        │
│  │ (+review count)                                           │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Data Layer (Prisma 7 + SQLite)               │
│  EXISTING: Agent, ChatSession, Message, Deliverable,             │
│            Setting, Mission, MissionLane                         │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│    NEW: Project, Task, DeliverableVersion, Comment               │
│  │ MODIFIED: Agent (+tasks), ChatSession (+task),            │  │
│    Deliverable (+content, +versions, +comments)                  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New/Modified |
|-----------|---------------|--------------|
| **AgentEditor** | Form for creating/editing custom agents (name, division, systemPrompt, tools) | NEW client component |
| **ReviewQueue** | Dashboard widget listing all pending deliverables across all sessions | NEW server component |
| **InlineEditor** | Contenteditable deliverable editing with line-level comment gutter | NEW client component |
| **DiffViewer** | Side-by-side or unified diff between deliverable versions | NEW client component |
| **KanbanBoard** | Drag-and-drop task board (todo / in_progress / review / done) | NEW client component |
| **MissionKanban** | Kanban view of mission deliverables grouped by approval status | NEW client component |
| **CommandPalette** | Cmd+K overlay for global search across agents, projects, sessions | NEW client component |
| **ThemeToggle** | Sun/moon button using existing next-themes | NEW client component |
| **KeyboardShortcutsProvider** | Global keyboard event handler for review shortcuts (j/k/a/r) | NEW client component (provider) |
| **Sidebar** | Add "Projects" nav item to navItems array | MODIFIED |
| **Header** | Add ThemeToggle and Cmd+K trigger button | MODIFIED |
| **Dashboard page** | Add ReviewQueue widget to existing grid | MODIFIED |
| **ChatIndexPage** | Enhance with search/filter for session history | MODIFIED |
| **MessageBubble** | Add InlineEditor integration for deliverable segments | MODIFIED |
| **Orchestration page** | Add Kanban tab alongside existing lane view | MODIFIED |

## Recommended Project Structure

New files only (existing structure unchanged):

```
src/
├── app/
│   ├── projects/                  # NEW: project management
│   │   ├── page.tsx               # Project list (server component)
│   │   └── [id]/
│   │       └── page.tsx           # Project detail with Kanban (server component)
│   ├── agents/
│   │   ├── new/
│   │   │   └── page.tsx           # NEW: custom agent creation
│   │   └── [slug]/
│   │       └── edit/
│   │           └── page.tsx       # NEW: custom agent editing
│   └── api/
│       ├── agents/[slug]/
│       │   └── route.ts           # NEW: PUT/DELETE for custom agents
│       ├── projects/
│       │   ├── route.ts           # NEW: GET/POST
│       │   └── [id]/
│       │       ├── route.ts       # NEW: GET/PUT/DELETE
│       │       └── tasks/
│       │           └── route.ts   # NEW: GET/POST
│       ├── tasks/
│       │   ├── [id]/route.ts      # NEW: PATCH/DELETE
│       │   └── reorder/route.ts   # NEW: batch reorder
│       ├── search/route.ts        # NEW: global search
│       ├── review/pending/route.ts # NEW: pending deliverables
│       ├── deliverables/[id]/
│       │   ├── versions/route.ts  # NEW: version history
│       │   └── comments/route.ts  # NEW: deliverable comments
│       └── comments/[id]/route.ts # NEW: comment CRUD
├── components/
│   ├── agents/AgentEditor.tsx     # NEW
│   ├── chat/InlineEditor.tsx      # NEW
│   ├── dashboard/ReviewQueue.tsx  # NEW
│   ├── layout/ThemeToggle.tsx     # NEW
│   ├── projects/                  # NEW folder
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── TaskCard.tsx
│   │   └── ProjectList.tsx
│   ├── review/                    # NEW folder
│   │   ├── DiffViewer.tsx
│   │   └── MissionKanban.tsx
│   └── search/CommandPalette.tsx  # NEW
├── store/
│   ├── project.ts                 # NEW
│   ├── command.ts                 # NEW
│   └── review.ts                  # NEW
└── lib/services/
    ├── project.ts                 # NEW
    ├── search.ts                  # NEW
    └── comment.ts                 # NEW
```

### Structure Rationale

- **Components grouped by feature domain:** Matches existing pattern (`components/chat/`, `components/agents/`, `components/orchestration/`). New features get new folders (`components/projects/`, `components/review/`, `components/search/`).
- **API routes mirror resource structure:** RESTful nesting (`/api/projects/[id]/tasks`) is consistent with existing `/api/deliverables/[id]` pattern.
- **One store per feature:** Matches `chat.ts` / `app.ts` / `orchestration.ts` separation. Prevents coupling between unrelated features.

## Architectural Patterns

### Pattern 1: Feature-Scoped Zustand Stores (extend existing pattern)

**What:** Each major feature gets its own Zustand store. The existing codebase already does this: `useChatStore` (ephemeral streaming state), `useAppStore` (persisted sidebar), `useOrchestrationStore` (mission streaming).
**When to use:** Any client-side state spanning multiple components within a feature.
**Trade-offs:** More files, but each store is small, focused, and testable. No accidental coupling between features.

```typescript
// src/store/project.ts -- follows same pattern as existing stores
import { create } from "zustand";

interface ProjectState {
  tasks: Task[];
  draggedTaskId: string | null;
  setTasks: (tasks: Task[]) => void;
  moveTask: (taskId: string, newStatus: string, newOrder: number) => void;
  revertTask: (taskId: string, prevStatus: string, prevOrder: number) => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  tasks: [],
  draggedTaskId: null,
  setTasks: (tasks) => set({ tasks }),
  moveTask: (taskId, newStatus, newOrder) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, order: newOrder } : t
      ),
    })),
  revertTask: (taskId, prevStatus, prevOrder) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status: prevStatus, order: prevOrder } : t
      ),
    })),
}));
```

```typescript
// src/store/command.ts
import { create } from "zustand";

interface CommandState {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  selectedIndex: number;
  open: () => void;
  close: () => void;
  setQuery: (q: string) => void;
  setResults: (r: SearchResult[]) => void;
  selectNext: () => void;
  selectPrev: () => void;
}
```

### Pattern 2: Server Fetch, Client Interact (match existing pattern)

**What:** Server components fetch initial data, pass to client components as props. Client components handle mutations through API routes with optimistic Zustand updates.
**When to use:** Every new page/route. This is the established pattern -- see `DashboardPage` (server) passing data to `StatCards`/`ActivityFeed`, and `ChatPage` (client) receiving `session` prop from server component.
**Trade-offs:** Requires serializable props across the server/client boundary. Eliminates loading spinners on initial page load.

```typescript
// src/app/projects/[id]/page.tsx (server component -- matches Dashboard pattern)
export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await projectService.getById(params.id);
  const tasks = await projectService.getTasks(params.id);
  return <KanbanBoard project={project} initialTasks={tasks} />;
}

// src/components/projects/KanbanBoard.tsx (client -- matches ChatPage pattern)
"use client";
export function KanbanBoard({ project, initialTasks }: Props) {
  const { tasks, moveTask } = useProjectStore();
  useEffect(() => {
    useProjectStore.getState().setTasks(initialTasks);
  }, [initialTasks]);
  // render columns, handle drag-and-drop
}
```

### Pattern 3: Optimistic Updates with Rollback (match existing pattern)

**What:** Update Zustand state immediately on user action, persist via API in background, revert on failure. The existing `useChatStore.approveDeliverable()` already implements this pattern exactly.
**When to use:** All mutations: task moves, approvals, inline edits, comment creation.
**Trade-offs:** More code per mutation, but instant UI. Already proven in the codebase.

```typescript
// Following the approveDeliverable pattern in store/chat.ts
async function handleTaskMove(taskId: string, newStatus: string, newOrder: number) {
  const prev = tasks.find(t => t.id === taskId);
  moveTask(taskId, newStatus, newOrder);  // Optimistic
  try {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, order: newOrder }),
    });
  } catch {
    revertTask(taskId, prev.status, prev.order);  // Rollback
    toast.error("Failed to move task");
  }
}
```

## Data Flow

### Custom Agents

```
AgentEditor (client form)
    |
    v
POST /api/agents { name, slug, division, description, systemPrompt, isCustom: true }
    |
    v
agentService.create() -> Agent table (isCustom = true)
    |
    v
Appears in agent grid with "Custom" badge
Edit/delete buttons only shown when agent.isCustom === true
```

The `isCustom` boolean already exists on the Agent model (schema line 20). The `agentService` needs `create()`, `update()`, `delete()` methods added alongside existing `getAll()`, `getBySlug()`, `getDivisions()`, `getCount()`. Seeded agents (isCustom = false) remain read-only. The slug must be auto-generated from name (slugify) to maintain the existing URL pattern `/agents/[slug]`.

### Diff View (Deliverable Versioning)

```
Deliverable created from chat message
    |
    v
deliverableService.snapshotContent() extracts content from Message.content
    using existing parseDeliverables() logic, saves as DeliverableVersion v1
    |
    v
User requests revision -> useChatStore.requestRevision() (already exists)
    |
    v
Agent produces revised content -> new Message saved
    |
    v
deliverableService.snapshotContent() saves as DeliverableVersion v2
    |
    v
DiffViewer fetches GET /api/deliverables/[id]/versions
    computes diff client-side using `diff` npm package
    renders with green/red line highlighting
```

**Critical schema change:** Currently, deliverable content only exists inline in `Message.content`, extracted at render time by `parseDeliverables()` in `lib/deliverable-parser.ts`. For versioning, the `Deliverable` model needs a `content` field that snapshots the extracted text. This is the single most impactful schema change.

### Inline Editing + Comments

```
MessageBubble renders deliverable segment (existing)
    |
    v
InlineEditor wraps deliverable content (replaces raw markdown display)
    |
    v
User clicks to edit -> contenteditable mode
    -> PATCH /api/deliverables/[id] { content: editedText }
    -> Creates new DeliverableVersion automatically
    |
    v
User clicks line gutter -> comment form appears
    -> POST /api/deliverables/[id]/comments { lineStart, lineEnd, content }
    -> Comment rendered as annotation in gutter
```

### Global Search (Cmd+K)

```
KeyboardShortcutsProvider detects Cmd+K
    |
    v
useCommandStore.open() -> CommandPalette renders
    |
    v
User types query -> useCommandStore.setQuery() (debounced 200ms)
    |
    v
GET /api/search?q=...
    |
    v
searchService.search(query) runs parallel Prisma queries:
  Promise.all([
    prisma.agent.findMany({ where: { OR: [
      { name: { contains: query } },
      { description: { contains: query } }
    ]}}),
    prisma.chatSession.findMany({ where: { title: { contains: query } } }),
    prisma.project.findMany({ where: { OR: [
      { name: { contains: query } },
      { description: { contains: query } }
    ]}}),
  ])
    |
    v
Results grouped by type, arrow keys navigate, Enter navigates to item
```

SQLite `contains` (LIKE) is sub-millisecond at this scale. No search engine needed.

### Kanban Board (Project Tasks)

```
ProjectPage (server) -> projectService.getById() + projectService.getTasks()
    |
    v
KanbanBoard (client) -> useProjectStore.setTasks(initialTasks)
    |
    v
Four columns: To Do | In Progress | Review | Done
    |
    v
@dnd-kit/core handles drag events
    |
    v
onDragEnd -> useProjectStore.moveTask() (optimistic)
    -> PATCH /api/tasks/[id] { status, order }
    -> POST /api/tasks/reorder { taskIds } for sibling reorder
```

Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop. Task `order` is an integer field; on drop, recalculate order values for affected tasks.

### Mission Kanban (Orchestration Deliverables)

```
Existing orchestration/[missionId]/page.tsx
    |
    v
Add tab toggle: "Lanes" (existing) | "Review Board" (new)
    |
    v
MissionKanban groups all deliverables from all lanes by status:
  Pending | Approved | Revision Requested
    |
    v
Same DnD pattern but simpler (status change only, no reorder needed)
```

### Session History

```
Enhanced /chat page.tsx (already shows sessions via chatService.getRecentSessions())
    |
    v
Add: search input + agent filter dropdown + date sort toggle
    |
    v
chatService.searchSessions(query, agentId?) -- NEW method
    |
    v
Auto-title: when session.title is null, generate from first user message
    chatService.updateSessionTitle() already exists
    |
    v
Click session -> navigate to /chat/[sessionId] -> ChatPage loads with existing history
```

### Keyboard Shortcuts

```
KeyboardShortcutsProvider wraps AppShell children (in layout.tsx)
    |
    v
Global keydown listener (document.addEventListener)
    |
    v
Check: if activeElement is input/textarea -> skip (don't capture typing)
    |
    v
j: useReviewStore.focusNext()     -- navigate deliverables
k: useReviewStore.focusPrev()
a: useChatStore.approveDeliverable(focused)
r: useChatStore.requestRevision(focused)
Cmd+K: useCommandStore.open()
```

### Theme Toggle

```
ThemeToggle component in Header
    |
    v
next-themes useTheme() -> already configured in ThemeProvider
    (attribute="class", defaultTheme="dark", enableSystem)
    |
    v
Toggle between "light" and "dark" with sun/moon icon
    |
    v
Zero additional infrastructure needed
```

## Schema Changes (Prisma Migration)

### New Models

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      String   @default("active")  // active | archived
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tasks       Task[]
}

model Task {
  id          String       @id @default(cuid())
  projectId   String
  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  description String?
  status      String       @default("todo")  // todo | in_progress | review | done
  priority    String       @default("medium")  // low | medium | high
  agentId     String?
  agent       Agent?       @relation(fields: [agentId], references: [id])
  sessionId   String?      @unique
  session     ChatSession? @relation(fields: [sessionId], references: [id])
  order       Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model DeliverableVersion {
  id            String      @id @default(cuid())
  deliverableId String
  deliverable   Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  version       Int
  content       String
  createdAt     DateTime    @default(now())

  @@unique([deliverableId, version])
}

model Comment {
  id            String      @id @default(cuid())
  deliverableId String
  deliverable   Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  lineStart     Int?        // null = general comment
  lineEnd       Int?
  content       String
  resolved      Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

### Modified Models

```prisma
// Agent: add Task relation
model Agent {
  // ... existing fields unchanged ...
  tasks        Task[]       // NEW relation
}

// ChatSession: add Task relation
model ChatSession {
  // ... existing fields unchanged ...
  task         Task?        // NEW relation
}

// Deliverable: add content field + new relations
model Deliverable {
  // ... existing fields unchanged ...
  content      String?      // NEW: snapshot of deliverable text (nullable for migration)
  versions     DeliverableVersion[]  // NEW relation
  comments     Comment[]             // NEW relation
}
```

**Migration strategy:** The `Deliverable.content` field should be nullable initially. A backfill script can extract content from parent `Message.content` using the existing `parseDeliverables()` function for any existing deliverables.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (~61 agents, <100 sessions) | Everything works. LIKE queries sub-millisecond. |
| 500+ sessions | Add cursor-based pagination to session list (already has `take: limit`). |
| 5000+ sessions | Consider SQLite FTS5 for global search. Virtualize long lists with @tanstack/virtual. |

### Scaling Priorities

1. **First bottleneck:** Session list rendering with many items. Fix with pagination (chatService already accepts limit param).
2. **Second bottleneck:** Kanban board with many tasks per column. Fix with virtualization if >100 tasks per column (unlikely for single-user).
3. **Non-issue:** Search performance. At single-user scale with SQLite, LIKE queries across a few hundred rows are effectively instant.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Zustand Store

**What people do:** Adding project, command, and review state to the existing `useChatStore` or `useAppStore`.
**Why it's wrong:** `useChatStore` is already 300 lines with streaming, messages, and deliverable state. Adding Kanban drag state, search results, and keyboard focus tracking would make it unmanageable. The existing architecture deliberately separates stores by feature.
**Do this instead:** Three new stores: `useProjectStore`, `useCommandStore`, `useReviewStore`. Each under 100 lines.

### Anti-Pattern 2: Full Editor for Diff View

**What people do:** Embedding Monaco Editor or CodeMirror for deliverable diffing.
**Why it's wrong:** Adds 500KB+ to bundle. Deliverables are markdown text, not source code. The existing app uses ReactMarkdown for rendering. A full editor is architecturally inconsistent.
**Do this instead:** Use the `diff` npm package (~5KB) to compute text diffs. Render with a custom component that shows added/removed lines with green/red backgrounds, staying consistent with the existing markdown rendering approach.

### Anti-Pattern 3: WebSocket for Kanban Real-Time

**What people do:** Adding WebSocket infrastructure for "real-time" Kanban updates.
**Why it's wrong:** Single-user local app. No second client exists. The SSE pattern is for LLM streaming only.
**Do this instead:** Optimistic UI via Zustand. DB is source of truth, synced on page load by server components.

### Anti-Pattern 4: Full-Text Search Engine

**What people do:** Adding Meilisearch, Elasticsearch, or complex FTS5 setup for Cmd+K.
**Why it's wrong:** ~61 agents, hundreds of sessions, single-user. Prisma `contains` on SQLite is sub-millisecond. A search engine adds operational complexity for zero performance benefit.
**Do this instead:** Fan out parallel Prisma queries in `searchService.search()` using `Promise.all`.

### Anti-Pattern 5: Client-Side Initial Data Fetching

**What people do:** Using `useEffect` + `fetch` for page-load data in new pages.
**Why it's wrong:** The existing architecture uses server components for initial data (DashboardPage, AgentGrid, ChatIndexPage). Client-side fetching adds loading spinners and violates the established pattern.
**Do this instead:** Fetch in server component, pass as props. Zustand only for mutations and ephemeral interaction state.

### Anti-Pattern 6: Rewriting the Deliverable Parser

**What people do:** Replacing the regex-based `parseDeliverables()` with an AST parser or LLM-based extraction.
**Why it's wrong:** The existing XML `<deliverable>` tag regex parser is deterministic, tested, and fast. Changing it risks breaking the entire review workflow.
**Do this instead:** Keep the parser. Use it as the extraction function when snapshotting deliverable content into the new `Deliverable.content` field.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic Claude API | Existing SSE via `/api/chat` route | Custom agents use same streaming path with different systemPrompt. No changes needed. |
| next-themes | Already configured in ThemeProvider | Add toggle button using `useTheme()`. Zero setup. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| KanbanBoard <-> Task API | REST + optimistic Zustand | DnD state scoped to useProjectStore |
| DiffViewer <-> Version API | REST, client-side diff | Server returns raw version strings; diff computed in browser |
| CommandPalette <-> Search API | REST with 200ms debounce | Single endpoint, parallel DB queries |
| ReviewQueue <-> Dashboard | Server component composition | ReviewQueue is a server component fetching its own data |
| KeyboardShortcuts <-> Stores | Direct Zustand action calls | Reads from useReviewStore (focus), writes to useChatStore (approve/revise) and useCommandStore (open) |
| InlineEditor <-> Deliverable API | REST for content + comments | Creates DeliverableVersion on every edit save |
| AgentEditor <-> Agent API | REST CRUD | Only operates on agents where isCustom = true |

## New vs Modified -- Explicit Breakdown

### New Files (~40 files)

| Category | Count | Details |
|----------|-------|---------|
| Prisma migration | 1 | Add Project, Task, DeliverableVersion, Comment; modify Agent, ChatSession, Deliverable |
| Services | 3 | project.ts, search.ts, comment.ts |
| Stores | 3 | project.ts, command.ts, review.ts |
| API Routes | 12 | agents/[slug], projects, projects/[id], projects/[id]/tasks, tasks/[id], tasks/reorder, search, review/pending, deliverables/[id]/versions, deliverables/[id]/comments, comments/[id] |
| Components | 11 | AgentEditor, ReviewQueue, InlineEditor, DiffViewer, KanbanBoard, KanbanColumn, TaskCard, ProjectList, MissionKanban, CommandPalette, ThemeToggle |
| Pages | 4 | /projects, /projects/[id], /agents/new, /agents/[slug]/edit |
| Providers | 1 | KeyboardShortcutsProvider |

### Modified Files (~12 files)

| File | What Changes |
|------|-------------|
| `prisma/schema.prisma` | Add 4 new models, add relations to Agent/ChatSession/Deliverable |
| `src/lib/services/agent.ts` | Add `create()`, `update()`, `delete()` methods |
| `src/lib/services/deliverable.ts` | Add `getPending()`, `getVersions()`, `updateContent()`, `snapshotContent()` |
| `src/lib/services/chat.ts` | Add `searchSessions()`, auto-title on session creation |
| `src/lib/services/dashboard.ts` | Add pending review count to `getStats()` |
| `src/components/layout/Sidebar.tsx` | Add `{ href: "/projects", label: "Projects", icon: FolderKanban }` to `navItems` |
| `src/components/layout/Header.tsx` | Add ThemeToggle component and Cmd+K trigger button |
| `src/app/layout.tsx` | Wrap AppShell children with KeyboardShortcutsProvider |
| `src/app/page.tsx` | Add ReviewQueue widget to dashboard grid layout |
| `src/app/chat/page.tsx` | Add search input, agent filter, date sorting for session browsing |
| `src/components/chat/MessageBubble.tsx` | Integrate InlineEditor for deliverable segments (alongside existing ReviewPanel) |
| `src/app/orchestration/[missionId]/page.tsx` | Add tab toggle between lane view and Kanban review board |

## Suggested Build Order (Dependency-Driven)

```
Phase 1: Schema + Foundation + Quick Wins
  - Prisma migration (Project, Task, DeliverableVersion, Comment + model mods)
  - New services (project, search, comment)
  - Extended services (agent CRUD, deliverable versioning + content snapshot)
  - Theme toggle (trivial -- just a button using existing next-themes)
  WHY FIRST: Every feature depends on schema. Services define the contract.
  RISK: LOW -- standard Prisma migration, follows existing patterns exactly.

Phase 2: Custom Agents + Session History
  - AgentEditor component + /agents/new and /agents/[slug]/edit pages
  - Agent API routes (POST /api/agents, PUT/DELETE /api/agents/[slug])
  - Enhanced /chat page with search, agent filter, auto-titles
  WHY SECOND: Independent features with no cross-dependencies. Quick wins
    that are immediately visible and useful.
  RISK: LOW -- extends existing patterns.

Phase 3: Project Management + Task Kanban
  - Project pages + API routes (/api/projects/*)
  - KanbanBoard + KanbanColumn + TaskCard components
  - useProjectStore with optimistic DnD
  - @dnd-kit integration for drag-and-drop
  - Agent assignment to tasks
  WHY THIRD: Establishes the Kanban interaction pattern reused in Phase 4.
  RISK: MEDIUM -- DnD is the most complex client-side interaction. Test thoroughly.

Phase 4: Advanced Review Features
  - DeliverableVersion tracking triggered on revision
  - DiffViewer component (uses `diff` npm package)
  - InlineEditor + comment system
  - ReviewQueue dashboard widget
  - MissionKanban view (reuses patterns from Phase 3)
  WHY FOURTH: Depends on versioning schema AND Kanban patterns from Phase 3.
  RISK: MEDIUM -- InlineEditor with line-level comments has UI complexity.

Phase 5: Power User UX
  - CommandPalette (Cmd+K) + useCommandStore
  - KeyboardShortcutsProvider + useReviewStore
  - Keyboard navigation (j/k/a/r) for review queue
  WHY FIFTH: Search needs routes from Phases 2-4 to have navigation targets.
    Shortcuts need reviewable content to act on.
  RISK: LOW -- standard patterns, no data dependencies.

Phase 6: Production Polish
  - Loading skeletons for all new pages
  - Page transitions (CSS or framer-motion)
  - Hover/focus animations on cards and list items
  - Empty states for projects, tasks, search results
  WHY LAST: Polish is cosmetic. Apply once functionality is stable.
  RISK: LOW -- purely presentational.
```

## Sources

- Direct codebase analysis: `/Users/luke/onewave-agency/src/` (172 files, 6,823 LOC TypeScript)
- Prisma schema: `prisma/schema.prisma` (7 existing models, Agent.isCustom already present)
- Existing Zustand stores: `src/store/chat.ts` (302 lines), `src/store/app.ts` (18 lines), `src/store/orchestration.ts`
- Existing services: `src/lib/services/agent.ts`, `chat.ts`, `deliverable.ts`, `dashboard.ts`, `orchestration.ts`
- Existing deliverable parser: `src/lib/deliverable-parser.ts` (regex-based XML extraction)
- Theme configuration: `src/components/providers/ThemeProvider.tsx` (next-themes already active)
- Layout structure: `src/app/layout.tsx` (ThemeProvider > AppShell > Toaster)
- Component patterns: `src/components/chat/MessageBubble.tsx` (deliverable rendering + ReviewPanel integration)

---
*Architecture research for: OneWave AI v2.0 feature integration*
*Researched: 2026-03-10*
