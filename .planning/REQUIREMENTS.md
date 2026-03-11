# Requirements: OneWave AI Digital Agency

**Defined:** 2026-03-10
**Core Value:** The ability to review, approve, and iterate on agent-produced deliverables

## v2.0 Requirements

Requirements for v2.0 Power User Platform. Each maps to roadmap phases.

### Agent Management

- [ ] **AGNT-01**: User can create a custom agent with name, division, role, personality, and process instructions
- [ ] **AGNT-02**: User can edit a custom agent's details after creation
- [ ] **AGNT-03**: User can clone a seeded or custom agent as a starting point
- [ ] **AGNT-04**: User can delete a custom agent

### Review & Deliverables

- [x] **REVW-01**: User can see a review queue widget on the dashboard showing pending deliverables
- [ ] **REVW-02**: User can view a side-by-side diff between deliverable revision versions
- [ ] **REVW-03**: User can click-to-edit deliverable content directly via textarea

### Project Management

- [ ] **PROJ-01**: User can create a project with name and description
- [ ] **PROJ-02**: User can assign agents to a project
- [ ] **PROJ-03**: User can view project progress and status
- [ ] **PROJ-04**: User can create tasks within a project
- [ ] **PROJ-05**: User can drag tasks between Kanban columns (To Do / In Progress / Review / Done)
- [ ] **PROJ-06**: User can view a deliverables tab on a project showing all deliverables with review status
- [ ] **PROJ-07**: User can view mission deliverables in a Kanban board (orchestration review board)

### Navigation & UX

- [ ] **UX-01**: User can search across agents, projects, and sessions via Cmd+K
- [x] **UX-02**: User can toggle between dark and light mode
- [ ] **UX-03**: User can browse past chat sessions and resume them
- [x] **UX-04**: App has loading skeletons on data-fetching pages
- [ ] **UX-05**: App has smooth page transitions and UI animations

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Review Enhancements

- **REVW-04**: User can add inline comments anchored to specific text in deliverables
- **REVW-05**: User can navigate and act on deliverables with keyboard shortcuts (j/k/a/r)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user / authentication | Single-user local app |
| Mobile-responsive layout | Desktop-first power tool |
| Cloud deployment | Runs locally via `npm run dev` |
| Real-time collaboration | Single user |
| Agent-to-agent communication | Agents work independently on shared briefs |
| Multi-provider AI | Anthropic Claude only |
| Rich text editor (Tiptap/Slate) | Deliverables are markdown -- textarea edit is sufficient |
| Full-text search engine | SQLite LIKE queries sufficient at single-user scale |
| Task dependencies/subtasks | Keep project management lightweight for v2.0 |
| Due dates on tasks | Keep project management lightweight for v2.0 |
| Custom Kanban columns | Fixed status categories (To Do / In Progress / Review / Done) for v2.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGNT-01 | Phase 7 | Pending |
| AGNT-02 | Phase 7 | Pending |
| AGNT-03 | Phase 7 | Pending |
| AGNT-04 | Phase 7 | Pending |
| REVW-01 | Phase 6 | Complete |
| REVW-02 | Phase 9 | Pending |
| REVW-03 | Phase 9 | Pending |
| PROJ-01 | Phase 8 | Pending |
| PROJ-02 | Phase 8 | Pending |
| PROJ-03 | Phase 8 | Pending |
| PROJ-04 | Phase 8 | Pending |
| PROJ-05 | Phase 8 | Pending |
| PROJ-06 | Phase 9 | Pending |
| PROJ-07 | Phase 9 | Pending |
| UX-01 | Phase 10 | Pending |
| UX-02 | Phase 6 | Complete |
| UX-03 | Phase 7 | Pending |
| UX-04 | Phase 6 | Complete |
| UX-05 | Phase 11 | Pending |

**Coverage:**
- v2.0 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after roadmap creation*
