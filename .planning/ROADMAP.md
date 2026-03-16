# Roadmap: OneWave AI Digital Agency

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-10)
- ✅ **v2.0 Power User Platform** — Phases 6-11 (shipped 2026-03-12)
- 🚧 **v3.0 Document Workspace** — Phases 12-16 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-10</summary>

- [x] Phase 1: Foundation and Agent Catalog (3/3 plans) — completed 2026-03-09
- [x] Phase 2: Chat and Streaming (3/3 plans) — completed 2026-03-09
- [x] Phase 3: Review System (3/3 plans) — completed 2026-03-10
- [x] Phase 4: Multi-Agent Orchestration (3/3 plans) — completed 2026-03-10
- [x] Phase 5: Dashboard and Polish (2/2 plans) — completed 2026-03-10

</details>

<details>
<summary>✅ v2.0 Power User Platform (Phases 6-11) — SHIPPED 2026-03-12</summary>

- [x] Phase 6: Infrastructure + Quick Wins (2/2 plans) — completed 2026-03-10
- [x] Phase 7: Custom Agents + Session History (3/3 plans) — completed 2026-03-11
- [x] Phase 8: Project Management + Task Kanban (3/3 plans) — completed 2026-03-11
- [x] Phase 9: Advanced Review (3/3 plans) — completed 2026-03-11
- [x] Phase 10: Power User UX (2/2 plans) — completed 2026-03-12
- [x] Phase 11: Production Polish (2/2 plans) — completed 2026-03-12

</details>

### v3.0 Document Workspace (In Progress)

**Milestone Goal:** Transform agent deliverables from plain markdown text into rich, exportable documents with a live-preview artifacts panel — making agent output directly usable as professional files.

- [ ] **Phase 12: Layout, Shell, and Unified State** — Route segment layout bypassing AppShell, resizable split panel, artifacts Zustand store
- [ ] **Phase 13: Live Preview and Type Detection** — Artifact card in chat stream, streaming document preview, heuristic doc-type classification
- [ ] **Phase 14: Type-Aware Renderers and Version Navigation** — Markdown, spreadsheet, and technical spec viewers; version selector; diff toggle in panel
- [ ] **Phase 15: Multi-Format Export** — Server-side Word, PDF, Excel; client-side CSV, Markdown, HTML; ExportBar component
- [ ] **Phase 16: In-Place Revision and Commenting** — Text-selection revision prompt, deliverable-level comment thread with CRUD API

## Phase Details

### Phase 12: Layout, Shell, and Unified State
**Goal**: The chat page renders as a full-viewport split layout with a togglable artifacts panel that never disrupts in-flight SSE streams
**Depends on**: Phase 11 (v2.0 complete)
**Requirements**: ARTF-01, ARTF-10, REVW-05
**Success Criteria** (what must be TRUE):
  1. User sees chat on the left and a collapsible artifacts panel on the right when visiting any chat session
  2. User can drag the panel divider to resize both panes and the preference persists on reload
  3. User can dismiss the artifacts panel and return to full-width chat using a close button or the `]` keyboard shortcut
  4. Toggling the panel 5 times while a stream is in-flight does not reset the stream or lose streamed content
  5. Review workflow keyboard shortcuts (j/k/a/r) work inside the chat view without conflicting with browser or Cmd+K shortcuts
**Plans**: 2 plans
Plans:
- [ ] 12-01-PLAN.md — Install shadcn resizable, extend store with panel state, segment layout bypass, ArtifactsPanel shell
- [ ] 12-02-PLAN.md — Restructure ChatPage with ResizablePanelGroup, keyboard shortcuts, localStorage persistence

### Phase 13: Live Preview and Type Detection
**Goal**: When an agent streams a deliverable, an artifact card appears in the chat and the panel shows a live updating document preview with the correct type label
**Depends on**: Phase 12
**Requirements**: ARTF-02, ARTF-03, ARTF-04, ARTF-05, ARTF-06, DOCR-04
**Success Criteria** (what must be TRUE):
  1. User sees a clickable artifact card appear in the chat message when the agent produces a deliverable
  2. User sees the document preview update in the right panel as the agent is still streaming (live, throttled to ~4fps)
  3. User sees formatted output in the preview — headings, lists, tables — not raw markdown characters
  4. User sees the correct document type label (Business Doc, Technical Spec, Spreadsheet, Creative) in the panel header
  5. After follow-up messages, the artifact panel continues to show the last deliverable until the user explicitly dismisses it
**Plans**: TBD

### Phase 14: Type-Aware Renderers and Version Navigation
**Goal**: The artifacts panel renders each document type as its optimal visual format, and users can navigate between artifact versions and compare diffs within the panel
**Depends on**: Phase 13
**Requirements**: DOCR-01, DOCR-02, DOCR-03, ARTF-07, ARTF-08, ARTF-09
**Success Criteria** (what must be TRUE):
  1. Business and markdown documents render with styled headings, bullet lists, and section hierarchy (not a wall of unstyled text)
  2. Spreadsheet and tabular data renders as a formatted grid with fixed column widths (not a markdown pipe table)
  3. Technical documents render with syntax-highlighted code blocks that match the existing chat code block style
  4. User can click version chips (v1, v2, v3) in the panel header to switch between artifact versions of the same deliverable
  5. User can toggle a diff view that highlights line-level changes between the selected version and its predecessor
  6. User can copy the full artifact content to clipboard with a single click and sees a confirmation toast
**Plans**: TBD

### Phase 15: Multi-Format Export
**Goal**: Users can download any artifact as a properly formatted professional file in six formats directly from the panel
**Depends on**: Phase 14
**Requirements**: EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05, EXPT-06
**Success Criteria** (what must be TRUE):
  1. User can export a business document as a Word (.docx) file with preserved heading hierarchy and paragraph formatting
  2. User can export any artifact as a PDF where text is selectable and code blocks and tables are legible
  3. User can export spreadsheet data as an Excel (.xlsx) file that opens correctly in Excel/Numbers with one sheet per table
  4. User can export spreadsheet data as a CSV file with correct column delimiters and quoting
  5. User can export any artifact as a Markdown (.md) file that is identical to the raw source content
  6. User can export any artifact as an HTML file that renders correctly in a browser with inline styles
**Plans**: TBD

### Phase 16: In-Place Revision and Commenting
**Goal**: Users can select text in the preview to request targeted agent revisions, and can annotate deliverables with general comments that persist across sessions
**Depends on**: Phase 14
**Requirements**: REVS-01, REVW-04
**Success Criteria** (what must be TRUE):
  1. User can select a passage in the document preview, see a contextual "Revise this" prompt, type revision instructions, and the agent streams an updated version of only that section
  2. User can add a general comment on a deliverable that persists after page reload and is visible in the panel's Comments tab
  3. User can edit or delete their own comments inline within the Comments tab
  4. Comment count is shown on the panel Comments tab badge so users can see at a glance that annotations exist
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Agent Catalog | v1.0 | 3/3 | Complete | 2026-03-09 |
| 2. Chat and Streaming | v1.0 | 3/3 | Complete | 2026-03-09 |
| 3. Review System | v1.0 | 3/3 | Complete | 2026-03-10 |
| 4. Multi-Agent Orchestration | v1.0 | 3/3 | Complete | 2026-03-10 |
| 5. Dashboard and Polish | v1.0 | 2/2 | Complete | 2026-03-10 |
| 6. Infrastructure + Quick Wins | v2.0 | 2/2 | Complete | 2026-03-10 |
| 7. Custom Agents + Session History | v2.0 | 3/3 | Complete | 2026-03-11 |
| 8. Project Management + Task Kanban | v2.0 | 3/3 | Complete | 2026-03-11 |
| 9. Advanced Review | v2.0 | 3/3 | Complete | 2026-03-11 |
| 10. Power User UX | v2.0 | 2/2 | Complete | 2026-03-12 |
| 11. Production Polish | v2.0 | 2/2 | Complete | 2026-03-12 |
| 12. Layout, Shell, and Unified State | v3.0 | 0/2 | Planned | - |
| 13. Live Preview and Type Detection | v3.0 | 0/TBD | Not started | - |
| 14. Type-Aware Renderers and Version Navigation | v3.0 | 0/TBD | Not started | - |
| 15. Multi-Format Export | v3.0 | 0/TBD | Not started | - |
| 16. In-Place Revision and Commenting | v3.0 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-09 (v1.0), extended 2026-03-10 (v2.0), extended 2026-03-16 (v3.0)*
*Last updated: 2026-03-16*
