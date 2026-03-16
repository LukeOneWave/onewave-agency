# Requirements: OneWave AI Digital Agency

**Defined:** 2026-03-16
**Core Value:** The ability to review, approve, and iterate on agent-produced deliverables

## v3.0 Requirements

Requirements for v3.0 Document Workspace. Each maps to roadmap phases.

### Artifacts Panel

- [x] **ARTF-01**: User sees a split-panel layout with chat on the left and artifacts panel on the right
- [ ] **ARTF-02**: User sees an artifact card in the chat stream when agent produces a deliverable
- [ ] **ARTF-03**: User sees the document preview update live as the agent streams its response
- [ ] **ARTF-04**: User sees rendered document (formatted headings, tables, code) not raw markdown
- [ ] **ARTF-05**: User sees the document type label (Business Doc, Technical Spec, Spreadsheet, etc.)
- [ ] **ARTF-06**: Artifact persists in the panel across follow-up messages until explicitly dismissed
- [ ] **ARTF-07**: User can navigate between artifact versions (v1, v2, v3) within the panel
- [ ] **ARTF-08**: User can toggle diff view to see changes between artifact versions
- [ ] **ARTF-09**: User can copy artifact content to clipboard with one click
- [x] **ARTF-10**: User can dismiss/minimize the artifacts panel to return to full-width chat

### Document Rendering

- [ ] **DOCR-01**: Markdown/business documents render with styled headings, lists, and section hierarchy
- [ ] **DOCR-02**: Spreadsheet/tabular data renders as a formatted grid, not a markdown table
- [ ] **DOCR-03**: Technical documents render with syntax-highlighted code blocks
- [ ] **DOCR-04**: Document type is auto-detected from content structure at extraction time

### Export

- [ ] **EXPT-01**: User can export artifact as Word (.docx)
- [ ] **EXPT-02**: User can export artifact as PDF
- [ ] **EXPT-03**: User can export artifact as Excel (.xlsx)
- [ ] **EXPT-04**: User can export artifact as CSV
- [ ] **EXPT-05**: User can export artifact as Markdown (.md)
- [ ] **EXPT-06**: User can export artifact as HTML

### In-Place Revision

- [ ] **REVS-01**: User can select text in the preview and ask the agent to revise that specific section

### Review Enhancement

- [ ] **REVW-04**: User can add comments on deliverables
- [x] **REVW-05**: User can navigate and act on deliverables with keyboard shortcuts (j/k/a/r)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Document Features

- **DOCR-05**: Document outline / table of contents for long documents with heading navigation
- **REVS-02**: Text-selection anchored inline comments (character-offset based)
- **EXPT-07**: Export to PowerPoint (.pptx)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full WYSIWYG editor (Tiptap/Slate) | Fights markdown-as-source-of-truth; textarea + agent revision sufficient |
| Embedded spreadsheet editor | Heavy licensing; read-only grid + Excel export sufficient |
| Real-time collaboration | Single-user local app |
| AI-powered doc type classification | Heuristic detection sufficient for structured agent output |
| Artifact publish/share links | Local app — export to files achieves same goal |
| Auto-save every keystroke | Debounced save + explicit Save button preferred for SQLite |
| Streaming preview for all messages | Only trigger panel on deliverable detection |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARTF-01 | Phase 12 | Complete |
| ARTF-02 | Phase 13 | Pending |
| ARTF-03 | Phase 13 | Pending |
| ARTF-04 | Phase 13 | Pending |
| ARTF-05 | Phase 13 | Pending |
| ARTF-06 | Phase 13 | Pending |
| ARTF-07 | Phase 14 | Pending |
| ARTF-08 | Phase 14 | Pending |
| ARTF-09 | Phase 14 | Pending |
| ARTF-10 | Phase 12 | Complete |
| DOCR-01 | Phase 14 | Pending |
| DOCR-02 | Phase 14 | Pending |
| DOCR-03 | Phase 14 | Pending |
| DOCR-04 | Phase 13 | Pending |
| EXPT-01 | Phase 15 | Pending |
| EXPT-02 | Phase 15 | Pending |
| EXPT-03 | Phase 15 | Pending |
| EXPT-04 | Phase 15 | Pending |
| EXPT-05 | Phase 15 | Pending |
| EXPT-06 | Phase 15 | Pending |
| REVS-01 | Phase 16 | Pending |
| REVW-04 | Phase 16 | Pending |
| REVW-05 | Phase 12 | Complete |

**Coverage:**
- v3.0 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation — all 23 requirements mapped*
