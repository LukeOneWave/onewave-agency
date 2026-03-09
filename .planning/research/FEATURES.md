# Feature Landscape

**Domain:** AI agent management platform (local, single-user, 61 specialized agents)
**Researched:** 2026-03-09
**Overall confidence:** MEDIUM-HIGH

## Table Stakes

Features users expect from any AI agent management interface. Missing any of these and the product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Agent browsing/catalog with filtering | Every agent platform (CrewAI, AI Agent Store, GitLab AI Catalog) provides categorized browsing. Users need to find the right agent fast. | Low | Filter by division, search by name/description, card grid layout |
| Agent detail view | Users need to understand what an agent does before using it. Standard in every directory/catalog. | Low | Show personality, process, tools, metrics from YAML frontmatter |
| Chat with streaming responses | Core interaction pattern. Every AI platform (ChatGPT, Claude, CrewAI) streams responses. Non-streaming feels broken in 2026. | Medium | SSE from Claude API, markdown rendering, code syntax highlighting |
| Conversation history/persistence | Users expect to return to previous conversations. Standard since ChatGPT. | Low | SQLite storage, session list, resume conversations |
| Dark mode (default) with light toggle | Industry standard for developer/power-user tools. shadcn/ui provides this nearly free. | Low | Already in shadcn/ui theme system |
| Settings/API key management | Users must configure their Claude API key. Every API-based tool has this. | Low | Secure local storage, model selection dropdown |
| Dashboard with activity overview | Central landing page showing recent activity. Standard in project management and agent platforms alike. | Medium | Stats, recent sessions, pending reviews, agent utilization |
| Loading states, empty states, error handling | Production-grade UX. Missing these makes the app feel like a prototype. | Low | Skeleton loaders, helpful empty states, error boundaries |
| Global search (Cmd+K) | Power users expect command palette search. Standard in modern developer tools (VS Code, Linear, Notion). | Medium | Search across agents, projects, sessions, conversations |
| Keyboard shortcuts | Expected in productivity tools. Vibe Kanban, Linear, and similar tools all have them. | Low | Navigation (j/k), actions (a/approve, r/revise), modal dismiss (Esc) |

## Differentiators

Features that set OneWave apart. Not expected in a generic agent platform, but provide significant value for this specific use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Review workflow for agent deliverables | **The centerpiece.** Most agent platforms treat output as disposable chat. OneWave treats it as reviewable work product. This is the core differentiator per PROJECT.md. | High | Approve, revise, edit inline, comment. Status tracking per deliverable. |
| Review queue on dashboard | Surfaces pending work that needs human attention. Borrowed from code review (GitHub PRs) and document approval patterns. No agent chat tool does this. | Medium | Pending count badge, filterable by agent/project, priority sorting |
| Inline editing of agent output | Goes beyond approve/reject. Users can refine agent work directly, like editing a Google Doc. Most HITL patterns only offer boolean approve/deny. | Medium | Rich text/code editor inline, diff view showing changes from original |
| Review comments with threading | Structured feedback on specific parts of deliverables. Borrowed from code review (GitHub, GitLab). Enables iterative refinement. | Medium | Comment on specific sections, revision history, feedback threads |
| Orchestration review board (Kanban) | Visual Kanban for multi-agent project output: In Progress / Needs Review / Approved / Revision. Vibe Kanban does this for code tasks; OneWave does it for any agent deliverable. | High | Drag-and-drop status changes, parallel execution visibility, per-lane agent assignment |
| Multi-agent orchestration with parallel lanes | Run multiple agents simultaneously on different parts of a project brief. CrewAI and Vibe Kanban validate this pattern. | High | Parallel execution, shared project context, independent agent lanes |
| Project management with agent assignment | Organize work into projects, assign agents to tasks, track progress. Bridges the gap between "chat tool" and "work management tool." | Medium | Project CRUD, task assignment to specific agents, progress tracking |
| Task Kanban board | Visual task tracking (To Do / In Progress / Review / Done). Standard in project management but novel in agent management context. | Medium | Drag-and-drop, task cards with agent avatars, status filters |
| Deliverables tab on projects | Aggregated view of all agent outputs for a project with review status. Treats agent work as artifacts, not ephemeral chat. | Medium | Grouped by task, filterable by review status, bulk actions |
| Custom agent creation/editing | Let users create their own specialized agents beyond the 61 defaults. Extends the platform from a fixed catalog to a customizable workforce. | Medium | YAML/markdown editor, personality prompts, tool selection, division assignment |
| Agent utilization charts | Show which agents are being used most, performance metrics, response quality trends. Borrowed from workforce analytics. | Medium | Usage frequency, average session length, approval rates per agent |
| Rich markdown/code rendering | High-quality output formatting with syntax highlighting, tables, LaTeX. Differentiates from basic chat interfaces. | Medium | react-markdown + rehype plugins, copy-to-clipboard on code blocks |

## Anti-Features

Features to explicitly NOT build. These would add complexity without value, violate the single-user local constraint, or distract from the review-centric core.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-user authentication | Single-user local app. Auth adds complexity with zero value. No collaboration needed. | Store preferences locally, no login screen |
| Agent-to-agent communication | Agents work independently on shared briefs. Inter-agent messaging adds massive complexity and unpredictable behavior. | Orchestrate via shared project context; human reviews bridge agent outputs |
| Cloud deployment / SaaS hosting | Runs locally via `npm run dev`. Cloud adds hosting costs, security concerns, and DevOps overhead. | SQLite + local filesystem, zero external dependencies |
| Real-time collaboration | Single user. No need for presence indicators, cursors, or conflict resolution. | Simple state management, optimistic updates |
| No-code visual agent builder (drag-and-drop) | Adds enormous UI complexity. Users define agents via markdown/YAML which is more expressive and version-controllable. | Structured form editor for agent creation with markdown preview |
| Mobile-responsive layout | Desktop-first power tool. Mobile agent management is impractical for review workflows. | Minimum tablet support, optimize for 1280px+ screens |
| AI model marketplace / multi-provider | Anthropic Claude only. Supporting OpenAI, Gemini, etc. fragments the experience and multiplies edge cases. | Model selection within Claude family (Haiku, Sonnet, Opus) |
| Agent marketplace / sharing | Single user, no community. Building sharing infrastructure is massive scope creep. | Import/export agent definitions as markdown files |
| Automated approval / auto-approve rules | Defeats the purpose. The review workflow IS the product. Automating it away removes the core value proposition. | Surface smart defaults and suggestions, but always require human decision |
| Usage billing / cost tracking | Nice-to-have but not core. Adds complexity tracking API token usage. | Show token count per response, but defer cost dashboards to later |
| Voice input for agents | Novelty feature, adds speech-to-text dependency, not aligned with review-centric workflow. | Text input with rich formatting support |

## Feature Dependencies

```
Agent Catalog (browse/filter) --> Agent Detail View --> Chat with Agent
                                                    --> Custom Agent Creation

Chat with Agent --> Conversation History
               --> Rich Markdown Rendering
               --> Review Workflow (deliverables extracted from chat)

Review Workflow --> Review Queue (dashboard widget)
               --> Inline Editing
               --> Review Comments
               --> Deliverables Tab (project-level aggregation)

Project Management --> Task Kanban Board
                  --> Agent Assignment to Tasks
                  --> Multi-Agent Orchestration
                  --> Orchestration Review Board (Kanban)
                  --> Deliverables Tab

Dashboard --> Review Queue (depends on Review Workflow)
          --> Agent Utilization (depends on Chat history data)
          --> Activity Feed (depends on all activity-generating features)

Settings (API key) --> Chat with Agent (hard dependency: no key = no chat)

Global Search --> Requires: Agents, Projects, Sessions all in DB
```

## MVP Recommendation

Prioritize building in this order:

1. **Settings + API key management** -- gate for all AI functionality
2. **Agent catalog with filtering** -- entry point, low complexity, immediate value
3. **Agent detail view** -- completes the browsing experience
4. **Chat with streaming + conversation history** -- core interaction, validates API integration
5. **Rich markdown/code rendering** -- makes chat output usable
6. **Review workflow (approve/revise/comment)** -- the differentiator, ship early to validate
7. **Dashboard with review queue** -- surfaces pending work, ties it together
8. **Project management + task Kanban** -- organizes multi-agent work
9. **Multi-agent orchestration** -- most complex, requires solid foundation

**Defer:**
- Custom agent creation: The 61 built-in agents provide ample starting content. Custom agents can come after core workflows are validated.
- Agent utilization charts: Requires accumulated usage data. Ship after users have history to visualize.
- Orchestration review board: Depends on both orchestration AND review workflow being solid. Build last.

## Competitive Landscape Notes

| Platform | Overlap with OneWave | Key Difference |
|----------|---------------------|----------------|
| CrewAI Studio | Multi-agent orchestration, visual UI | Enterprise SaaS, no-code focus, no review workflow |
| Vibe Kanban | Kanban task tracking, parallel agent execution, code review | Coding agents only, git worktree-based, no general agent catalog |
| OpenAI Codex App | Multi-agent command center, parallel workflows | OpenAI-only, coding focus, cloud-hosted |
| Dify | Agent management, visual workflows | Open-source but cloud-oriented, no review workflow |
| ChatGPT/Claude UI | Chat with AI, conversation history | No agent specialization, no review workflow, no project management |

**OneWave's unique position:** The only platform combining a specialized agent catalog with a review-centric workflow for treating AI output as reviewable work product rather than disposable chat. This is the gap in the market.

## Sources

- [CrewAI - Multi-Agent Platform](https://crewai.com/) -- MEDIUM confidence
- [Voiceflow - Best Agent Management Platforms 2026](https://www.voiceflow.com/blog/best-agent-management-platforms) -- MEDIUM confidence
- [Vibe Kanban - AI Agent Orchestration](https://vibekanban.com/) -- HIGH confidence (open source, verifiable)
- [BloopAI/vibe-kanban GitHub](https://github.com/BloopAI/vibe-kanban) -- HIGH confidence
- [Permit.io - Human-in-the-Loop Best Practices](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo) -- MEDIUM confidence
- [Cloudflare - Human in the Loop Patterns](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/) -- HIGH confidence
- [LangChain - Human-in-the-Loop](https://docs.langchain.com/oss/python/langchain/human-in-the-loop) -- HIGH confidence
- [AI Agents Directory](https://aiagentsdirectory.com/) -- MEDIUM confidence
- [GitLab AI Catalog](https://about.gitlab.com/blog/ai-catalog-discover-and-share-agents/) -- MEDIUM confidence
- [Kore.ai - Best Agentic AI Platforms 2026](https://www.kore.ai/blog/7-best-agentic-ai-platforms) -- MEDIUM confidence
