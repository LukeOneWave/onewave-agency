# Requirements: OneWave AI Digital Agency

**Defined:** 2026-03-09
**Core Value:** The ability to review, approve, and iterate on agent-produced deliverables

## v1 Requirements

### Agent Management

- [x] **AGNT-01**: User can browse all 61 agents in a grid view
- [x] **AGNT-02**: User can filter agents by division using tabs
- [x] **AGNT-03**: User can search agents by name or description
- [x] **AGNT-04**: User can view agent detail page with full personality, process, and metrics

### Chat

- [x] **CHAT-01**: User can start a chat session with any agent
- [x] **CHAT-02**: Agent responses stream in real-time via Claude API
- [x] **CHAT-03**: Chat renders markdown and syntax-highlighted code blocks
- [x] **CHAT-04**: User can select which Claude model to use (Sonnet/Opus/Haiku)

### Review

- [ ] **REVW-01**: Review panel appears in chat when agent produces a deliverable
- [ ] **REVW-02**: User can approve a deliverable
- [ ] **REVW-03**: User can request revision with feedback notes
- [ ] **REVW-04**: Revision feedback is sent back to the agent as the next prompt

### Orchestration

- [ ] **ORCH-01**: User can select multiple agents for a mission
- [ ] **ORCH-02**: User can write a project brief/objective
- [ ] **ORCH-03**: Selected agents execute in parallel on the shared brief
- [ ] **ORCH-04**: User can see each agent's streaming output in separate lanes

### Dashboard

- [ ] **DASH-01**: Dashboard shows stats (active sessions, agents used, tokens consumed)
- [ ] **DASH-02**: Dashboard shows recent activity feed
- [ ] **DASH-03**: Dashboard shows agent utilization chart

### Foundation

- [x] **FNDN-01**: User can configure Anthropic API key in settings
- [x] **FNDN-02**: App persists data in local SQLite database
- [x] **FNDN-03**: All 61 agents are seeded from agency-agents repo on first run

## v2 Requirements

### Agent Management

- **AGNT-05**: User can create custom agents with name, division, personality, and system prompt
- **AGNT-06**: User can edit existing agent configurations

### Chat

- **CHAT-05**: User can view and resume past conversation sessions
- **CHAT-06**: User can switch or add agents mid-conversation

### Review

- **REVW-05**: Review queue widget on dashboard showing pending items
- **REVW-06**: User can edit agent output inline before approving
- **REVW-07**: User can add inline comments on specific lines of deliverables
- **REVW-08**: Diff view showing changes between revision versions

### Projects

- **PROJ-01**: User can create projects and assign agents
- **PROJ-02**: User can create tasks within projects
- **PROJ-03**: Task Kanban board (To Do / In Progress / Review / Done)
- **PROJ-04**: Deliverables tab aggregating all agent outputs per project
- **PROJ-05**: Orchestration review board (Kanban for orchestration deliverables)

### UI/UX

- **UIUX-01**: Dark/light mode toggle with dark default
- **UIUX-02**: Global search via Cmd+K command palette
- **UIUX-03**: Keyboard shortcuts (j/k navigate, a approve, r revise)
- **UIUX-04**: Loading skeletons and empty states
- **UIUX-05**: Page transition animations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user authentication | Single-user local app, auth adds zero value |
| Agent-to-agent communication | Agents work independently on shared briefs, inter-agent messaging adds massive complexity |
| Cloud deployment / SaaS hosting | Runs locally, no hosting infrastructure needed |
| Mobile-responsive layout | Desktop-first power tool, mobile review workflows are impractical |
| AI model marketplace / multi-provider | Anthropic Claude only, supporting multiple providers fragments the experience |
| Automated approval rules | Defeats the purpose — the review workflow IS the product |
| Voice input | Novelty feature, not aligned with review-centric workflow |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDN-01 | Phase 1 | Complete |
| FNDN-02 | Phase 1 | Complete |
| FNDN-03 | Phase 1 | Complete |
| AGNT-01 | Phase 1 | Complete |
| AGNT-02 | Phase 1 | Complete |
| AGNT-03 | Phase 1 | Complete |
| AGNT-04 | Phase 1 | Complete |
| CHAT-01 | Phase 2 | Complete |
| CHAT-02 | Phase 2 | Complete |
| CHAT-03 | Phase 2 | Complete |
| CHAT-04 | Phase 2 | Complete |
| REVW-01 | Phase 3 | Pending |
| REVW-02 | Phase 3 | Pending |
| REVW-03 | Phase 3 | Pending |
| REVW-04 | Phase 3 | Pending |
| ORCH-01 | Phase 4 | Pending |
| ORCH-02 | Phase 4 | Pending |
| ORCH-03 | Phase 4 | Pending |
| ORCH-04 | Phase 4 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap creation*
