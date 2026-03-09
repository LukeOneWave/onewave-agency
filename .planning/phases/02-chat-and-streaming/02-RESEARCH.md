# Phase 2: Chat and Streaming - Research

**Researched:** 2026-03-09
**Domain:** Real-time AI chat with streaming, markdown rendering, model selection
**Confidence:** HIGH

## Summary

Phase 2 adds real-time chat functionality where users converse with any of the 68 seeded agents via the Anthropic Claude API. The core technical challenge is wiring a Next.js Route Handler to the `@anthropic-ai/sdk` streaming API and piping text deltas to the client via Server-Sent Events (SSE). The project already has `react-markdown` and `remark-gfm` installed, so markdown rendering is partially solved -- syntax highlighting for code blocks is the remaining gap.

The database needs two new models: `ChatSession` (ties a user conversation to an agent and model) and `Message` (stores each user/assistant turn with role, content, and token counts). The agent's `systemPrompt` field (already populated for all 68 agents) is passed as the `system` parameter in the Claude API call. Model selection is a simple dropdown storing one of three API identifiers.

**Primary recommendation:** Use `@anthropic-ai/sdk` with `messages.stream()` for the backend, SSE via `ReadableStream` in a Next.js Route Handler for transport, and `rehype-highlight` for code syntax highlighting (lightweight, works client-side with streaming content, no build-time dependency).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | User can start a chat session with any agent | Prisma ChatSession model + API route to create session + "Chat with Agent" button on agent detail/catalog |
| CHAT-02 | Agent responses stream in real-time via Claude API | `@anthropic-ai/sdk` messages.stream() + SSE Route Handler + client-side EventSource consumption |
| CHAT-03 | Chat renders markdown and syntax-highlighted code blocks | `react-markdown` (already installed) + `remark-gfm` (installed) + `rehype-highlight` (new) + highlight.js CSS theme |
| CHAT-04 | User can select which Claude model to use | Model selector dropdown with three options: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | latest (0.70+) | Claude API client with streaming | Official Anthropic SDK; `messages.stream()` provides event helpers and message accumulation |
| react-markdown | 10.1.0 | Render markdown in chat messages | Already installed; standard React markdown renderer |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown (tables, strikethrough) | Already installed; extends react-markdown |
| rehype-highlight | latest | Syntax highlighting for code blocks | Uses highlight.js/lowlight; lightweight, works at render-time, no build step needed |
| highlight.js | (peer of rehype-highlight) | Language grammars + CSS themes | Bundles 37 common languages by default; provides dark theme CSS |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.11 | Chat UI state (current session, messages, streaming status) | Already installed; extend existing store or create chat-specific store |
| lucide-react | 0.577.0 | Icons for send button, model selector, streaming indicator | Already installed |
| sonner | 2.0.7 | Toast notifications for errors (API key missing, rate limit) | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rehype-highlight | react-shiki / rehype-pretty-code | Shiki produces prettier output but adds ~2MB bundle; rehype-highlight is sufficient for chat and simpler to set up |
| Raw SSE via ReadableStream | Vercel AI SDK (ai package) | AI SDK abstracts streaming but adds a large dependency; raw SSE is straightforward for a single-provider app |
| EventSource client | fetch + ReadableStream reader | EventSource is simpler but doesn't support POST; use fetch with getReader() for POST-based SSE |

**Installation:**
```bash
npm install @anthropic-ai/sdk rehype-highlight
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # POST: streaming SSE endpoint
│   └── chat/
│       └── [sessionId]/
│           └── page.tsx          # Chat page (server component wrapper)
├── components/
│   └── chat/
│       ├── ChatPage.tsx          # Client component: orchestrates chat UI
│       ├── MessageList.tsx       # Renders message history + streaming message
│       ├── MessageBubble.tsx     # Single message with markdown rendering
│       ├── ChatInput.tsx         # Text input + send button
│       ├── ModelSelector.tsx     # Dropdown for model selection
│       └── StreamingIndicator.tsx # Typing/streaming animation
├── lib/
│   └── services/
│       └── chat.ts              # ChatSession + Message CRUD via Prisma
└── store/
    └── chat.ts                  # Zustand store for chat state
```

### Pattern 1: SSE Streaming via Route Handler
**What:** POST Route Handler that creates a Claude stream and pipes text deltas as SSE events to the client.
**When to use:** Every chat message send.
**Example:**
```typescript
// src/app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { settingsService } from "@/lib/services/settings";
import { agentService } from "@/lib/services/agent";

export async function POST(req: Request) {
  const { sessionId, agentSlug, messages, model } = await req.json();

  const apiKey = await settingsService.getApiKey();
  if (!apiKey) {
    return new Response("API key not configured", { status: 401 });
  }

  const agent = await agentService.getBySlug(agentSlug);
  if (!agent) {
    return new Response("Agent not found", { status: 404 });
  }

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const anthropicStream = client.messages.stream({
        model,
        max_tokens: 4096,
        system: agent.systemPrompt,
        messages,
      });

      anthropicStream.on("text", (text) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
        );
      });

      anthropicStream.on("end", () => {
        const finalMessage = anthropicStream.currentMessage;
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              usage: finalMessage?.usage,
            })}\n\n`
          )
        );
        controller.close();
      });

      anthropicStream.on("error", (error) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`
          )
        );
        controller.close();
      });
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

### Pattern 2: Client-Side Stream Consumption
**What:** Fetch the SSE endpoint and process text deltas to build up the assistant message incrementally.
**When to use:** Client component that displays streaming chat.
**Example:**
```typescript
// In chat store or hook
async function sendMessage(content: string) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      agentSlug: agent.slug,
      messages: [...history, { role: "user", content }],
      model: selectedModel,
    }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let assistantContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = JSON.parse(line.slice(6));
      if (data.type === "text") {
        assistantContent += data.text;
        // Update streaming message in state
      } else if (data.type === "done") {
        // Save final message to DB, update token usage
      } else if (data.type === "error") {
        // Show error toast
      }
    }
  }
}
```

### Pattern 3: Markdown Rendering in Message Bubbles
**What:** Use react-markdown with rehype-highlight for rich message display.
**When to use:** Every assistant message bubble.
**Example:**
```tsx
// src/components/chat/MessageBubble.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css"; // or any theme

function MessageBubble({ role, content }: { role: string; content: string }) {
  if (role === "user") {
    return <div className="bg-primary/10 rounded-lg p-3">{content}</div>;
  }

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

### Pattern 4: Prisma Schema for Chat
**What:** Database models for persisting chat sessions and messages.
**Example:**
```prisma
model ChatSession {
  id        String    @id @default(cuid())
  agentId   String
  agent     Agent     @relation(fields: [agentId], references: [id])
  model     String    @default("claude-sonnet-4-6")
  title     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}

model Message {
  id            String      @id @default(cuid())
  sessionId     String
  session       ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role          String      // "user" | "assistant"
  content       String
  inputTokens   Int?
  outputTokens  Int?
  createdAt     DateTime    @default(now())
}
```

The Agent model needs a `sessions` relation added:
```prisma
model Agent {
  // ... existing fields
  sessions ChatSession[]
}
```

### Anti-Patterns to Avoid
- **Storing API key client-side:** The API key is already server-only via settingsService. Never send it to the browser. The Route Handler reads it server-side.
- **Sending entire conversation to client on each delta:** Only send the new text delta, not the full accumulated message. The client accumulates locally.
- **Not handling SSE parsing edge cases:** SSE chunks can split across multiple `data:` lines or arrive concatenated. Always split on `\n\n` and filter properly.
- **Blocking the Route Handler return:** The ReadableStream must be returned immediately. Do NOT await the Anthropic stream before returning the Response -- the stream populates asynchronously.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom parser | react-markdown + remark-gfm | Edge cases in GFM tables, links, lists are endless |
| Syntax highlighting | Regex-based coloring | rehype-highlight (highlight.js) | Language grammar parsing is a solved, complex problem |
| Claude API streaming | Raw HTTP/fetch to Anthropic API | @anthropic-ai/sdk messages.stream() | Handles auth, retries, event parsing, type safety |
| SSE event format | Custom binary protocol | Standard SSE format (`data: ...\n\n`) | Works with browser EventSource and fetch reader patterns |

**Key insight:** The Anthropic SDK's `messages.stream()` handles all the complexity of SSE parsing, event typing, and message accumulation. Don't parse raw SSE events from the Anthropic API yourself.

## Common Pitfalls

### Pitfall 1: Not Validating API Key Before Streaming
**What goes wrong:** User sends a message but has no API key configured; the Anthropic client throws, but the SSE connection is already open.
**Why it happens:** API key check is skipped or done after stream setup.
**How to avoid:** Check `settingsService.getApiKey()` at the top of the Route Handler. Return 401 immediately if missing. Show a toast on the client directing user to Settings.
**Warning signs:** Empty/hanging chat responses with no error message.

### Pitfall 2: Message History Grows Unbounded
**What goes wrong:** Sending the full conversation history on every turn eventually exceeds the model's context window (200K tokens).
**Why it happens:** No truncation strategy.
**How to avoid:** For v1, this is low risk (conversations rarely exceed 200K). Add a simple guard: if the conversation exceeds ~150K tokens (estimated), truncate older messages from the array sent to the API (keep system prompt + last N messages). Token counting can be approximate (4 chars per token).
**Warning signs:** 400 errors from Anthropic API with "context length exceeded."

### Pitfall 3: SSE Chunks Split Across Reads
**What goes wrong:** A single `reader.read()` call may return partial SSE data (e.g., `data: {"type":"te` with the rest in the next chunk).
**Why it happens:** TCP framing doesn't align with SSE message boundaries.
**How to avoid:** Maintain a buffer. Append each chunk to the buffer, then extract complete `data: ...\n\n` segments. Only parse complete segments.
**Warning signs:** JSON parse errors during streaming, missing text chunks.

### Pitfall 4: Race Condition on Rapid Message Sends
**What goes wrong:** User sends a second message while the first is still streaming, causing interleaved responses.
**Why it happens:** No guard against concurrent sends.
**How to avoid:** Disable the send button and input while streaming. Track `isStreaming` in the Zustand store.
**Warning signs:** Garbled messages mixing two responses.

### Pitfall 5: Missing Error Recovery on Stream Failure
**What goes wrong:** Network drop mid-stream leaves the UI in a broken "streaming" state forever.
**Why it happens:** No error/abort handling on the fetch reader.
**How to avoid:** Use try/catch around the reader loop. On error, set isStreaming=false, show error toast, keep partial content visible. Handle AbortController for user-initiated cancellation.
**Warning signs:** Spinner that never stops, no error message shown.

## Code Examples

### Claude API Call with System Prompt
```typescript
// Source: Anthropic SDK docs + project agent schema
const anthropicStream = client.messages.stream({
  model: "claude-sonnet-4-6",    // User-selected model
  max_tokens: 4096,
  system: agent.systemPrompt,     // From Agent model in DB
  messages: [
    { role: "user", content: "Write me a brand strategy" },
  ],
});
```

### Model Selector Component
```tsx
// Source: Anthropic models overview docs
const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Fast & intelligent" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", description: "Most capable" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", description: "Fastest & cheapest" },
] as const;

// Use shadcn Select component for the dropdown
```

### Chat Service Layer
```typescript
// src/lib/services/chat.ts
import { prisma } from "@/lib/prisma";

export const chatService = {
  async createSession(agentId: string, model: string) {
    return prisma.chatSession.create({
      data: { agentId, model },
      include: { agent: true },
    });
  },

  async addMessage(sessionId: string, role: string, content: string, tokens?: { input?: number; output?: number }) {
    return prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        inputTokens: tokens?.input,
        outputTokens: tokens?.output,
      },
    });
  },

  async getSessionMessages(sessionId: string) {
    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
  },

  async getSession(id: string) {
    return prisma.chatSession.findUnique({
      where: { id },
      include: { agent: true, messages: true },
    });
  },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| claude-3-sonnet, claude-3-opus | claude-sonnet-4-6, claude-opus-4-6 | Feb 2026 | Use latest model IDs; Claude 3 Haiku deprecated Apr 2026 |
| messages.create({stream:true}) | messages.stream() | SDK 0.30+ (2024) | Higher-level API with event helpers; prefer .stream() |
| highlight.js direct usage | rehype-highlight plugin | Stable | Integrates with react-markdown via rehype plugin system |
| WebSocket for streaming | SSE via ReadableStream | Next.js 13+ | Route Handlers return Response with ReadableStream; simpler than WebSocket |

**Deprecated/outdated:**
- `claude-3-haiku-20240307`: Deprecated, retiring April 19, 2026. Use `claude-haiku-4-5` instead.
- Vercel AI SDK `useChat()`: Would work but is overkill for a single-provider app. Raw SSE is simpler and avoids the dependency.

## Open Questions

1. **Auto-title for chat sessions**
   - What we know: Sessions need a title for sidebar listing (Phase 2 v2 requirement CHAT-05)
   - What's unclear: Whether to auto-generate title from first message or ask user
   - Recommendation: Auto-generate from first user message (first 50 chars). Out of scope for v1 but design the schema to support it (nullable title field).

2. **Token counting accuracy**
   - What we know: The Anthropic API returns `usage.input_tokens` and `usage.output_tokens` in the final message
   - What's unclear: Whether to display token usage to users in Phase 2
   - Recommendation: Store token counts in the Message model now (from stream `done` event). Display is a Phase 5 dashboard concern.

3. **Stop/Cancel mid-stream**
   - What we know: Users may want to stop a long response
   - What's unclear: Whether this is a v1 requirement
   - Recommendation: Implement a stop button that calls `AbortController.abort()`. Low effort, high UX value.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Create chat session with agent | unit | `npx vitest run src/lib/services/__tests__/chat.test.ts -t "createSession"` | No - Wave 0 |
| CHAT-02 | Stream response from Claude API | integration | `npx vitest run src/app/api/chat/__tests__/route.test.ts` | No - Wave 0 |
| CHAT-03 | Markdown + syntax highlight rendering | unit | `npx vitest run src/components/chat/__tests__/MessageBubble.test.tsx` | No - Wave 0 |
| CHAT-04 | Model selection persists to session | unit | `npx vitest run src/lib/services/__tests__/chat.test.ts -t "model"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/services/__tests__/chat.test.ts` -- covers CHAT-01, CHAT-04 (service layer CRUD)
- [ ] `src/app/api/chat/__tests__/route.test.ts` -- covers CHAT-02 (mock Anthropic SDK, verify SSE output)
- [ ] `src/components/chat/__tests__/MessageBubble.test.tsx` -- covers CHAT-03 (markdown + code highlight rendering)
- [ ] Anthropic SDK mock utilities for test isolation

## Sources

### Primary (HIGH confidence)
- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) - Current model IDs: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5
- [anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) - Streaming API: messages.stream() with .on('text') and .finalMessage()
- Project codebase - Existing service layer pattern, Prisma schema, installed dependencies

### Secondary (MEDIUM confidence)
- [Upstash SSE Blog](https://upstash.com/blog/sse-streaming-llm-responses) - SSE streaming pattern with ReadableStream in Next.js Route Handlers
- [Next.js GitHub Discussion #48427](https://github.com/vercel/next.js/discussions/48427) - SSE in Route Handlers confirmed working pattern
- [rehype-highlight GitHub](https://github.com/rehypejs/rehype-highlight) - Plugin API for react-markdown integration

### Tertiary (LOW confidence)
- [react-shiki](https://github.com/AVGVSTVS96/react-shiki) - Alternative for streaming syntax highlighting (not recommended for this project due to complexity)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Anthropic SDK docs verified, react-markdown already installed and working
- Architecture: HIGH - SSE streaming in Next.js Route Handlers is well-documented and battle-tested
- Pitfalls: HIGH - SSE edge cases and streaming state management are well-known patterns
- Model IDs: HIGH - Verified directly from Anthropic's official models overview page

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable domain; model IDs may update)
