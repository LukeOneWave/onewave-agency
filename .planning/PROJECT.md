# OneWave AI Digital Agency

## What This Is

A local web application for managing and working with 61+ specialized AI agents. Users can browse agents by division, create custom agents, chat via streaming Claude API, review deliverables through an approve/revise workflow with diff comparison and inline editing, orchestrate multi-agent missions, manage projects with Kanban task boards, and navigate everything via a Cmd+K command palette. Named "OneWave AI Digital Agency."

## Core Value

The ability to review, approve, and iterate on agent-produced deliverables — the review workflow is the centerpiece that makes AI agent output actionable rather than disposable.

## Requirements

### Validated

- ✓ Browse, search, and filter 61 agents across 9 divisions — v1.0
- ✓ View agent detail with full personality/process/metrics — v1.0
- ✓ Chat with agents via streaming Claude API responses — v1.0
- ✓ Rich markdown/code rendering in chat with syntax highlighting — v1.0
- ✓ Review panel for agent deliverables (approve, revise with feedback) — v1.0
- ✓ Multi-agent orchestration with parallel execution lanes — v1.0
- ✓ Dashboard with stats, activity feed, and utilization charts — v1.0
- ✓ Settings page with API key management and model selection — v1.0
- ✓ Dark mode with dark default — v1.0
- ✓ Create and edit custom agents — v2.0
- ✓ Clone agents as starting point for new custom agents — v2.0
- ✓ Review queue widget on dashboard with pending items — v2.0
- ✓ Inline editing of deliverable content — v2.0
- ✓ Side-by-side diff view between revision versions — v2.0
- ✓ Orchestration review board (Kanban for mission deliverables) — v2.0
- ✓ Project management with agent assignment and task tracking — v2.0
- ✓ Task Kanban board (To Do / In Progress / Review / Done) — v2.0
- ✓ Deliverables tab on projects with review status — v2.0
- ✓ Global search (Cmd+K) across agents, projects, sessions — v2.0
- ✓ Dark/light mode toggle — v2.0
- ✓ Past session browsing and resumption — v2.0
- ✓ Production polish: page transitions, entrance animations, loading skeletons — v2.0

### Active

(None — planning next milestone)

### Out of Scope

- Multi-user / authentication — single-user local app
- Mobile-responsive layout — desktop-first power tool
- Deployment to cloud — runs locally via `npm run dev`
- Real-time collaboration — single user
- Agent-to-agent communication — agents work independently on shared briefs
- AI model marketplace / multi-provider — Anthropic Claude only
- Inline commenting on deliverables (REVW-04) — deferred from v2.0
- Keyboard shortcuts for review workflow (REVW-05) — deferred from v2.0
- Task dependencies/subtasks — keep project management lightweight
- Due dates on tasks — keep project management lightweight
- Custom Kanban columns — fixed status categories sufficient

## Context

- Shipped v2.0 with 12,504 LOC TypeScript
- Tech stack: Next.js 16.1.6, Prisma 7, SQLite, Zustand, Recharts, shadcn/ui, Tailwind v4, dnd-kit, cmdk, react-diff-viewer-continued, tw-animate-css
- Source agents from github.com/msitarzewski/agency-agents (61 agents, 9 divisions) + custom agent builder
- Agent files parsed at seed time, stored in SQLite, served via API
- SSE streaming for both single-agent chat and multi-agent orchestration
- Deliverable extraction uses XML `<deliverable>` tags parsed with regex
- Project/task management with drag-and-drop Kanban boards
- Advanced review: diff viewer, inline editor, version tracking

## Constraints

- **Runtime**: Local only — single `npm run dev` command, no Docker, no external services
- **Database**: SQLite via Prisma — zero setup, file-based
- **AI Provider**: Anthropic Claude API only (Sonnet 4.6, Opus 4.6, Haiku 4.5)
- **Stack**: Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 16 monolithic app | Single process, App Router, API routes built in — simplest local setup | ✓ Good |
| SQLite via Prisma 7 | Zero-config database, no Docker needed, sufficient for single-user | ✓ Good |
| shadcn/ui + Tailwind v4 | Production-grade components, consistent design system, dark mode built in | ✓ Good |
| SSE for streaming | Simpler than WebSocket for unidirectional streaming from Claude API | ✓ Good |
| Review-centric architecture | User's primary need is reviewing agent work, not just chatting | ✓ Good |
| XML deliverable markers | Deterministic regex parsing vs LLM-based extraction — reliable and testable | ✓ Good |
| Multiplexed SSE for orchestration | Single stream endpoint with lane-tagged events vs N separate connections | ✓ Good |
| Team collaboration context | System prompt amendment gives each agent awareness of team without inter-agent messaging | ✓ Good |
| dnd-kit for drag-and-drop | Lightweight, accessible, works with React 19 — used for task and review Kanban boards | ✓ Good |
| cmdk for command palette | Composable, accessible, lightweight — shouldFilter=false for server-filtered results | ✓ Good |
| textarea for inline editing | Simpler than contentEditable/Tiptap, sufficient for markdown deliverables | ✓ Good |
| motion-safe: CSS prefix | Accessibility-first animations that respect prefers-reduced-motion | ✓ Good |
| db push (no migrations) | Single-user local app — no migration history needed, simpler schema changes | ✓ Good |
| confirmedRef for optimistic UI | useRef tracks server-confirmed state for drag revert-on-error without stale closures | ✓ Good |

---
*Last updated: 2026-03-12 after v2.0 milestone*
