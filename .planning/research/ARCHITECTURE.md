# Architecture Patterns

**Domain:** AI Agent Management Platform (local Next.js app)
**Researched:** 2026-03-09

## Recommended Architecture

A monolithic Next.js App Router application with clearly separated layers. The system is a single process (no microservices) running locally, but internal boundaries matter for maintainability. The architecture is **review-centric**: every data flow ultimately produces deliverables that enter the review pipeline.

```
+------------------------------------------------------------------+
|                        Next.js App Router                         |
|                                                                   |
|  +------------------+  +-------------------+  +----------------+  |
|  |   Pages / UI     |  |   Server Actions  |  |  API Routes    |  |
|  |  (React Server   |  |  (mutations,      |  |  (SSE stream   |  |
|  |   Components +   |  |   form handling)  |  |   endpoints)   |  |
|  |   Client Comps)  |  |                   |  |                |  |
|  +--------+---------+  +--------+----------+  +-------+--------+  |
|           |                     |                      |          |
|  +--------+---------------------+----------------------+--------+ |
|  |                    Service Layer                              | |
|  |  AgentService | ChatService | ProjectService | ReviewService | |
|  |  OrchestrationService | DeliverableService                   | |
|  +------------------------------+-------------------------------+ |
|                                  |                                |
|  +------------------------------+-------------------------------+ |
|  |                    Data Access Layer (Prisma)                 | |
|  |  Agent | Session | Message | Project | Task | Deliverable    | |
|  |  Review | OrchestrationRun | OrchestrationStep               | |
|  +------------------------------+-------------------------------+ |
|                                  |                                |
|  +------------------------------+-------------------------------+ |
|  |                    SQLite Database File                       | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
         |
         | SSE / fetch
         v
+------------------+
| Anthropic Claude |
| API (external)   |
+------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Pages / UI Layer** | Rendering, user interaction, client-side state | Server Actions, API Routes (SSE), Client stores |
| **Server Actions** | Mutations (create project, submit review, assign agent) | Service Layer |
| **API Routes (SSE)** | Streaming chat responses, orchestration progress events | Service Layer, Anthropic API |
| **AgentService** | CRUD for agents, search/filter, agent config resolution | Prisma (Agent model) |
| **ChatService** | Session management, message persistence, Claude API calls | Prisma (Session, Message), Anthropic SDK |
| **ProjectService** | Project CRUD, task management, agent assignment | Prisma (Project, Task) |
| **ReviewService** | Review queue, approval/revision workflow, inline comments | Prisma (Review, Deliverable) |
| **OrchestrationService** | Multi-agent run coordination, parallel execution, step tracking | ChatService, Prisma (OrchestrationRun, OrchestrationStep) |
| **DeliverableService** | Extract deliverables from chat, link to reviews | ChatService, ReviewService |
| **Prisma Data Access** | Database queries, migrations, seeding | SQLite file |

### Data Flow

**Flow 1: Single Agent Chat**
```
User types message
  -> Client Component sends to API Route (POST /api/chat)
  -> ChatService saves user message to DB
  -> ChatService calls Anthropic SDK with agent system prompt + history
  -> Anthropic streams response via SSE back to client
  -> ChatService saves assistant message to DB
  -> DeliverableService detects deliverable content (code, copy, design spec)
  -> Deliverable saved with status "pending_review"
  -> Review queue updated
```

**Flow 2: Multi-Agent Orchestration**
```
User creates orchestration with brief + selected agents
  -> OrchestrationService creates OrchestrationRun
  -> OrchestrationService spawns parallel ChatService calls (one per agent)
  -> Each agent streams independently via separate SSE channels
  -> Each agent's output -> DeliverableService extracts deliverables
  -> All deliverables land on OrchestrationReviewBoard (Kanban)
  -> User reviews each deliverable: approve / revise / comment
  -> Revision -> re-runs that agent with revision instructions appended
```

**Flow 3: Review Workflow**
```
Deliverable created (from chat or orchestration)
  -> Status: "pending_review"
  -> Appears in Review Queue on Dashboard
  -> User opens review panel:
     - Side-by-side: agent output + review controls
     - Actions: Approve, Request Revision, Edit Inline, Comment
  -> Approve -> status: "approved", removed from queue
  -> Request Revision -> status: "revision_requested"
     -> System re-invokes agent with original context + revision notes
     -> New deliverable version created, linked to previous
  -> Edit Inline -> user modifies output directly, status: "approved_with_edits"
```

## Key Architectural Decisions

### Use Vercel AI SDK for Claude Integration
**Confidence:** HIGH

Use the AI SDK (`ai` package) rather than the raw Anthropic SDK directly. The AI SDK provides `streamText` with built-in SSE handling, tool calling loops, and structured output. It supports Anthropic as a provider via `@ai-sdk/anthropic`. This eliminates manual SSE buffering, chunk parsing, and tool loop management.

Key capabilities:
- `streamText()` for streaming chat with automatic SSE formatting
- `generateText()` for non-streaming orchestration steps
- Built-in tool calling with `maxSteps` for agentic loops
- Works with Next.js API routes and Server Actions natively

**Source:** [AI SDK docs](https://ai-sdk.dev/docs/introduction), [AI SDK 5 release](https://vercel.com/blog/ai-sdk-5)

### Centralized Orchestrator Pattern (Not Peer-to-Peer)
**Confidence:** HIGH

Use a centralized orchestrator where a single `OrchestrationService` dispatches work to agents and collects results. Do NOT use peer-to-peer agent communication (explicitly out of scope per PROJECT.md). The orchestrator:
- Holds the shared brief/context
- Dispatches to agents in parallel
- Collects and organizes deliverables
- Manages the review lifecycle

This is simpler and matches the "agents work independently on shared brief" constraint.

**Source:** [Microsoft AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns), [Multi-Agent Orchestration arxiv paper](https://arxiv.org/html/2601.13671v1)

### Deliverables as First-Class Entities
**Confidence:** HIGH

Deliverables are not just chat messages -- they are extracted, typed, versioned entities. A deliverable has:
- `type`: code, copy, design_spec, strategy, analysis
- `content`: the actual output
- `version`: incremented on revision
- `status`: pending_review | approved | revision_requested | approved_with_edits
- `sourceMessageId`: link back to the chat message it came from
- `reviewNotes`: user comments/feedback

This separation is what makes the review workflow possible as a first-class feature rather than an afterthought.

### SQLite with Prisma Singleton
**Confidence:** HIGH

Use Prisma with SQLite. Use the singleton pattern for the Prisma client to avoid hot-reload issues in development. The entire database is a single file -- no Docker, no setup.

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Source:** [Prisma Next.js guide](https://www.prisma.io/nextjs), [Prisma SQLite quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite)

## Data Model (Core Entities)

```
Agent
  id, name, slug, description, division, color, tools[], systemPrompt
  metadata (from YAML frontmatter)

Session (chat session)
  id, agentId, projectId?, title, createdAt, updatedAt

Message
  id, sessionId, role (user|assistant|system), content, createdAt
  toolCalls?, toolResults?

Project
  id, name, description, status, createdAt

Task
  id, projectId, title, description, status (todo|in_progress|review|done)
  assignedAgentId?, order

Deliverable
  id, sessionId?, orchestrationStepId?, projectId?
  type (code|copy|design_spec|strategy|analysis)
  title, content, version, parentDeliverableId?
  status (pending_review|approved|revision_requested|approved_with_edits)
  createdAt

Review
  id, deliverableId, action (approve|revise|edit|comment)
  notes, editedContent?, createdAt

OrchestrationRun
  id, projectId?, title, brief, status (running|completed|paused)
  createdAt

OrchestrationStep
  id, runId, agentId, sessionId
  status (queued|running|completed|failed)
  order, startedAt, completedAt
```

## Patterns to Follow

### Pattern 1: Service Layer Encapsulation
**What:** All business logic lives in service modules (`lib/services/`), never in API routes or Server Actions directly.
**Why:** API routes handle HTTP concerns (request parsing, SSE setup, error responses). Services handle domain logic. This keeps routes thin and testable.

```typescript
// app/api/chat/route.ts - THIN
export async function POST(req: Request) {
  const { sessionId, message } = await req.json()
  const stream = await chatService.streamResponse(sessionId, message)
  return new Response(stream)
}

// lib/services/chat.ts - THICK
export const chatService = {
  async streamResponse(sessionId: string, userMessage: string) {
    const session = await prisma.session.findUnique({ ... })
    const agent = await prisma.agent.findUnique({ ... })
    const history = await prisma.message.findMany({ ... })
    // ... business logic, then AI SDK call
  }
}
```

### Pattern 2: Optimistic UI with Server Actions
**What:** Use React Server Actions for mutations (create project, submit review) with `useOptimistic` for instant UI feedback.
**Why:** Review actions (approve, revise) should feel instant. The Kanban board should update immediately on drag.

### Pattern 3: SSE for All Streaming
**What:** Use Server-Sent Events (not WebSockets) for all real-time data: chat streaming, orchestration progress, review status updates.
**Why:** SSE is simpler, unidirectional (server-to-client which is what we need), works with Next.js API routes without extra infrastructure, and the AI SDK uses SSE natively.

### Pattern 4: Event-Driven Deliverable Extraction
**What:** After each assistant message is saved, run deliverable extraction logic that identifies structured outputs (code blocks, document sections) and creates Deliverable records.
**Why:** This decouples chat from the review system. Chat produces messages; a separate concern identifies what is reviewable.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Giant API Routes
**What:** Putting Claude API calls, database queries, and business logic directly in route handlers.
**Why bad:** Untestable, unreusable, grows into 500-line files quickly.
**Instead:** Thin routes that delegate to service modules.

### Anti-Pattern 2: Storing Chat as Unstructured Blobs
**What:** Saving entire conversation as a single JSON blob rather than individual messages.
**Why bad:** Cannot search messages, cannot link deliverables to specific messages, cannot resume/branch conversations.
**Instead:** Each message is a row with foreign keys to session and optional links to deliverables.

### Anti-Pattern 3: Polling for Orchestration Status
**What:** Client polling `/api/orchestration/status` every N seconds to check if agents are done.
**Why bad:** Wasteful, laggy, scales poorly with multiple parallel agents.
**Instead:** SSE stream per orchestration run that pushes status updates as agents complete.

### Anti-Pattern 4: Review as a Chat Feature
**What:** Implementing review as special chat messages ("I approve this" -> parsed by AI).
**Why bad:** Review is a structured workflow with explicit states, not a conversational flow. Mixing them makes the review queue impossible to build.
**Instead:** Review is a separate UI panel with explicit actions (buttons, not chat).

## Directory Structure

```
src/
  app/
    (dashboard)/
      page.tsx                    # Dashboard with stats + review queue
    agents/
      page.tsx                    # Agent browser (grid, search, filter)
      [slug]/
        page.tsx                  # Agent detail + chat launcher
    chat/
      [sessionId]/
        page.tsx                  # Chat interface with review panel
    projects/
      page.tsx                    # Project list
      [id]/
        page.tsx                  # Project detail with Kanban + deliverables
    orchestration/
      [runId]/
        page.tsx                  # Orchestration view with parallel lanes
    settings/
      page.tsx                    # API key, model selection
    api/
      chat/
        route.ts                  # SSE streaming chat endpoint
      orchestration/
        route.ts                  # SSE orchestration progress
        [runId]/
          route.ts                # Individual run stream
      agents/
        route.ts                  # Agent CRUD
      projects/
        route.ts                  # Project CRUD
      deliverables/
        route.ts                  # Deliverable management
  lib/
    services/
      agent.ts                    # AgentService
      chat.ts                     # ChatService (AI SDK integration)
      project.ts                  # ProjectService
      review.ts                   # ReviewService
      orchestration.ts            # OrchestrationService
      deliverable.ts              # DeliverableService
    prisma.ts                     # Singleton Prisma client
    ai.ts                         # AI SDK provider config
  components/
    chat/
      ChatPanel.tsx               # Chat message list + input
      MessageBubble.tsx           # Individual message with markdown
      StreamingMessage.tsx        # Active streaming message
    review/
      ReviewPanel.tsx             # Side panel for reviewing deliverables
      ReviewActions.tsx           # Approve/Revise/Edit buttons
      InlineEditor.tsx            # Edit deliverable content
    agents/
      AgentCard.tsx               # Agent grid card
      AgentFilter.tsx             # Division/search filters
    projects/
      KanbanBoard.tsx             # Drag-and-drop task board
      DeliverablesList.tsx        # Project deliverables tab
    orchestration/
      OrchestrationLanes.tsx      # Parallel agent execution view
      OrchestrationKanban.tsx     # Review board for orchestration
    dashboard/
      ReviewQueue.tsx             # Pending review items
      StatsCards.tsx              # Usage statistics
      ActivityFeed.tsx            # Recent activity
    ui/                           # shadcn/ui components
    CommandMenu.tsx               # Cmd+K global search
  prisma/
    schema.prisma                 # Database schema
    seed.ts                       # Seed 61 agents from markdown files
```

## Suggested Build Order (Dependencies)

Build order is driven by dependency chains. Each layer depends on the one before it.

```
Phase 1: Foundation
  Prisma schema + SQLite setup + seed script
  -> Agent model + AgentService
  -> Agent browser UI (pages + components)
  [No external API dependency yet - pure CRUD]

Phase 2: Chat Core
  AI SDK setup + Anthropic provider config
  -> ChatService + SSE streaming endpoint
  -> Chat UI (message list, input, markdown rendering)
  -> Session persistence (Message model)
  [Requires: Phase 1 agents to select who to chat with]

Phase 3: Review System
  Deliverable model + DeliverableService
  -> Deliverable extraction from chat messages
  -> ReviewService + Review model
  -> Review panel UI (approve, revise, edit inline)
  -> Review queue on dashboard
  [Requires: Phase 2 chat to produce deliverables]

Phase 4: Project Management
  Project + Task models + ProjectService
  -> Kanban board UI (drag-and-drop tasks)
  -> Agent assignment to tasks
  -> Deliverables tab on projects
  [Requires: Phase 1 agents, Phase 3 deliverables]

Phase 5: Multi-Agent Orchestration
  OrchestrationRun + OrchestrationStep models
  -> OrchestrationService (parallel agent dispatch)
  -> Orchestration UI (parallel lanes, progress)
  -> Orchestration review board (Kanban with review status)
  [Requires: Phase 2 chat, Phase 3 review, Phase 4 projects]

Phase 6: Polish
  Dashboard stats + activity feed
  -> Global search (Cmd+K)
  -> Keyboard shortcuts
  -> Animations, loading states, empty states
  -> Dark/light mode refinement
  [Requires: All previous phases for data to display]
```

**Ordering rationale:**
- Agents are the atomic unit -- everything references them, so they come first
- Chat is the primary interaction mode and produces the raw material (messages) for everything else
- Review is the core value prop and must exist before orchestration (which produces many deliverables at once)
- Project management is organizational scaffolding that ties agents, tasks, and deliverables together
- Orchestration is the most complex feature and depends on chat + review being solid
- Polish is last because it touches all surfaces and benefits from stable underlying features

## Scalability Considerations

| Concern | At 1 user (target) | If extended to team use |
|---------|---------------------|------------------------|
| Database | SQLite is perfect -- fast, zero-config | Would need PostgreSQL migration |
| Streaming | Single SSE connection per chat works fine | Would need connection pooling |
| Orchestration | Sequential agent calls are fine | Would need job queue (BullMQ) |
| API keys | Single key in env/settings | Would need per-user key vault |
| State | Server-side state + DB is sufficient | Would need WebSocket for real-time sync |

This is explicitly a single-user local app. Do not over-architect for scale that is not needed.

## Sources

- [AI SDK Documentation](https://ai-sdk.dev/docs/introduction) - HIGH confidence
- [AI SDK 5 Release](https://vercel.com/blog/ai-sdk-5) - HIGH confidence
- [AI SDK Agents Overview](https://ai-sdk.dev/docs/agents/overview) - HIGH confidence
- [Prisma with Next.js](https://www.prisma.io/nextjs) - HIGH confidence
- [Prisma SQLite Quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite) - HIGH confidence
- [Microsoft AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) - HIGH confidence
- [Multi-Agent Orchestration Systems (arxiv)](https://arxiv.org/html/2601.13671v1) - MEDIUM confidence
- [Next.js App Router Streaming](https://nextjs.org/learn/dashboard-app/streaming) - HIGH confidence
- [SSE Streaming for LLM Responses](https://upstash.com/blog/sse-streaming-llm-responses) - MEDIUM confidence
- [Production Claude Streaming with Next.js Edge](https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7) - MEDIUM confidence
