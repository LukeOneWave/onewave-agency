# Technology Stack

**Project:** OneWave AI Digital Agency
**Researched:** 2026-03-09
**Overall confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x (latest 15.5+) | App framework, API routes, SSR | Stable production release. Next.js 16 is available but has breaking changes (async request APIs fully enforced, removed `unstable_` prefixes). For a greenfield local app, 15.x gives stability without chasing edge. Turbopack dev is stable in 15. The PROJECT.md says 14, but 14 is now two major versions behind -- no reason to start there. | HIGH |
| TypeScript | 5.x | Type safety | Non-negotiable for any serious project. Next.js 15 has excellent TS support. | HIGH |
| React | 19.x | UI library | Ships with Next.js 15. React 19 brings use() hook, server components improvements. | HIGH |

### AI / Chat

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `ai` (Vercel AI SDK) | 6.x (latest 6.0.116) | Streaming chat, agent orchestration, tool execution | The standard for AI apps in Next.js. v6 introduces the `Agent` abstraction with `ToolLoopAgent` for multi-step tool execution loops. Handles SSE streaming, token-by-token rendering, and provider abstraction. Replaces the need to hand-roll SSE streaming from Claude. | HIGH |
| `@ai-sdk/anthropic` | 3.x (latest 3.0.58) | Claude provider for AI SDK | Official Anthropic provider. Supports claude-sonnet-4, claude-opus-4, claude-haiku-4.5 (matching PROJECT.md constraints). Handles streaming, tool use, structured outputs natively. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Prisma | 7.x (latest 7.2.0) | ORM, schema management, migrations | Type-safe database access with auto-generated client. Schema-first approach makes the data model the source of truth. `prisma db push` for rapid local dev, `prisma migrate` for schema evolution. | HIGH |
| `@prisma/adapter-better-sqlite3` | 7.x | SQLite driver | Prisma's default SQLite driver is slow. The better-sqlite3 adapter uses synchronous, native bindings -- reported 100x faster for simple queries. Zero-config for local app. | MEDIUM |
| SQLite | (via better-sqlite3) | Database | Zero-setup file-based database. Perfect for single-user local app. No Docker, no external services. Sufficient for 61 agents + chat history + project data. | HIGH |

### UI Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x (latest 4.2.x) | Utility-first CSS | v4 has 5x faster full builds, 100x faster incremental builds. CSS-first config (no `tailwind.config.js`). Uses cascade layers and `@property`. PROJECT.md specifies Tailwind -- v4 is the current stable. | HIGH |
| shadcn/ui | CLI v4 (latest) | Component library | Not a dependency -- copies components into your project. Gives you ownership. Built on Radix UI primitives. Includes Command (cmdk), Dialog, Sheet, Tabs, Card, Badge, and dozens more. Dark mode built in. CLI v4 just released March 2026 with agent-friendly skills. | HIGH |
| `@dnd-kit/core` + `@dnd-kit/sortable` | latest | Drag-and-drop for Kanban boards | Lightweight (~10kb), zero dependencies, accessible, supports pointer/touch/keyboard. Well-documented pattern for Kanban with shadcn/ui + Tailwind. Multiple production references exist for this exact combination. | HIGH |

### Markdown / Code Rendering

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `react-markdown` | latest | Render agent chat responses | Standard for rendering markdown in React. Supports remark/rehype plugin ecosystem. Works with streaming (re-renders as markdown grows). | HIGH |
| `rehype-highlight` or `shiki` | latest | Syntax highlighting in code blocks | `shiki` is the modern choice (used by VitePress, Astro) -- renders at build time with VS Code-quality themes. For streaming chat where content arrives incrementally, `rehype-highlight` (highlight.js based) may be simpler as it works client-side. Recommend starting with `rehype-highlight` and upgrading to `shiki` if quality matters more than simplicity. | MEDIUM |
| `remark-gfm` | latest | GitHub Flavored Markdown | Tables, strikethrough, task lists, autolinks. Agent responses often use GFM features. | HIGH |

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.x | Client-side global state | 3KB, zero boilerplate, works outside React components. Use for: chat session state, UI preferences, review queue state, command palette state. The AI SDK `useChat` hook handles chat-specific state internally -- Zustand complements it for app-level state (active project, active agent, sidebar state). | HIGH |

### Supporting Libraries

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `cmdk` (via shadcn Command) | Cmd+K command palette | Already included in shadcn/ui Command component. No separate install needed. |
| `date-fns` | Date formatting | Activity feeds, timestamps, relative dates ("2 hours ago"). Lightweight, tree-shakeable. |
| `lucide-react` | Icons | Ships with shadcn/ui. Consistent icon set, tree-shakeable. |
| `zod` | Schema validation | API route input validation, form validation, AI SDK structured outputs. |
| `next-themes` | Dark/light mode | Works with shadcn/ui out of the box. SSR-safe theme switching. |
| `recharts` | Dashboard charts | Utilization charts, activity graphs. Most popular React charting library, good shadcn/ui integration. |
| `sonner` | Toast notifications | Integrated with shadcn/ui. Review actions (approve, revise) need feedback. |

## What NOT to Use

| Technology | Why Not | Use Instead |
|------------|---------|-------------|
| Next.js 14 | Two major versions behind. Missing Turbopack stability, React 19, performance improvements. | Next.js 15.x |
| Next.js 16 | Breaking changes (fully async request APIs, removed `unstable_` prefixes). Ecosystem still maturing. Not worth the risk for a new project that needs to ship. | Next.js 15.x |
| Raw Anthropic SDK (`@anthropic-ai/sdk`) | You'd hand-roll SSE streaming, token parsing, tool execution loops, error handling. AI SDK does all of this with `streamText()` and the Agent abstraction. | `ai` + `@ai-sdk/anthropic` |
| WebSockets for streaming | Overkill for unidirectional streaming. SSE (Server-Sent Events) is simpler, built into AI SDK, works with Next.js API routes natively. | SSE via AI SDK |
| Redux / Redux Toolkit | Massive boilerplate for a single-user local app. No need for middleware, devtools, or normalized state. | Zustand |
| Jotai | Atomic state is great for complex interdependencies, but this app has straightforward global state needs. Zustand is simpler for the use case. | Zustand |
| React DnD / react-beautiful-dnd | react-beautiful-dnd is unmaintained (Atlassian archived it). React DnD has a steeper learning curve. | @dnd-kit |
| Drizzle ORM | Closer to SQL, which is great for performance-critical apps. But Prisma's schema-first approach, auto-migrations, and generated types are better for rapid development of a local app where performance isn't the bottleneck. | Prisma |
| MongoDB / PostgreSQL | Require external services or Docker. SQLite is zero-config and sufficient for single-user. | SQLite via Prisma |
| Tailwind CSS v3 | v4 is stable and significantly faster. No reason to start a new project on v3. | Tailwind CSS v4 |
| `react-syntax-highlighter` | Not actively maintained. Last significant update was years ago. | `rehype-highlight` or `shiki` |
| Chakra UI / Mantine / MUI | Lock you into their design system. shadcn/ui gives you the components as source code -- full ownership, Tailwind-native, customizable. | shadcn/ui |

## Version Pins & Compatibility Matrix

```
Next.js 15.5.x  -->  React 19.x  -->  Tailwind CSS 4.x
                -->  AI SDK 6.x  -->  @ai-sdk/anthropic 3.x
                -->  Prisma 7.x  -->  @prisma/adapter-better-sqlite3
                -->  shadcn/ui CLI v4 (Radix primitives)
```

All packages are compatible with Node.js 20 LTS (recommended) or Node.js 22.

## Installation

```bash
# Create Next.js project
npx create-next-app@latest onewave-agency --typescript --tailwind --eslint --app --src-dir

# Core AI
npm install ai @ai-sdk/anthropic

# Database
npm install prisma @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3
npm install -D @types/better-sqlite3

# State management
npm install zustand

# Markdown rendering
npm install react-markdown remark-gfm rehype-highlight

# Drag and drop (Kanban)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Utilities
npm install date-fns zod sonner next-themes recharts

# shadcn/ui (run after project setup)
npx shadcn@latest init
npx shadcn@latest add button card dialog sheet tabs badge command input textarea separator scroll-area dropdown-menu avatar tooltip

# Prisma init
npx prisma init --datasource-provider sqlite
```

## Architecture Implications

- **AI SDK 6 Agent abstraction** maps directly to the 61-agent model. Each agent can be defined with its own system prompt, tools, and model configuration. The `ToolLoopAgent` handles multi-step orchestration natively.
- **Prisma schema** should model: Agent, ChatSession, ChatMessage, Project, Task, Deliverable, Review, Division. SQLite handles this fine for single-user.
- **shadcn/ui Command** component gives you the Cmd+K palette with zero custom code for fuzzy search across agents, projects, and sessions.
- **Zustand stores**: `useAppStore` (active agent, sidebar, theme), `useReviewStore` (review queue, filters). Chat state lives in AI SDK's `useChat` hook.
- **Next.js App Router** with route groups: `(dashboard)`, `(agents)`, `(projects)`, `(chat)`, `(settings)`. API routes under `app/api/` for chat streaming and CRUD.

## Sources

- [Next.js 15 blog post](https://nextjs.org/blog/next-15)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6)
- [AI SDK Anthropic provider docs](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [AI SDK streamText reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Prisma SQLite docs](https://www.prisma.io/docs/orm/overview/databases/sqlite)
- [Prisma better-sqlite3 adapter](https://www.npmjs.com/package/@prisma/adapter-better-sqlite3)
- [shadcn/ui CLI v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- [shadcn/ui Command component](https://ui.shadcn.com/docs/components/radix/command)
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [dnd-kit homepage](https://dndkit.com/)
- [dnd-kit + shadcn/ui + Tailwind Kanban reference](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui)
- [Zustand npm trends vs alternatives](https://npmtrends.com/jotai-vs-recoil-vs-zustand)
