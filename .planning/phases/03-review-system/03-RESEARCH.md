# Phase 3: Review System - Research

**Researched:** 2026-03-09
**Domain:** Deliverable detection, inline review UI, revision feedback loop
**Confidence:** HIGH

## Summary

The review system is the product's core differentiator. It requires solving four connected problems: (1) detecting when an agent response is a "deliverable" vs. casual conversation, (2) rendering an inline review panel with approve/revise actions, (3) persisting deliverable status in the database, and (4) automatically injecting revision feedback back into the chat stream.

The existing codebase provides strong foundations: SSE streaming with a clean event protocol, a Zustand store with message state management, MessageBubble rendering with markdown support, and a Prisma schema ready for extension. No new dependencies are needed -- the review system is built entirely with existing stack (shadcn/ui buttons, Zustand state, Prisma models, existing API route pattern).

**Primary recommendation:** Use a structured-output approach where the system prompt instructs agents to wrap deliverables in XML-like markers (`<deliverable>...</deliverable>`), then parse these client-side during streaming. This is deterministic, testable, and avoids fragile heuristics. The review panel renders inline below the deliverable content in MessageBubble.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REVW-01 | Review panel appears in chat when agent produces a deliverable | Deliverable detection via structured markers in agent output; ReviewPanel component renders inline in MessageBubble |
| REVW-02 | User can approve a deliverable | Deliverable model with status enum (pending/approved/revised); API endpoint to update status; optimistic UI update in Zustand |
| REVW-03 | User can request revision with feedback notes | RevisionFeedback textarea in ReviewPanel; persisted as revision notes on Deliverable record |
| REVW-04 | Revision feedback is sent back to the agent as the next prompt | Reuse existing sendMessage flow; auto-compose revision prompt with context and inject into chat |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.4.2 | Deliverable model + status tracking | Already used for all data persistence |
| Zustand | 5.0.11 | Review state (deliverable status, revision UI) | Already used for chat state |
| shadcn/ui | 4.0.2 | Button, Card, Textarea for review panel | Already used across the app |
| lucide-react | 0.577.0 | Check, RotateCcw, MessageSquare icons | Already used for all icons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-markdown | 10.1.0 | Render deliverable content with formatting | Already used in MessageBubble |
| sonner | 2.0.7 | Toast notifications for approve/revise actions | Already used for error toasts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| XML markers in prompt | LLM classification heuristic | Markers are deterministic and testable; heuristics are fragile and agent-dependent |
| Inline review panel | Modal/sidebar review | Inline keeps context visible; modals break flow |
| Separate Deliverable table | Status field on Message | Separate table supports revision history, version tracking, and v2 features (REVW-05 through REVW-08) |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── chat/
│       ├── MessageBubble.tsx      # Modified: detect deliverables, render ReviewPanel
│       ├── ReviewPanel.tsx        # NEW: approve/revise actions + feedback form
│       └── RevisionFeedback.tsx   # NEW: textarea for revision notes
├── lib/
│   ├── services/
│   │   ├── chat.ts               # Extended: deliverable CRUD operations
│   │   └── deliverable.ts        # NEW: deliverable service layer
│   └── deliverable-parser.ts     # NEW: parse <deliverable> markers from content
├── store/
│   └── chat.ts                   # Extended: deliverable state + review actions
├── types/
│   └── chat.ts                   # Extended: Deliverable types, review status
└── app/
    └── api/
        └── deliverables/
            └── [id]/
                └── route.ts      # NEW: PATCH status, POST revision
```

### Pattern 1: Structured Deliverable Markers
**What:** Instruct agents via system prompt amendment to wrap deliverable outputs in `<deliverable>` tags. Parse these client-side.
**When to use:** Every agent message is checked for deliverable markers during rendering.
**Example:**
```typescript
// In deliverable-parser.ts
interface ParsedContent {
  segments: Array<
    | { type: 'text'; content: string }
    | { type: 'deliverable'; content: string; index: number }
  >;
  hasDeliverables: boolean;
}

export function parseDeliverables(content: string): ParsedContent {
  const regex = /<deliverable>([\s\S]*?)<\/deliverable>/g;
  const segments: ParsedContent['segments'] = [];
  let lastIndex = 0;
  let deliverableIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Text before deliverable
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    // The deliverable itself
    segments.push({ type: 'deliverable', content: match[1], index: deliverableIndex++ });
    lastIndex = regex.lastIndex;
  }

  // Remaining text after last deliverable
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return { segments, hasDeliverables: deliverableIndex > 0 };
}
```

### Pattern 2: System Prompt Amendment
**What:** Append a deliverable instruction block to every agent's system prompt before sending to Claude.
**When to use:** In the chat API route, before calling `client.messages.stream()`.
**Example:**
```typescript
// Append to agent.systemPrompt in route.ts
const deliverableInstruction = `

## Output Format
When you produce a final deliverable (a complete piece of work like a strategy document, code, copy, design brief, plan, or any actionable output), wrap it in <deliverable> tags:

<deliverable>
[Your complete deliverable here]
</deliverable>

Use <deliverable> tags ONLY for complete, reviewable outputs. Do NOT wrap conversational responses, questions, clarifications, or partial work in these tags.`;

const fullSystemPrompt = agent.systemPrompt + deliverableInstruction;
```

### Pattern 3: Optimistic UI with Server Reconciliation
**What:** Update deliverable status in Zustand immediately, then persist via API.
**When to use:** On approve/revise click for instant feedback.
**Example:**
```typescript
// In Zustand store
approveDeliverable: async (messageId: string, deliverableIndex: number) => {
  // Optimistic update
  set((s) => ({
    deliverables: {
      ...s.deliverables,
      [`${messageId}-${deliverableIndex}`]: { status: 'approved' }
    }
  }));
  // Persist
  await fetch(`/api/deliverables/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ index: deliverableIndex, status: 'approved' })
  });
}
```

### Pattern 4: Revision Auto-Send
**What:** When user submits revision feedback, auto-compose a message and call existing `sendMessage`.
**When to use:** After user writes revision notes and clicks "Request Revision".
**Example:**
```typescript
requestRevision: async (messageId: string, deliverableIndex: number, feedback: string) => {
  // Update status
  set((s) => ({
    deliverables: {
      ...s.deliverables,
      [`${messageId}-${deliverableIndex}`]: { status: 'revised', feedback }
    }
  }));

  // Persist status
  await fetch(`/api/deliverables/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ index: deliverableIndex, status: 'revised', feedback })
  });

  // Auto-send revision as next message
  const revisionPrompt = `Please revise the deliverable based on this feedback:\n\n${feedback}`;
  get().sendMessage(revisionPrompt);
}
```

### Anti-Patterns to Avoid
- **Heuristic-based detection:** Do NOT try to detect deliverables by message length, presence of headers, or content analysis. These are fragile and produce false positives/negatives.
- **Separate review page:** Do NOT build a standalone review page. The review must be inline in the chat to maintain context.
- **Blocking on persistence:** Do NOT wait for the deliverable to be saved before showing the review panel. Parse from content; persist async.
- **Mutating message content:** Do NOT strip `<deliverable>` tags from the stored message. Keep the raw content intact for re-parsing on reload.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status badges | Custom styled spans | shadcn Badge (already used) | Consistent styling, already in the app |
| Toast notifications | Custom notification system | sonner (already installed) | Already wired up in ChatPage |
| Form validation | Manual checks | Simple required attribute + Zod if complex | Over-engineering for a textarea |
| Icon buttons | Custom SVG buttons | lucide-react icons in shadcn Button | Consistent with rest of UI |

**Key insight:** This phase adds zero new dependencies. Everything needed is already installed and proven in Phases 1-2.

## Common Pitfalls

### Pitfall 1: Streaming Partial Tags
**What goes wrong:** During SSE streaming, `<deliverable>` tags arrive character-by-character. If you parse during streaming, you get partial matches and flickering UI.
**Why it happens:** The content builds up incrementally via the `text` SSE event.
**How to avoid:** Only parse deliverables and show the review panel AFTER streaming completes (`isStreaming === false` for that message). During streaming, render the raw markdown as-is (including the tag text). Once done, re-render with parsed segments.
**Warning signs:** Review panel appearing/disappearing during streaming; broken markdown rendering.

### Pitfall 2: Deliverable Identity Across Reloads
**What goes wrong:** Deliverables need stable IDs for status tracking. If you use array index from parsing, reloading the chat might produce different IDs.
**Why it happens:** Content parsing is deterministic but depends on content never changing.
**How to avoid:** Use `messageId + deliverableIndex` as a compound key. Since message content is immutable after persistence and deliverable order is deterministic from parsing, this is stable. Store in the Deliverable table with both messageId and index.
**Warning signs:** Approved deliverables showing as pending after page refresh.

### Pitfall 3: Revision Loop Without Context
**What goes wrong:** Agent receives "Please revise..." but has no context about what it originally produced or what the user's issue was.
**Why it happens:** The revision is just a new message -- agent has full conversation history including its original output.
**How to avoid:** This is actually fine because the existing chat architecture sends all messages in the conversation to the API. The agent sees its original deliverable and the revision feedback in sequence. No special handling needed.
**Warning signs:** None -- this works naturally with the existing architecture.

### Pitfall 4: System Prompt Injection Masking
**What goes wrong:** Users might type `<deliverable>` in their own messages, or agents might use the tag in conversation.
**Why it happens:** XML-like tags are common in technical discussion.
**How to avoid:** Only parse deliverable tags in messages with `role === 'assistant'`. User messages are never parsed. For edge cases where the agent mentions the tag in conversation, this is acceptable -- the review panel still shows, and the user can simply ignore it. In practice this is vanishingly rare.
**Warning signs:** Review panels showing up on user messages.

### Pitfall 5: Database Migration on Existing Data
**What goes wrong:** Adding a Deliverable model requires a migration. Existing messages won't have deliverables extracted.
**Why it happens:** Historical messages were created before the deliverable system existed.
**How to avoid:** Deliverables are parsed from content at render time, not pre-extracted. The Deliverable table only stores status/feedback for deliverables the user has interacted with (approved or revised). Unreviewed deliverables have no database row -- they just show the default "pending" state from the parsed content.
**Warning signs:** None if done correctly. The system is "lazy" -- only creates DB records on user action.

## Code Examples

### Prisma Schema Addition
```prisma
model Deliverable {
  id           String      @id @default(cuid())
  messageId    String
  message      Message     @relation(fields: [messageId], references: [id], onDelete: Cascade)
  index        Int         // Which deliverable in the message (0-based)
  status       String      @default("pending") // pending | approved | revised
  feedback     String?     // Revision notes when status is "revised"
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@unique([messageId, index])
}
```

Note: Add `deliverables Deliverable[]` relation to the existing Message model.

### ReviewPanel Component Structure
```typescript
// src/components/chat/ReviewPanel.tsx
interface ReviewPanelProps {
  messageId: string;
  deliverableIndex: number;
  status: 'pending' | 'approved' | 'revised';
  onApprove: () => void;
  onRequestRevision: (feedback: string) => void;
}

// Renders:
// - Status badge (pending/approved/revised)
// - Approve button (Check icon + "Approve")
// - Revise button (RotateCcw icon + "Request Revision")
// - Expandable textarea for revision notes (shown when "Request Revision" clicked)
// - Submit revision button
```

### Modified MessageBubble Rendering
```typescript
// In MessageBubble.tsx
import { parseDeliverables } from '@/lib/deliverable-parser';
import { ReviewPanel } from './ReviewPanel';

// For assistant messages, after streaming completes:
const parsed = parseDeliverables(content);

if (parsed.hasDeliverables) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-4">
        {parsed.segments.map((segment, i) => {
          if (segment.type === 'text') {
            return <MarkdownBlock key={i} content={segment.content} />;
          }
          return (
            <div key={i} className="rounded-lg border border-primary/20 p-4">
              <MarkdownBlock content={segment.content} />
              <ReviewPanel
                messageId={messageId}
                deliverableIndex={segment.index}
                status={deliverableStatus}
                onApprove={handleApprove}
                onRequestRevision={handleRevision}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### API Route for Deliverable Actions
```typescript
// src/app/api/deliverables/[id]/route.ts
// PATCH: Update deliverable status
// Body: { messageId, index, status, feedback? }
// Creates Deliverable record if not exists (lazy creation)
// Returns updated deliverable
```

### SSE Event Extension (Stream Completion Signal)
```typescript
// The existing 'done' event already signals stream completion.
// No changes needed to the SSE protocol.
// Deliverable parsing happens client-side after isStreaming becomes false.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LLM output classification | Structured output markers | 2024-2025 | Deterministic detection vs probabilistic guessing |
| Separate review interfaces | Inline review in context | 2024 | Better UX, maintains conversation context |
| Status stored in-memory only | Lazy DB persistence | Standard | Survives page reloads while avoiding N+1 queries |

**Deprecated/outdated:**
- Function calling for output structure: Overkill for this use case. The agent needs to output free-form content, not structured JSON. XML markers in free text are simpler and preserve markdown rendering.

## Open Questions

1. **Should the deliverable instruction be customizable per agent?**
   - What we know: All agents use the same `<deliverable>` wrapper instruction.
   - What's unclear: Some agents (e.g., code-focused) might need different trigger criteria than others (e.g., strategy).
   - Recommendation: Start with a universal instruction. Customize per-agent only if user feedback shows it's needed. The instruction is generic enough ("complete piece of work") to work across all agent types.

2. **Multiple deliverables in one message?**
   - What we know: An agent could produce multiple deliverables in a single response (e.g., "here's the strategy document and the implementation plan").
   - What's unclear: How often this happens in practice.
   - Recommendation: Support it from day one. The parser handles multiple `<deliverable>` blocks, and the compound key (`messageId + index`) supports it. Cost of supporting it is minimal.

3. **What happens when a revision produces a new deliverable?**
   - What we know: After revision feedback, the agent sends a new message with a new `<deliverable>` block.
   - What's unclear: Should there be a visual link between original and revised deliverable?
   - Recommendation: For v1, treat each message's deliverables independently. The conversation history itself provides the link. V2 (REVW-08) adds diff view between versions.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + jsdom |
| Config file | `/Users/luke/onewave-agency/vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REVW-01 | Deliverable parser detects `<deliverable>` tags in content | unit | `npx vitest run src/lib/__tests__/deliverable-parser.test.ts` | No - Wave 0 |
| REVW-01 | ReviewPanel renders when deliverable detected | unit | `npx vitest run src/components/chat/__tests__/ReviewPanel.test.tsx` | No - Wave 0 |
| REVW-02 | Approve action updates status to "approved" | unit | `npx vitest run src/lib/__tests__/deliverable-parser.test.ts` | No - Wave 0 |
| REVW-03 | Revision feedback textarea appears and captures notes | unit | `npx vitest run src/components/chat/__tests__/ReviewPanel.test.tsx` | No - Wave 0 |
| REVW-04 | Revision sends feedback as next chat message | unit | `npx vitest run src/store/__tests__/chat-review.test.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/deliverable-parser.test.ts` -- covers REVW-01, REVW-02 (parser logic)
- [ ] `src/components/chat/__tests__/ReviewPanel.test.tsx` -- covers REVW-01, REVW-03 (component rendering)
- [ ] `src/store/__tests__/chat-review.test.ts` -- covers REVW-04 (revision auto-send)

## Sources

### Primary (HIGH confidence)
- Project codebase analysis -- full review of existing schema, store, components, API routes
- Prisma schema and service layer -- direct code reading confirms extension points
- Zustand store pattern -- direct code reading confirms state management approach

### Secondary (MEDIUM confidence)
- Structured output marker approach -- based on established patterns in LLM application development (system prompt instructions with XML-like markers)
- Inline review UI pattern -- standard chat application UX pattern, no external library needed

### Tertiary (LOW confidence)
- None -- all findings are based on direct codebase analysis and established patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all tools already proven in Phases 1-2
- Architecture: HIGH -- patterns are straightforward extensions of existing code
- Deliverable detection: HIGH -- structured markers are deterministic and well-understood
- Pitfalls: HIGH -- identified from direct analysis of streaming code and state management
- UI pattern: HIGH -- simple component composition using existing primitives

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no fast-moving dependencies)
