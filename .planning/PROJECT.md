# OneWave AI Digital Agency

## What This Is

A production-grade local web application for managing and working with 61 specialized AI agents from the agency-agents repository. Users can browse agents by division, chat with them via streaming Claude API, orchestrate multi-agent projects, manage tasks with Kanban boards, and review agent deliverables through a structured approval workflow. Named "OneWave AI Digital Agency."

## Core Value

The ability to review, approve, and iterate on agent-produced deliverables — the review workflow is the centerpiece that makes AI agent output actionable rather than disposable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Browse, search, and filter 61 agents across 9 divisions
- [ ] View agent detail with full personality/process/metrics
- [ ] Create and edit custom agents
- [ ] Chat with agents via streaming Claude API responses
- [ ] Rich markdown/code rendering in chat with syntax highlighting
- [ ] Review panel for agent deliverables (approve, revise, edit inline, comment)
- [ ] Review queue on dashboard with pending items
- [ ] Multi-agent orchestration with parallel execution lanes
- [ ] Orchestration review board (Kanban: In Progress / Needs Review / Approved / Revision)
- [ ] Project management with agent assignment and task tracking
- [ ] Task Kanban board (To Do / In Progress / Review / Done)
- [ ] Deliverables tab on projects with review status
- [ ] Dashboard with stats, activity feed, and utilization charts
- [ ] Global search (Cmd+K) across agents, projects, sessions
- [ ] Dark/light mode with dark default
- [ ] Keyboard shortcuts for review workflow (j/k navigate, a approve, r revise)
- [ ] Settings page with API key management and model selection
- [ ] Production-grade polish: animations, loading states, empty states, glassmorphism

### Out of Scope

- Multi-user / authentication — single-user local app
- Mobile-responsive layout — desktop-first, tablet minimum
- Deployment to cloud — runs locally via `npm run dev`
- Real-time collaboration — single user
- Agent-to-agent communication — agents work independently on shared brief

## Context

- Source agents come from github.com/msitarzewski/agency-agents (61 agents, 9 divisions)
- Each agent is a markdown file with YAML frontmatter (name, description, color, tools) and a full system prompt
- Divisions: Engineering, Design, Marketing, Product, Project Management, Testing, Support, Spatial Computing, Specialized, Strategy
- Agent files are parsed at seed time, stored in SQLite, and served via API
- User has Anthropic API key for Claude access

## Constraints

- **Runtime**: Local only — single `npm run dev` command, no Docker, no external services
- **Database**: SQLite via Prisma — zero setup, file-based
- **AI Provider**: Anthropic Claude API only (Sonnet 4, Opus 4, Haiku 4.5)
- **Stack**: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14 monolithic app | Single process, App Router, API routes built in — simplest local setup | — Pending |
| SQLite via Prisma | Zero-config database, no Docker needed, sufficient for single-user | — Pending |
| shadcn/ui + Tailwind | Production-grade components, consistent design system, dark mode built in | — Pending |
| SSE for streaming | Simpler than WebSocket for unidirectional streaming from Claude API | — Pending |
| Review-centric architecture | User's primary need is reviewing agent work, not just chatting | — Pending |

---
*Last updated: 2026-03-09 after initialization*
