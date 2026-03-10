# Phase 4: Multi-Agent Orchestration - Research

**Researched:** 2026-03-09
**Domain:** Parallel streaming, multi-agent coordination, SSE multiplexing
**Confidence:** HIGH

## Summary

Phase 4 builds multi-agent orchestration on top of the existing chat (Phase 2) and review (Phase 3) infrastructure. The core challenge is dispatching N parallel Anthropic API streams for a shared brief and presenting their output simultaneously in the UI. The existing single-stream SSE pattern in `/api/chat/route.ts` serves as the foundation -- orchestration multiplexes multiple such streams through a single SSE endpoint with lane-tagged events.

The database needs a new `Mission` model that groups multiple `ChatSession` records (one per selected agent). Each agent gets its own session with the shared brief as the first user message, and each session's messages flow through the existing deliverable parsing and review system unchanged.

**Primary recommendation:** Use a single SSE endpoint (`/api/orchestration/[missionId]/stream`) that spawns N parallel Anthropic streams server-side and emits lane-tagged SSE events (`{agentId, type, text}`). The client groups events by agentId into separate lane components. This avoids the browser's 6-connection HTTP/1.1 limit and keeps the architecture simple.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORCH-01 | User can select multiple agents for a mission | Agent selection UI + Mission creation API with agent IDs |
| ORCH-02 | User can write a project brief/objective | Brief text field stored on Mission model, sent as first message to each agent |
| ORCH-03 | Selected agents execute in parallel on the shared brief | Server-side parallel Anthropic streams via Promise.all with per-agent ChatSessions |
| ORCH-04 | User can see each agent's streaming output in separate lanes | Lane-tagged SSE events + multi-lane React UI with independent scroll areas |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.78.0 | Claude API streaming | Already in project, `messages.stream()` supports concurrent instances |
| Prisma | ^7.4.2 | Database ORM | Already in project, new Mission model extends existing schema |
| Zustand | ^5.0.11 | Client state for orchestration lanes | Already in project, new orchestration store parallels chat store |
| React (ReadableStream) | 19.2.3 | SSE consumption via fetch | Existing pattern from chat, extended with lane demuxing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 | Icons for orchestration UI | Mission/lane status indicators |
| shadcn/ui components | existing | Cards, badges, buttons, scroll areas | Lane containers, agent selection, status display |
| sonner | ^2.0.7 | Toast notifications | Error/completion notifications |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single multiplexed SSE | N separate fetch streams | Hits browser 6-connection limit with >6 agents; single SSE is cleaner |
| WebSocket | SSE via ReadableStream | WebSocket is bidirectional (unnecessary), SSE already proven in codebase |
| Server-sent events via EventSource API | fetch + ReadableStream | EventSource doesn't support POST body; fetch pattern already established |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── orchestration/
│   │   ├── page.tsx              # Mission creation page (agent selection + brief)
│   │   └── [missionId]/
│   │       └── page.tsx          # Mission execution/monitoring page
│   └── api/
│       └── orchestration/
│           ├── route.ts          # POST: create mission
│           └── [missionId]/
│               └── stream/
│                   └── route.ts  # GET: multiplexed SSE stream
├── components/
│   └── orchestration/
│       ├── AgentSelector.tsx     # Multi-select agent grid with checkboxes
│       ├── BriefInput.tsx        # Mission brief textarea
│       ├── MissionLanes.tsx      # Container for parallel lanes
│       ├── AgentLane.tsx         # Single agent's streaming output
│       └── MissionHeader.tsx     # Mission status bar
├── lib/
│   └── services/
│       └── orchestration.ts      # Mission CRUD + stream orchestration
├── store/
│   └── orchestration.ts          # Zustand store for mission state
└── types/
    └── orchestration.ts          # Mission, Lane, OrchSSEEvent types
```

### Pattern 1: Server-Side Stream Multiplexing
**What:** Single SSE endpoint spawns N Anthropic streams, tags each event with agentId
**When to use:** Always for orchestration streaming
**Example:**
```typescript
// /api/orchestration/[missionId]/stream/route.ts
export async function GET(request: NextRequest, { params }: { params: { missionId: string } }) {
  const mission = await orchestrationService.getMission(params.missionId);
  const apiKey = await settingsService.getApiKey();
  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let activeStreams = mission.lanes.length;

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Spawn all agent streams in parallel
      const streamPromises = mission.lanes.map(async (lane) => {
        const agent = lane.agent;
        try {
          const anthropicStream = client.messages.stream({
            model: mission.model,
            max_tokens: 4096,
            system: agent.systemPrompt + deliverableInstruction,
            messages: [{ role: "user", content: mission.brief }],
          });

          anthropicStream.on("text", (text) => {
            send({ type: "text", agentId: agent.id, text });
          });

          await new Promise<void>((resolve, reject) => {
            anthropicStream.on("end", async () => {
              const finalMessage = await anthropicStream.finalMessage();
              send({ type: "agent_done", agentId: agent.id, usage: finalMessage.usage });
              // Persist messages to the lane's ChatSession
              await chatService.addMessage(lane.sessionId, "user", mission.brief);
              await chatService.addMessage(lane.sessionId, "assistant", /* accumulated text */, {
                input: finalMessage.usage.input_tokens,
                output: finalMessage.usage.output_tokens,
              });
              activeStreams--;
              if (activeStreams === 0) {
                send({ type: "mission_done" });
                controller.close();
              }
              resolve();
            });
            anthropicStream.on("error", (error) => {
              send({ type: "error", agentId: agent.id, message: error.message });
              activeStreams--;
              if (activeStreams === 0) {
                send({ type: "mission_done" });
                controller.close();
              }
              resolve(); // Don't reject, other streams should continue
            });
          });
        } catch (error) {
          send({ type: "error", agentId: agent.id, message: String(error) });
          activeStreams--;
          if (activeStreams === 0) controller.close();
        }
      });

      // Don't await -- streams run in parallel via event handlers
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

### Pattern 2: Client-Side Lane Demultiplexing
**What:** Single fetch reader dispatches events to per-agent state slices
**When to use:** In the orchestration Zustand store
**Example:**
```typescript
// store/orchestration.ts
interface LaneState {
  agentId: string;
  agentName: string;
  content: string;
  status: "streaming" | "done" | "error";
  error?: string;
}

interface OrchestrationState {
  missionId: string | null;
  brief: string;
  lanes: Record<string, LaneState>;
  missionStatus: "idle" | "streaming" | "done";
  startMission: (missionId: string, agents: Agent[]) => void;
  handleSSEEvent: (event: OrchSSEEvent) => void;
}

// In the store, handleSSEEvent dispatches by agentId:
handleSSEEvent: (event) => {
  if (event.type === "text") {
    set((s) => ({
      lanes: {
        ...s.lanes,
        [event.agentId]: {
          ...s.lanes[event.agentId],
          content: s.lanes[event.agentId].content + event.text,
        },
      },
    }));
  } else if (event.type === "agent_done") {
    set((s) => ({
      lanes: {
        ...s.lanes,
        [event.agentId]: { ...s.lanes[event.agentId], status: "done" },
      },
    }));
  } else if (event.type === "mission_done") {
    set({ missionStatus: "done" });
  }
}
```

### Pattern 3: Prisma Schema Extension
**What:** Mission model linking to multiple ChatSessions via MissionLane
**Example:**
```prisma
model Mission {
  id        String        @id @default(cuid())
  brief     String
  model     String        @default("claude-sonnet-4-6")
  status    String        @default("pending") // pending | streaming | done
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  lanes     MissionLane[]
}

model MissionLane {
  id        String      @id @default(cuid())
  missionId String
  mission   Mission     @relation(fields: [missionId], references: [id], onDelete: Cascade)
  agentId   String
  agent     Agent       @relation(fields: [agentId], references: [id])
  sessionId String      @unique
  session   ChatSession @relation(fields: [sessionId], references: [id])
  status    String      @default("pending") // pending | streaming | done | error
  createdAt DateTime    @default(now())

  @@unique([missionId, agentId])
}
```

### Anti-Patterns to Avoid
- **Separate SSE connections per agent:** Hits browser's 6-connection limit on HTTP/1.1. Always multiplex through a single endpoint.
- **Storing orchestration state in chat store:** Keep orchestration state separate. The chat store is scoped to a single session; orchestration manages N sessions simultaneously.
- **Agent-to-agent communication:** Explicitly out of scope per REQUIREMENTS.md. Each agent processes the brief independently.
- **Polling for updates:** SSE is push-based. Never poll the server for stream updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE event parsing | Custom parser | Existing SSE parsing pattern from chat store | Already proven, handles edge cases (buffering, incomplete chunks) |
| Agent selection UI | Custom multi-select | shadcn checkbox + existing AgentGrid/AgentCard | Reuse agent catalog components with selection overlay |
| Streaming text accumulation | Custom buffer management | Same pattern as chat store's message concatenation | Proven pattern, handles abort/error cases |
| Deliverable review on orchestration output | New review system | Existing ReviewPanel + deliverable parser | ORCH-04 says "flow into review system" -- reuse Phase 3 entirely |

**Key insight:** Orchestration is fundamentally "N chat sessions running in parallel with a shared starting prompt." Every individual stream uses the exact same Anthropic SDK pattern, message persistence, and deliverable parsing. The new work is the multiplexing layer and multi-lane UI.

## Common Pitfalls

### Pitfall 1: Browser Connection Limits
**What goes wrong:** Opening separate SSE/fetch connections per agent lane. Browsers limit to 6 concurrent connections per origin on HTTP/1.1.
**Why it happens:** Seems simpler to reuse the existing `/api/chat` endpoint per agent.
**How to avoid:** Single multiplexed SSE endpoint. Server spawns all streams internally.
**Warning signs:** Agents 7+ never start streaming; connections hang.

### Pitfall 2: Race Conditions in Stream Completion
**What goes wrong:** Mission marked "done" before all agent streams complete; or partial persistence.
**Why it happens:** `activeStreams` counter not properly decremented on error paths.
**How to avoid:** Decrement counter in ALL terminal paths (done, error, catch). Use a single `checkCompletion()` function.
**Warning signs:** Mission status stuck in "streaming" after all lanes show done/error.

### Pitfall 3: Memory Accumulation with Many Lanes
**What goes wrong:** Zustand store accumulates full text for all lanes in memory. With 10+ agents producing long outputs, memory grows fast.
**Why it happens:** String concatenation in state for each text chunk across N agents.
**How to avoid:** This is acceptable for v1 (typical mission is 3-5 agents). Document as known limitation. For v2, consider virtualized rendering.
**Warning signs:** Browser tab becomes sluggish with 10+ agents.

### Pitfall 4: Abort/Cleanup for In-Flight Streams
**What goes wrong:** User navigates away or cancels; server-side Anthropic streams keep running and consuming tokens.
**Why it happens:** No signal propagation from client disconnect to server stream cancellation.
**How to avoid:** Pass AbortSignal to the SSE endpoint. Use `request.signal` from NextRequest. On abort, call `.abort()` on each Anthropic stream instance.
**Warning signs:** Token usage continues after user leaves orchestration page.

### Pitfall 5: Deliverable Extraction Timing
**What goes wrong:** Trying to parse deliverables from partially streamed content.
**Why it happens:** Reusing chat's "parse after complete" assumption, but orchestration has multiple completion events.
**How to avoid:** Parse deliverables per-lane only after that lane's `agent_done` event. Existing pattern: deliverables parsed after streaming completes.
**Warning signs:** Incomplete `<deliverable>` tags causing parser errors.

## Code Examples

### Mission Creation API
```typescript
// POST /api/orchestration
export async function POST(request: NextRequest) {
  const { agentIds, brief, model } = await request.json();

  // Create a ChatSession per agent
  const mission = await prisma.mission.create({
    data: {
      brief,
      model: model || "claude-sonnet-4-6",
      lanes: {
        create: await Promise.all(
          agentIds.map(async (agentId: string) => {
            const session = await chatService.createSession(agentId, model);
            return { agentId, sessionId: session.id };
          })
        ),
      },
    },
    include: { lanes: { include: { agent: true } } },
  });

  return Response.json({ missionId: mission.id });
}
```

### Agent Lane Component
```typescript
// components/orchestration/AgentLane.tsx
interface AgentLaneProps {
  agentId: string;
  agentName: string;
  division: string;
}

export function AgentLane({ agentId, agentName, division }: AgentLaneProps) {
  const lane = useOrchestrationStore((s) => s.lanes[agentId]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-row items-center gap-2 py-2 px-3">
        <span className="font-medium text-sm">{agentName}</span>
        <Badge variant="secondary">{division}</Badge>
        <StatusIndicator status={lane?.status ?? "pending"} />
      </CardHeader>
      <ScrollArea className="flex-1 p-3">
        <MarkdownRenderer content={lane?.content ?? ""} />
        {/* After lane completes, render ReviewPanels for any deliverables */}
        {lane?.status === "done" && (
          <DeliverableReviews content={lane.content} sessionId={lane.sessionId} />
        )}
      </ScrollArea>
    </Card>
  );
}
```

### OrchSSEEvent Types
```typescript
// types/orchestration.ts
export type OrchSSEEvent =
  | { type: "text"; agentId: string; text: string }
  | { type: "agent_done"; agentId: string; usage: { input_tokens: number; output_tokens: number } }
  | { type: "error"; agentId: string; message: string }
  | { type: "mission_done" };

export interface MissionSummary {
  id: string;
  brief: string;
  model: string;
  status: string;
  lanes: Array<{
    agentId: string;
    agentName: string;
    division: string;
    sessionId: string;
    status: string;
  }>;
  createdAt: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EventSource API for SSE | fetch + ReadableStream | ~2023 | Supports POST bodies, custom headers, better error handling |
| WebSocket for real-time | SSE for unidirectional streaming | Ongoing | SSE is simpler for server-to-client only; no connection upgrade needed |
| Separate streams per consumer | Multiplexed tagged events | Standard practice | Avoids connection limits, simplifies cleanup |

**Deprecated/outdated:**
- EventSource API: Still works but doesn't support POST requests or custom headers. The project already uses fetch + ReadableStream.

## Open Questions

1. **Maximum agents per mission?**
   - What we know: Anthropic has rate limits (RPM varies by tier). Each lane is one API call.
   - What's unclear: User's rate limit tier. With 61 agents available, could they select all 61?
   - Recommendation: Default cap at 10 agents per mission. Show warning if selecting >5. Can be adjusted later.

2. **Mission history and re-running?**
   - What we know: Missions persist in DB. Each lane creates a ChatSession.
   - What's unclear: Should users be able to view completed missions? Re-run with different agents?
   - Recommendation: For v1, focus on creation and execution. Mission list page is nice-to-have but not in ORCH requirements.

3. **Follow-up messages per lane?**
   - What we know: Each lane creates a ChatSession. The chat infrastructure supports conversation continuity.
   - What's unclear: Should users be able to send follow-up messages to individual lanes within orchestration?
   - Recommendation: For v1, orchestration is single-shot (brief only). Users can navigate to individual chat sessions for follow-up. This keeps the scope tight.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORCH-01 | Create mission with multiple agent IDs | unit | `npx vitest run src/lib/services/__tests__/orchestration.test.ts -x` | No - Wave 0 |
| ORCH-02 | Mission stores brief, sends to all agents | unit | `npx vitest run src/lib/services/__tests__/orchestration.test.ts -x` | No - Wave 0 |
| ORCH-03 | Parallel stream spawning, lane-tagged events | unit | `npx vitest run src/app/api/orchestration/__tests__/stream.test.ts -x` | No - Wave 0 |
| ORCH-04 | Lane events demux to store, deliverables parsed | unit | `npx vitest run src/store/__tests__/orchestration.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `src/lib/services/__tests__/orchestration.test.ts` -- covers ORCH-01, ORCH-02 (mission CRUD)
- [ ] `src/app/api/orchestration/__tests__/stream.test.ts` -- covers ORCH-03 (parallel streaming)
- [ ] `src/store/__tests__/orchestration.test.ts` -- covers ORCH-04 (store demuxing)
- [ ] Prisma schema migration for Mission + MissionLane models
- [ ] Extend `src/test/mocks/anthropic.ts` to support multiple concurrent mock streams

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/api/chat/route.ts`, `store/chat.ts`, `prisma/schema.prisma` -- proven SSE streaming, Anthropic SDK usage, and Zustand patterns
- Anthropic SDK TypeScript: `client.messages.stream()` supports multiple concurrent instances (verified from existing usage in codebase)

### Secondary (MEDIUM confidence)
- [Anthropic SDK TypeScript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) -- SDK architecture and streaming API
- [Anthropic Streaming Messages Docs](https://docs.anthropic.com/en/api/messages-streaming) -- SSE event format
- [SSE in React 2026](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view) -- Modern SSE patterns confirming fetch+ReadableStream approach

### Tertiary (LOW confidence)
- Browser 6-connection limit: Well-known HTTP/1.1 constraint, verified by multiple community sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, patterns proven in Phases 2-3
- Architecture: HIGH -- multiplexed SSE is a straightforward extension of existing single-stream pattern
- Pitfalls: HIGH -- connection limits and race conditions are well-documented; abort handling pattern exists in chat store
- Schema design: MEDIUM -- Mission/MissionLane is clean but exact field set may need tuning during implementation

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable stack, no fast-moving dependencies)
