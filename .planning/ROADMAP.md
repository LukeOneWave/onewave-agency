# Roadmap: OneWave AI Digital Agency

## Milestones

- v1.0 MVP -- Phases 1-5 (shipped 2026-03-10)
- v2.0 Power User Platform -- Phases 6-11 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) -- SHIPPED 2026-03-10</summary>

- [x] Phase 1: Foundation and Agent Catalog (3/3 plans) -- completed 2026-03-09
- [x] Phase 2: Chat and Streaming (3/3 plans) -- completed 2026-03-09
- [x] Phase 3: Review System (3/3 plans) -- completed 2026-03-10
- [x] Phase 4: Multi-Agent Orchestration (3/3 plans) -- completed 2026-03-10
- [x] Phase 5: Dashboard and Polish (2/2 plans) -- completed 2026-03-10

</details>

### v2.0 Power User Platform

**Milestone Goal:** Transform OneWave from a chat-and-review tool into a full project management platform with custom agents, advanced review workflows, and production-grade UX.

- [ ] **Phase 6: Infrastructure + Quick Wins** - Schema migration, store conventions, theme toggle, review queue, loading skeletons
- [x] **Phase 7: Custom Agents + Session History** - Agent CRUD builder and past session browsing/resumption (completed 2026-03-11)
- [x] **Phase 8: Project Management + Task Kanban** - Project CRUD, agent assignment, drag-and-drop task board (completed 2026-03-11)
- [x] **Phase 9: Advanced Review** - Diff view, inline editing, project deliverables tab, orchestration review board (completed 2026-03-11)
- [x] **Phase 10: Power User UX** - Global Cmd+K search across all entities (completed 2026-03-12)
- [ ] **Phase 11: Production Polish** - Page transitions, entrance animations, micro-interactions

## Phase Details

### Phase 6: Infrastructure + Quick Wins
**Goal**: Users see immediate quality-of-life improvements while the foundation for all v2.0 features is laid
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: UX-02, REVW-01, UX-04
**Success Criteria** (what must be TRUE):
  1. User can toggle between dark and light mode via a visible UI control, and the preference persists across page reloads
  2. User sees a review queue widget on the dashboard listing all pending deliverables with agent name and session context
  3. Data-fetching pages display skeleton placeholders while loading instead of blank screens or spinners
  4. New Prisma models (Project, Task, DeliverableVersion) exist in the database and migrations run without data loss
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Schema migration (Project, Task, DeliverableVersion) + review queue dashboard widget
- [ ] 06-02-PLAN.md — Theme toggle verification + loading skeletons for all data-fetching pages

### Phase 7: Custom Agents + Session History
**Goal**: Users can extend the agent roster with their own agents and revisit past conversations
**Depends on**: Phase 6
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, UX-03
**Success Criteria** (what must be TRUE):
  1. User can create a new custom agent by filling out name, division, role, personality, and process fields
  2. User can edit any custom agent's details after creation and see changes reflected immediately
  3. User can clone any agent (seeded or custom) as a starting point for a new custom agent
  4. User can delete a custom agent (seeded agents cannot be deleted)
  5. User can browse a list of past chat sessions, see which agent was involved, and click to resume any session
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — Agent CRUD backend: Zod validation, service layer, API routes (POST/PATCH/DELETE)
- [ ] 07-02-PLAN.md — Agent builder UI: create/edit form, clone flow, detail page actions, catalog updates
- [ ] 07-03-PLAN.md — Enhanced session history page + full phase verification checkpoint

### Phase 8: Project Management + Task Kanban
**Goal**: Users can organize work into projects with visual task tracking via drag-and-drop Kanban board
**Depends on**: Phase 6
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05
**Success Criteria** (what must be TRUE):
  1. User can create a project with name and description, and see it listed on a projects page
  2. User can assign agents to a project and see which agents are working on it
  3. User can view project progress showing task counts by status
  4. User can create tasks within a project and see them appear on a Kanban board
  5. User can drag tasks between Kanban columns (To Do / In Progress / Review / Done) and the new position persists after page reload
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Backend: types, validations, services, API routes, unit tests for project and task CRUD
- [ ] 08-02-PLAN.md — Projects list page, create form, sidebar navigation, progress display
- [ ] 08-03-PLAN.md — Project detail with Kanban board, dnd-kit drag-and-drop, task form with agent assignment

### Phase 9: Advanced Review
**Goal**: Users can deeply review and iterate on deliverables with diff comparison, inline editing, and visual review boards
**Depends on**: Phase 6, Phase 8
**Requirements**: REVW-02, REVW-03, PROJ-06, PROJ-07
**Success Criteria** (what must be TRUE):
  1. User can view a side-by-side diff between any two versions of a deliverable, with additions and deletions highlighted
  2. User can click on deliverable content to enter edit mode, modify the text in a textarea, and save changes
  3. User can view a deliverables tab on any project showing all deliverables with their current review status
  4. User can view mission deliverables in a Kanban-style board organized by review status (orchestration review board)
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — Backend: schema migration, deliverable version service, API routes, orchestration query, unit tests
- [ ] 09-02-PLAN.md — Diff view + inline editing: DiffViewer component, InlineEditor component, MessageBubble integration
- [ ] 09-03-PLAN.md — Project deliverables tab + orchestration review board Kanban

### Phase 10: Power User UX
**Goal**: Users can instantly navigate anywhere in the app through a keyboard-driven command palette
**Depends on**: Phase 7, Phase 8, Phase 9
**Requirements**: UX-01
**Success Criteria** (what must be TRUE):
  1. User can press Cmd+K to open a search overlay from any page in the app
  2. Search results include agents, projects, and past sessions with type-ahead filtering
  3. Selecting a search result navigates directly to that entity's page
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — Search service + API route: parallel Prisma queries across agents/projects/sessions with unit tests
- [ ] 10-02-PLAN.md — CommandPalette UI (cmdk) + AppShell Cmd+K integration + human verification

### Phase 11: Production Polish
**Goal**: The app feels polished and production-grade with smooth visual transitions throughout
**Depends on**: Phase 10
**Requirements**: UX-05
**Success Criteria** (what must be TRUE):
  1. Page transitions animate smoothly when navigating between routes
  2. Interactive elements have visible hover/press feedback animations
  3. Lists and cards have entrance animations when they first appear on screen
**Plans**: TBD

Plans:
- [ ] 11-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 > 7 > 8 > 9 > 10 > 11
(Note: Phase 7 and Phase 8 both depend on Phase 6 but not each other -- could execute in either order)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Agent Catalog | v1.0 | 3/3 | Complete | 2026-03-09 |
| 2. Chat and Streaming | v1.0 | 3/3 | Complete | 2026-03-09 |
| 3. Review System | v1.0 | 3/3 | Complete | 2026-03-10 |
| 4. Multi-Agent Orchestration | v1.0 | 3/3 | Complete | 2026-03-10 |
| 5. Dashboard and Polish | v1.0 | 2/2 | Complete | 2026-03-10 |
| 6. Infrastructure + Quick Wins | 1/2 | In Progress|  | - |
| 7. Custom Agents + Session History | 3/3 | Complete   | 2026-03-11 | - |
| 8. Project Management + Task Kanban | 3/3 | Complete   | 2026-03-11 | - |
| 9. Advanced Review | 3/3 | Complete   | 2026-03-11 | - |
| 10. Power User UX | 2/2 | Complete   | 2026-03-12 | - |
| 11. Production Polish | v2.0 | 0/? | Not started | - |

---
*Roadmap created: 2026-03-10 (v1.0), extended 2026-03-10 (v2.0)*
*Last updated: 2026-03-11*
