# Domain Pitfalls

**Domain:** AI Agent Management Platform (local Next.js app with streaming Claude API, multi-agent orchestration, review workflows, SQLite)
**Researched:** 2026-03-09

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Streaming Error Handling After 200 OK

**What goes wrong:** Claude API streaming returns a 200 HTTP status immediately, then streams SSE events. If an error occurs mid-stream (rate limit, overload, network drop), standard HTTP error handling never fires. The UI shows a partial response with no error indicator, or silently hangs.

**Why it happens:** Developers build error handling around HTTP status codes. With SSE streaming, the connection is already "successful" (200) when errors arrive as SSE error events. The Anthropic API can return 429 (rate limit) or 529 (server overload) errors mid-stream.

**Consequences:** Users see incomplete agent responses with no indication something went wrong. Chat history stores partial/corrupt responses. No retry mechanism kicks in because the app thinks the request succeeded.

**Prevention:**
- Listen for SSE `error` events separately from HTTP error handling
- Implement a `content_block_stop` / `message_stop` event check -- if the stream closes without a proper stop event, treat it as an error
- Store a `status` field on each message (streaming / complete / error / partial)
- Show inline retry buttons on failed/partial messages
- Implement exponential backoff with jitter for 429s; simple retry with 2-5s delay for 529s
- Use the `retry-after` header from 429 responses for precise wait times

**Detection:** Test by killing network mid-stream. Check if partial messages are distinguishable from complete ones in the UI and database.

**Phase relevance:** Phase 1 (Chat/Streaming foundation). Must be correct from day one or every downstream feature inherits broken error states.

**Confidence:** HIGH (verified via Anthropic official docs and multiple implementation guides)

---

### Pitfall 2: SQLite Write Contention During Multi-Agent Orchestration

**What goes wrong:** When multiple agents run in parallel (the orchestration feature), each agent's streaming response triggers frequent database writes (saving tokens, updating status, storing deliverables). SQLite only allows one writer at a time. Under WAL mode this means writers queue; without WAL mode, writers AND readers block each other. The app freezes or throws "database is locked" errors.

**Why it happens:** Developers treat SQLite like PostgreSQL. Parallel agent execution means concurrent writes -- saving streaming chunks, updating agent status, logging activity -- all hitting the same SQLite file simultaneously. Prisma's default SQLite configuration uses exclusive locking mode, which is even more restrictive.

**Consequences:** "Database is locked" errors crash agent sessions. UI becomes unresponsive during multi-agent runs. Data loss if transactions are rolled back silently. Users lose trust in the orchestration feature.

**Prevention:**
- Enable WAL mode in SQLite via Prisma connection string: `file:./dev.db?journal_mode=WAL`
- Serialize write operations through a single write queue (don't let each agent stream directly to DB)
- Buffer streaming tokens in memory; batch-write to DB at intervals (every 500ms or on completion) rather than per-token
- Set a generous busy_timeout (5000ms+) so writers wait rather than fail
- Keep read operations (dashboard stats, agent listings) separate from write-heavy paths

**Detection:** Run 3+ agents simultaneously in orchestration mode. Monitor for locked database errors in server logs. Check if the UI stutters during parallel agent runs.

**Phase relevance:** Phase 2 (Multi-Agent Orchestration). Must be designed before orchestration ships, but the write-buffering pattern should be established in Phase 1's chat implementation.

**Confidence:** HIGH (verified via SQLite official docs, Prisma GitHub issues, and multiple production accounts)

---

### Pitfall 3: The "Prompting Fallacy" in Multi-Agent Orchestration

**What goes wrong:** When multi-agent workflows produce poor results, teams reflexively tweak agent prompts. But the real problem is architectural: agents duplicate work, produce inconsistent output formats, miss context from other agents, or operate on stale information. Better prompts cannot fix broken coordination.

**Why it happens:** Prompt engineering is the most visible lever. Architecture problems (task decomposition, output schemas, context sharing) are harder to diagnose. The 61 agents in agency-agents have rich system prompts, which creates false confidence that prompt quality equals output quality.

**Consequences:** Weeks spent iterating prompts with no improvement. Orchestrated outputs are inconsistent across agents (one returns markdown, another returns JSON, another returns prose). The review workflow becomes chaotic because deliverables have no standardized structure to review.

**Prevention:**
- Define explicit output schemas per agent role (what format, what sections, what metadata)
- Build the orchestrator as a coordinator that enforces structure, not just a prompt relay
- Each agent in an orchestration gets: clear objective, required output format, available context from prior agents, and explicit task boundaries
- Validate agent outputs against schemas before passing to review workflow
- Start with sequential orchestration (agent A finishes, feeds agent B) before attempting parallel execution

**Detection:** If you're tweaking prompts more than twice for the same quality issue, the problem is architectural. Check if agents in the same orchestration produce outputs in different formats.

**Phase relevance:** Phase 2 (Multi-Agent Orchestration). The output schema enforcement should be designed before building the orchestration pipeline.

**Confidence:** HIGH (GitHub Engineering blog, Anthropic engineering blog, O'Reilly architecture guide all converge on this)

---

### Pitfall 4: Review Workflow That Nobody Uses

**What goes wrong:** The review panel is built as a secondary feature bolted onto chat, rather than the primary interaction surface. Users chat with agents, get responses, and move on -- never visiting the review queue. The approve/revise/comment workflow feels like unnecessary bureaucracy for a single-user local app.

**Why it happens:** Chat is the intuitive interaction model. Review workflows require deliberate friction (stopping to evaluate). In a single-user app, there's no social pressure to review. The review queue fills up with items nobody processes, becoming a guilt-inducing backlog.

**Consequences:** The core value proposition ("making AI output actionable rather than disposable") goes unrealized. The app becomes just another chat wrapper. The Kanban board and review queue become dead features.

**Prevention:**
- Make review the natural exit from chat, not a separate destination. When an agent produces a deliverable in chat, surface the review panel inline -- don't require navigating to a separate page
- Auto-detect deliverables in agent responses (code blocks, documents, plans) and prompt for review
- Keep the review actions lightweight: one-click approve, quick inline edit, or "revise with note" -- not a multi-step process
- Keyboard shortcuts (a/r/j/k) are critical for making review fast enough to not feel like a chore
- Show review status in the chat thread itself so the user sees the value of reviewing
- Dashboard should surface "3 items need review" as the primary CTA, not buried in a sidebar

**Detection:** Track how many deliverables get reviewed vs. generated. If the ratio drops below 50%, the UX is failing. Watch for the review queue growing unbounded.

**Phase relevance:** Phase 1 (Chat) must plant the seeds by identifying deliverables in chat. Phase 3 (Review Workflow) must make review feel integrated, not bolted on.

**Confidence:** MEDIUM (synthesized from UX research on approval workflows and agentic AI UX patterns; no direct precedent for single-user review apps)

---

### Pitfall 5: SSE Connection Management and Memory Leaks

**What goes wrong:** Each chat session opens an SSE connection. If the user navigates away from a chat, switches agents, or the component unmounts without properly closing the connection, orphaned SSE connections accumulate. The browser hits its per-domain connection limit (6 in most browsers for HTTP/1.1). New chats fail to stream. Memory usage climbs.

**Why it happens:** React component lifecycle and SSE connections are tricky. EventSource doesn't auto-close on unmount. AbortController patterns are often implemented incorrectly. The app has multiple streaming surfaces (chat, orchestration lanes) that can be open simultaneously.

**Consequences:** After switching between a few agents, streaming stops working entirely (connection limit hit). Browser tab memory grows over time. In orchestration mode with 3-4 parallel agents, you're already using half the connection budget.

**Prevention:**
- Use `AbortController` in every streaming fetch call; abort in React cleanup (`useEffect` return)
- Implement a connection manager singleton that tracks all active SSE connections and enforces a max (e.g., 4 concurrent streams)
- For orchestration, multiplex multiple agent streams over a single SSE connection from the server, demuxing by agent ID on the client
- Use `fetch()` with ReadableStream instead of `EventSource` for POST-based streaming (EventSource is GET-only, which doesn't work for sending chat messages)
- Close connections explicitly when chat components unmount, not just when the page unloads

**Detection:** Open 7+ chat sessions without closing any. Check browser DevTools Network tab for stuck SSE connections. Monitor browser memory in Task Manager during extended sessions.

**Phase relevance:** Phase 1 (Chat/Streaming). Architecture decision that's extremely expensive to retrofit.

**Confidence:** HIGH (well-documented browser limitation; verified across multiple SSE streaming guides)

## Moderate Pitfalls

### Pitfall 6: Prisma Client Instantiation in Next.js Dev Mode

**What goes wrong:** Next.js hot module replacement (HMR) re-executes modules on every code change. Without a singleton pattern, each reload creates a new Prisma Client instance, opening new database connections. After a few edits, you hit connection limits or see "too many clients" errors.

**Prevention:**
- Use the standard Prisma singleton pattern: store the client on `globalThis` in development mode
- `globalThis.__prisma = globalThis.__prisma || new PrismaClient()`
- This is well-documented but easy to forget in initial setup

**Phase relevance:** Phase 1 (Project Setup). Five-minute fix if you know about it; mysterious crashes if you don't.

**Confidence:** HIGH (Prisma official documentation)

---

### Pitfall 7: Kanban Drag-and-Drop Performance with Large Task Lists

**What goes wrong:** Using react-beautiful-dnd (deprecated, unmaintained) or a naive drag-and-drop implementation causes jank when the board has 50+ items. Every drag triggers re-renders of all cards in all columns. The orchestration review board and project task board both suffer.

**Prevention:**
- Use `@dnd-kit/core` and `@dnd-kit/sortable` -- actively maintained, built for performance, supports virtualization
- Memoize card components with `React.memo` and stable keys
- Use `useMemo` to group tasks by column only when data changes
- Implement optimistic updates for drag operations (update UI immediately, sync to DB async)
- If boards grow past 100 items, implement virtualized lists within columns

**Phase relevance:** Phase 3 (Kanban/Review Board). Library choice is the key decision; switching drag-and-drop libraries later requires rewriting all interaction code.

**Confidence:** HIGH (dnd-kit is the clear community consensus replacement for react-beautiful-dnd)

---

### Pitfall 8: Agent Seeding Fragility

**What goes wrong:** The 61 agent markdown files with YAML frontmatter have inconsistent formatting. A parser that works for 58 agents silently fails on 3 edge cases (missing fields, unusual YAML, markdown in frontmatter). The seed script reports success but the database has corrupted or incomplete agent records.

**Prevention:**
- Use a battle-tested YAML+frontmatter parser like `gray-matter`
- Define a Zod schema for agent frontmatter; validate every agent at seed time
- Make the seed script loud about failures: log warnings for missing optional fields, throw errors for missing required fields
- Add a post-seed verification step that counts agents per division and compares to expected counts
- Store the raw markdown alongside parsed fields so original data is never lost

**Detection:** After seeding, query the database for agents with null/empty fields. Compare DB agent count to filesystem file count.

**Phase relevance:** Phase 1 (Foundation/Data Setup). A broken seed poisons everything downstream.

**Confidence:** MEDIUM (based on the known structure of agency-agents repo; specific edge cases are speculative)

---

### Pitfall 9: API Key Exposure in Client-Side Code

**What goes wrong:** The Anthropic API key is stored in settings and used for chat. If API calls are made from the client side (browser), the API key is visible in network requests in DevTools. Even though this is a "local" app, this creates a bad security pattern and risks key leakage through browser extensions, copy-paste of network logs, or screen sharing.

**Prevention:**
- ALL Claude API calls must go through Next.js API routes (server-side), never from the browser
- Store the API key in environment variables or an encrypted settings store
- Never include the API key in any API response to the client
- The client sends chat requests to `/api/chat`, which proxies to Anthropic server-side

**Phase relevance:** Phase 1 (Chat). Architectural constraint that must be established from the first API call.

**Confidence:** HIGH (fundamental web security pattern)

---

### Pitfall 10: Token/Cost Tracking Blindness

**What goes wrong:** Multi-agent orchestration with Sonnet/Opus models can consume significant tokens. Without tracking, users have no idea what a single orchestration run costs. They run expensive Opus orchestrations casually, then get a surprise Anthropic bill.

**Prevention:**
- Track input/output tokens per message (available in Claude API response metadata and `message_delta` usage events)
- Display estimated cost per conversation and per orchestration run
- Show model-specific pricing (Haiku is 60x cheaper than Opus for input tokens)
- Add a "cost so far" indicator in the orchestration view
- Consider defaulting to Sonnet for orchestration agents and Opus only for lead/review agents

**Phase relevance:** Phase 1 (Chat) for per-message tracking. Phase 2 (Orchestration) for aggregate cost display.

**Confidence:** HIGH (Anthropic pricing is public; token tracking is available in the streaming API)

## Minor Pitfalls

### Pitfall 11: Dark Mode Glassmorphism Contrast Issues

**What goes wrong:** Glassmorphism effects (blur, transparency) look great in mockups but create readability issues in dark mode. Text over blurred backgrounds becomes illegible when the background content has similar luminance to the text.

**Prevention:**
- Test glassmorphism panels over every possible background (dashboards, chat, kanban boards)
- Use solid fallback backgrounds with subtle transparency rather than heavy blur
- Ensure WCAG AA contrast ratios on all text, even over glass effects
- shadcn/ui's design tokens handle dark mode well; don't fight them with custom transparency

**Phase relevance:** Phase 1 (UI Foundation). Set the design system constraints early.

**Confidence:** MEDIUM (general UI/UX pattern; specific to this project's design requirements)

---

### Pitfall 12: Global Search (Cmd+K) Performance with Growing Data

**What goes wrong:** Full-text search across agents, projects, sessions, and chat messages becomes slow as data grows. Naive `LIKE '%query%'` queries in SQLite don't use indexes and scan full tables.

**Prevention:**
- Use SQLite FTS5 (full-text search) extension for chat message search
- For agents and projects (small datasets), in-memory filtering is fine
- Debounce search input (300ms) to avoid query spam
- Show results in categories (Agents, Projects, Messages) with limits per category
- Consider indexing only message summaries, not full streaming content

**Phase relevance:** Phase 4 (Polish). Can be naive initially but needs FTS5 before the app has meaningful chat history.

**Confidence:** MEDIUM (SQLite FTS5 is well-documented; performance thresholds depend on actual data volume)

---

### Pitfall 13: Markdown Rendering XSS in Chat

**What goes wrong:** Agent responses contain markdown with code blocks, which gets rendered as HTML. Without sanitization, a prompt injection could cause an agent to output malicious HTML/JS that executes in the app.

**Prevention:**
- Use a markdown renderer with built-in sanitization (e.g., `react-markdown` with `rehype-sanitize`)
- Never use `dangerouslySetInnerHTML` for agent output
- Whitelist allowed HTML elements and attributes
- Test with adversarial prompts that attempt to inject script tags

**Phase relevance:** Phase 1 (Chat). Security baseline.

**Confidence:** HIGH (standard web security concern for any LLM chat interface)

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Foundation/Chat | SSE connection leaks, error handling after 200 | Connection manager singleton, stream status tracking |
| Phase 1: Foundation/Chat | Prisma singleton not set up | Use globalThis pattern from Prisma docs |
| Phase 1: Foundation/Chat | API key in client-side code | All Claude calls via API routes, never browser |
| Phase 2: Multi-Agent Orchestration | SQLite write contention | WAL mode + write queue + batch writes |
| Phase 2: Multi-Agent Orchestration | Prompt tweaking instead of fixing architecture | Define output schemas, enforce structure |
| Phase 2: Multi-Agent Orchestration | Connection limit hit with parallel agents | Multiplex streams over single SSE connection |
| Phase 2: Multi-Agent Orchestration | Cost surprise from parallel Opus calls | Token tracking + per-orchestration cost display |
| Phase 3: Review Workflow | Review panel feels bolted on, nobody uses it | Inline review in chat, auto-detect deliverables |
| Phase 3: Review/Kanban | Drag-and-drop library choice locks you in | Use dnd-kit from the start, not react-beautiful-dnd |
| Phase 4: Polish/Search | Global search slow on large datasets | SQLite FTS5 for chat messages |

## Sources

- [Anthropic Streaming Messages Docs](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Anthropic Rate Limits Docs](https://platform.claude.com/docs/en/api/rate-limits)
- [Anthropic Errors Docs](https://platform.claude.com/docs/en/api/errors)
- [GitHub Blog: Multi-agent workflows often fail](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/)
- [Anthropic Engineering: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [O'Reilly: Designing Effective Multi-Agent Architectures](https://www.oreilly.com/radar/designing-effective-multi-agent-architectures/)
- [SQLite Concurrent Writes](https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/)
- [Prisma WAL mode discussion](https://github.com/prisma/prisma/issues/3303)
- [Prisma exclusive locking mode issue](https://github.com/prisma/prisma-engines/issues/4675)
- [Upstash: SSE Streaming LLM Responses](https://upstash.com/blog/sse-streaming-llm-responses)
- [Marmelab: Kanban Board with shadcn](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html)
- [Fixing Slow SSE Streaming in Next.js](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996)
- [Designative: Agentic AI UX](https://www.designative.info/2025/11/20/flows-age-agentic-ai-what-if-our-core-ux-models-no-longer-apply/)
