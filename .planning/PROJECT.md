# OneWave AI Digital Agency

## What This Is

A local web application for managing and working with 61 specialized AI agents. Users can browse agents by division, chat with them via streaming Claude API, review deliverables through an approve/revise workflow, orchestrate multi-agent missions with parallel execution lanes, and monitor agency activity through a dashboard. Named "OneWave AI Digital Agency."

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

### Active

- [ ] Create and edit custom agents
- [ ] Review queue widget on dashboard with pending items
- [ ] Inline editing and commenting on deliverables
- [ ] Diff view between revision versions
- [ ] Orchestration review board (Kanban for mission deliverables)
- [ ] Project management with agent assignment and task tracking
- [ ] Task Kanban board (To Do / In Progress / Review / Done)
- [ ] Deliverables tab on projects with review status
- [ ] Global search (Cmd+K) across agents, projects, sessions
- [ ] Dark/light mode toggle
- [ ] Keyboard shortcuts for review workflow (j/k navigate, a approve, r revise)
- [ ] Past session browsing and resumption
- [ ] Production-grade polish: animations, loading skeletons, page transitions

### Out of Scope

- Multi-user / authentication — single-user local app
- Mobile-responsive layout — desktop-first power tool
- Deployment to cloud — runs locally via `npm run dev`
- Real-time collaboration — single user
- Agent-to-agent communication — agents work independently on shared briefs
- AI model marketplace / multi-provider — Anthropic Claude only

## Context

- Shipped v1.0 with 6,823 LOC TypeScript across 172 files
- Tech stack: Next.js 16.1.6, Prisma 7, SQLite, Zustand, Recharts, shadcn/ui, Tailwind v4
- Source agents from github.com/msitarzewski/agency-agents (61 agents, 9 divisions)
- Agent files parsed at seed time, stored in SQLite, served via API
- SSE streaming for both single-agent chat and multi-agent orchestration
- Deliverable extraction uses XML `<deliverable>` tags parsed with regex

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

## Current Milestone: v2.0 Power User Platform

**Goal:** Transform OneWave from a chat-and-review tool into a full project management platform with custom agents, advanced review workflows, and production-grade UX.

**Target features:**
- Create and edit custom agents
- Review queue widget on dashboard with pending items
- Inline editing and commenting on deliverables
- Diff view between revision versions
- Orchestration review board (Kanban for mission deliverables)
- Project management with agent assignment and task tracking
- Task Kanban board (To Do / In Progress / Review / Done)
- Deliverables tab on projects with review status
- Global search (Cmd+K) across agents, projects, sessions
- Dark/light mode toggle
- Keyboard shortcuts for review workflow (j/k navigate, a approve, r revise)
- Past session browsing and resumption
- Production-grade polish: animations, loading skeletons, page transitions

---
*Last updated: 2026-03-10 after v2.0 milestone started*
