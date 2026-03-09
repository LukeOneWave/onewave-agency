# Roadmap: OneWave AI Digital Agency

## Overview

OneWave delivers a local AI agent management platform where the review workflow is the centerpiece. The build follows a strict dependency chain: agents are the atomic unit everything references, chat produces the raw material, review makes that material actionable, orchestration scales it to multiple agents, and dashboard ties it all together with visibility. Each phase produces a working increment that builds on the last.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Agent Catalog** - App scaffolding, database, agent seeding, browsing/filtering UI, settings
- [ ] **Phase 2: Chat and Streaming** - Real-time chat with agents via Claude API, markdown rendering, model selection
- [ ] **Phase 3: Review System** - Deliverable extraction, approve/revise workflow, revision feedback loop
- [ ] **Phase 4: Multi-Agent Orchestration** - Parallel agent execution on shared briefs with independent streaming lanes
- [ ] **Phase 5: Dashboard and Polish** - Stats, activity feed, utilization charts, refined states

## Phase Details

### Phase 1: Foundation and Agent Catalog
**Goal**: Users can launch the app, configure their API key, and browse the full agent catalog with filtering and detail views
**Depends on**: Nothing (first phase)
**Requirements**: FNDN-01, FNDN-02, FNDN-03, AGNT-01, AGNT-02, AGNT-03, AGNT-04
**Success Criteria** (what must be TRUE):
  1. User can run `npm run dev` and see a working application with navigation shell and dark mode
  2. User can enter their Anthropic API key in settings and it persists across sessions
  3. User can browse all 61 agents in a grid view with name, description, and division color
  4. User can filter agents by division using tabs and search by name or description
  5. User can click an agent to view its full detail page showing personality, process, and metrics
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD
- [ ] 01-03: TBD

### Phase 2: Chat and Streaming
**Goal**: Users can have real-time conversations with any agent and see rich, well-formatted responses
**Depends on**: Phase 1
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. User can start a chat session with any agent from the agent catalog or detail page
  2. Agent responses stream in real-time with visible token-by-token rendering
  3. Chat messages render markdown formatting and syntax-highlighted code blocks correctly
  4. User can select which Claude model (Sonnet/Opus/Haiku) to use for a session
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Review System
**Goal**: Users can review agent deliverables with approve/revise actions and send revision feedback back to agents
**Depends on**: Phase 2
**Requirements**: REVW-01, REVW-02, REVW-03, REVW-04
**Success Criteria** (what must be TRUE):
  1. When an agent produces a deliverable in chat, a review panel appears inline with the output
  2. User can approve a deliverable with a single click and see its status change to approved
  3. User can request a revision with written feedback notes explaining what needs to change
  4. Revision feedback is automatically sent to the agent as the next message, continuing the conversation
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Multi-Agent Orchestration
**Goal**: Users can dispatch multiple agents on a shared mission and monitor their parallel progress
**Depends on**: Phase 2, Phase 3
**Requirements**: ORCH-01, ORCH-02, ORCH-03, ORCH-04
**Success Criteria** (what must be TRUE):
  1. User can select multiple agents and write a project brief/objective for them to work on
  2. Selected agents execute in parallel, each processing the shared brief independently
  3. User can see each agent's streaming output in separate, simultaneously updating lanes
  4. Orchestration deliverables flow into the review system for approve/revise actions
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Dashboard and Polish
**Goal**: Users have a dashboard providing visibility into their agency activity and overall app feels production-grade
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4
**Requirements**: DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. Dashboard displays stats including active sessions, agents used, and tokens consumed
  2. Dashboard shows a chronological activity feed of recent actions across the app
  3. Dashboard shows an agent utilization chart visualizing which agents are used most
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Agent Catalog | 0/3 | Not started | - |
| 2. Chat and Streaming | 0/2 | Not started | - |
| 3. Review System | 0/2 | Not started | - |
| 4. Multi-Agent Orchestration | 0/2 | Not started | - |
| 5. Dashboard and Polish | 0/1 | Not started | - |
