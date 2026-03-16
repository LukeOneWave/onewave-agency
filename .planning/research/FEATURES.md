# Feature Research

**Domain:** AI chat document workspace / artifacts panel
**Researched:** 2026-03-16
**Milestone:** v3.0 — Document Workspace
**Confidence:** HIGH (primary patterns verified against Claude, ChatGPT Canvas, Cloudscape Design System)

## Context: What Is Already Built (v1.0 + v2.0)

These features are SHIPPED and must not be rebuilt — only extended:

- XML `<deliverable>` tag extraction from chat messages
- Review panel: approve / revise with feedback, inline textarea editing, diff viewer
- `DeliverableVersion` model for content snapshots (exists from v2.0)
- `Comment` model for inline commenting (exists from v2.0)
- Keyboard shortcuts via `react-hotkeys-hook` (j/k/a/r/? pattern exists)
- Project management, Kanban boards, Orchestration review
- Global search (Cmd+K), session history, custom agent builder

The v3.0 milestone transforms the existing deliverable system from a plain-text review flow into a rich document workspace.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist once you describe "an artifacts panel." Missing any of these and the feature feels like a stub.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Side-panel layout: chat left, artifact right | Established pattern set by Claude.ai and ChatGPT Canvas. Users will be confused if artifact appears elsewhere. | MEDIUM | Resizable split with collapsible panel. Claude uses right-side panel; Canvas uses full-width right pane. |
| Artifact card in chat stream | Generated artifact needs a clickable card in the chat (not nested in a chat bubble) that opens the side panel. | LOW | Cloudscape: "artifacts should not be nested into chat bubbles." Card shows doc type icon, title, byte count. |
| Live preview while agent streams | Document appears and updates in the preview panel AS the agent generates it, not only after completion. | MEDIUM | SSE stream already exists. Preview re-renders on each chunk. Streaming markdown renderer needed. |
| Rendered document preview (not raw text) | Users expect to see styled output — formatted headings, bold, tables — not raw markdown. | LOW | `react-markdown` + `remark-gfm` already present in the codebase for chat rendering. Reuse. |
| Document type detection and labeling | User needs to know what kind of artifact they're viewing: "Business Doc," "Technical Spec," "Table/Spreadsheet." | LOW | Heuristic from content structure (presence of table rows, code blocks, front-matter). No ML needed. |
| Artifact persistence across session | Artifact stays in the panel when user sends follow-up messages. Does not collapse on new chat turn. | LOW | Store active artifact ID in Zustand chat store. Panel only closes on explicit dismiss. |
| Version navigation within artifact panel | When agent revises, user can navigate artifact versions (v1 / v2 / v3) from inside the panel. | MEDIUM | `DeliverableVersion` model already exists. Add version selector to panel header. |
| Export to Markdown | Minimum viable export — download raw `.md` file. Every comparable tool offers this. | LOW | `Blob` + `URL.createObjectURL` in browser. No library needed. |
| Export to PDF | Standard output format for business deliverables. Users will ask for this before any other export. | MEDIUM | `@react-pdf/renderer` (server-side via API route) or `html2canvas` + `jsPDF` (client-side). Server-side preferred — cleaner output, no layout hacks. |
| Copy to clipboard | One-click copy of full document content. Present alongside export options. | LOW | `navigator.clipboard.writeText`. Already used elsewhere in app. |
| Dismiss / minimize artifact panel | User wants to return to full-width chat. Clear close button. Panel state remembered per session. | LOW | Zustand boolean; CSS transition. |

### Differentiators (Competitive Advantage)

Features that transform OneWave's artifact experience from "also has preview" to genuinely better than generic AI chat tools. Align with core value: making agent output actionable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| In-place agent revision from panel | Highlight text in preview, click "Ask agent to revise this section" — sends targeted prompt with context. The agent updates ONLY the selected section inline (3-4x faster than full regeneration, per Claude's Oct 2025 inline edit approach). | HIGH | Requires selection API + targeted revision prompt format. Most valuable differentiator. |
| Document type-aware rendering | Tabular/spreadsheet data renders as an interactive grid, not a markdown table. Business doc renders with section hierarchy. Code doc renders with syntax highlighting. Each type has its own viewer component. | HIGH | Separate renderer per type: `MarkdownDocument`, `SpreadsheetDocument`, `TechnicalSpec`. Type detected at extraction time. |
| Export to Word (.docx) | Professional deliverables can be dropped directly into client documents. One-click. | MEDIUM | `docx` npm library (pure JS, no native deps). Server-side API route. Heading styles, paragraphs, tables mapped from parsed AST. |
| Export to Excel (.xlsx) / CSV | Tabular agent output (reports, trackers, research data) goes straight to spreadsheet tools. | MEDIUM | `xlsx` (SheetJS) library. Only available when artifact type is "spreadsheet." |
| Export to HTML | Self-contained HTML file with embedded CSS. Shareable without importing into any app. | LOW | Template literal with inline Tailwind-equivalent CSS. Rendered client-side. |
| Inline commenting on deliverables | Select text, add anchored annotation. Deferred from v2.0 — now surfaces here in context of document workspace. | HIGH | `Comment` model already exists. Text-range anchor stored as snippet, not offset. Popover trigger on selection. |
| Keyboard shortcut: open/close panel | `]` to toggle artifact panel (Figma-style panel toggle). Fits existing j/k/a/r/? pattern. | LOW | One additional binding in existing `react-hotkeys-hook` setup. |
| Show diff in artifact panel | When agent revises, panel can toggle "show changes" mode — red/green highlighting of what changed between artifact versions. | MEDIUM | `react-diff-viewer-continued` already installed. Toggle in panel header. |
| Document outline / table of contents | For long business docs, sidebar within the preview panel showing heading hierarchy for navigation. | MEDIUM | Parse heading AST from markdown. Scroll-spy to highlight active section. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full WYSIWYG editor (Tiptap, Slate, ProseMirror) | Users want "Word-like" editing in the panel | Adds 200KB+ dependency, fights the markdown-as-source-of-truth model, complex serialization back to markdown, version tracking becomes complicated | In-place editing stays as textarea (existing pattern from v2.0) + agent-assisted revision for targeted changes |
| Real-time collaboration / multi-cursor | Looks impressive in demos | Single-user local app — zero users benefit from this; Velt/Liveblocks add significant overhead | Inline commenting covers the annotation use case for single-user review |
| Embedded spreadsheet editor (Handsontable, SpreadJS) | "Edit the table live in the panel" | Heavy libraries (Handsontable licensing is per-developer, SpreadJS is paid). Editing AI-generated tables in a grid is rarely what users actually need. | Export to Excel for editing; CSV download for data manipulation. Read-only grid view is sufficient. |
| AI-powered doc type classification (LLM call) | Reliable detection | Adds latency and cost per deliverable. Accuracy is not meaningfully better than heuristics for structured agent output. | Simple heuristic: if >2 table rows → spreadsheet; if has H1/H2 + multiple sections → business doc; if has code blocks → technical spec |
| Export to PowerPoint (.pptx) | "I want to present this" | Slide layout generation from linear document structure is unsolved without significant prompt engineering. Output would be poor quality. | Export to HTML (presentable in browser fullscreen). Defer pptx if explicitly requested. |
| Artifact "publish" / share link | "Share this with a client" | Single-user local app with no server hosting. A "share" link would be localhost which is meaningless to anyone else. | Export to file formats achieves the same goal (share the file, not a link) |
| Auto-save every keystroke to DB | Feels modern | SQLite write on every keystroke = performance degradation in long documents. Diff overhead on each save. | Debounced save (500ms idle) + explicit Save button. |
| Streaming preview for ALL message types | "Show preview for every response" | Most chat responses are short prose — showing a panel for "Sure, I'll revise section 2" creates noise and confusion. | Only trigger artifact panel when XML `<deliverable>` tag is detected in stream. |

## Feature Dependencies

```
Artifact Panel Layout
    └──requires──> Side-panel split layout (CSS/Zustand)
    └──requires──> Artifact card component in chat stream
    └──requires──> Existing <deliverable> XML extraction (ALREADY BUILT)

Live Preview While Streaming
    └──requires──> Side-panel layout
    └──requires──> Streaming markdown renderer (partial content renders)
    └──requires──> SSE stream (ALREADY BUILT)

Document Type-Aware Rendering
    └──requires──> Live preview (must know type before rendering)
    └──requires──> Type detection heuristic (new logic)
    └──enhances──> In-place agent revision (contextual prompts per type)

Version Navigation in Panel
    └──requires──> Side-panel layout
    └──requires──> DeliverableVersion model (ALREADY BUILT in v2.0)

Show Diff in Panel
    └──requires──> Version navigation
    └──requires──> react-diff-viewer-continued (ALREADY INSTALLED)

In-Place Agent Revision (Highlight + Revise)
    └──requires──> Live preview
    └──requires──> Text selection API
    └──enhances──> Version navigation (each revision creates new version)

Export (all formats)
    └──requires──> Artifact content accessible (live preview working)
    └──Export .docx──> docx npm library (NEW dependency)
    └──Export .xlsx/.csv──> xlsx/SheetJS (NEW dependency)
    └──Export .pdf──> @react-pdf/renderer API route (NEW dependency)
    └──Export .md/.html──> No new dependency

Inline Commenting
    └──requires──> Live preview (need rendered content to select)
    └──requires──> Comment model (ALREADY BUILT in v2.0)
    └──conflicts──> In-place agent revision (both use text selection — need UX disambiguation)

Keyboard Shortcuts (panel toggle)
    └──requires──> react-hotkeys-hook (ALREADY INSTALLED)
    └──enhances──> Existing j/k/a/r/? shortcuts

Document Outline / TOC
    └──requires──> Live preview
    └──requires──> MarkdownDocument renderer (new)
    └──enhances──> Long document navigation only (conditional render)
```

### Dependency Notes

- **Live preview requires streaming partial render:** The existing SSE stream sends chunks. The preview panel needs to re-render on each `onChunk` event, not only `onComplete`. This is the primary new integration point.
- **In-place revision conflicts with inline commenting:** Both use text selection in the preview pane. Must be mode-based (default: revision mode; toggle to comment mode) or use different trigger gestures (right-click vs toolbar button).
- **Export formats are independent of each other:** Can ship Markdown and HTML first (zero new deps), then add docx/xlsx/PDF in later sub-phases.
- **Document type detection gates type-aware rendering:** Detection must happen at stream-completion time (not mid-stream), stored on the `Deliverable` record. All downstream type-specific rendering depends on this field.

## MVP Definition

This is a subsequent milestone on an existing shipped product — "MVP" here means the minimum needed for v3.0 to feel like a real document workspace, not a prototype.

### Launch With (v3.0 Core)

- [ ] Side-panel layout with resizable split (chat + artifact panel) — foundational to all other features
- [ ] Artifact card in chat stream (clickable, opens panel) — entry point for the feature
- [ ] Live streaming preview (markdown renderer updates during SSE) — the "live" in live preview
- [ ] Document type detection (heuristic, stored on Deliverable) — gates type-aware rendering
- [ ] Type-aware rendering: MarkdownDocument, SpreadsheetDocument, TechnicalSpec viewers — delivers the rich preview
- [ ] Version navigation within panel (v1/v2/v3 selector using DeliverableVersion) — leverages existing v2.0 investment
- [ ] Show diff in panel (react-diff-viewer-continued toggle) — leverages existing v2.0 investment
- [ ] Export: Markdown (.md), HTML, PDF — covers most common needs
- [ ] Export: Word (.docx) — professional deliverable use case
- [ ] Export: Excel (.xlsx) + CSV — tabular data use case
- [ ] Keyboard shortcut: `]` to toggle panel — low-effort, high power-user value
- [ ] Copy to clipboard — expected baseline

### Add After Core Is Working (v3.1)

- [ ] In-place agent revision (highlight + revise) — highest complexity, highest value; add once panel UX is stable
- [ ] Inline commenting in panel — Comment model exists; add UI once panel layout is proven
- [ ] Document outline / TOC — useful for long docs; defer until long docs are common in practice

### Future Consideration (v4+)

- [ ] Keyboard shortcut cheatsheet updated with new panel shortcuts — minor documentation task
- [ ] Agent-specific document templates (Business Plan format, Technical Spec format) — requires prompt engineering per agent type

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Side-panel layout | HIGH | MEDIUM | P1 |
| Artifact card in chat | HIGH | LOW | P1 |
| Live streaming preview | HIGH | MEDIUM | P1 |
| Document type detection | HIGH | LOW | P1 |
| Type-aware rendering (3 viewers) | HIGH | HIGH | P1 |
| Version navigation in panel | MEDIUM | LOW | P1 (model exists) |
| Show diff in panel | MEDIUM | LOW | P1 (library exists) |
| Export to Markdown / HTML | HIGH | LOW | P1 |
| Export to PDF | HIGH | MEDIUM | P1 |
| Export to Word (.docx) | HIGH | MEDIUM | P1 |
| Export to Excel / CSV | MEDIUM | LOW | P1 (conditional on type) |
| Copy to clipboard | HIGH | LOW | P1 |
| Panel collapse / dismiss | MEDIUM | LOW | P1 |
| In-place agent revision | HIGH | HIGH | P2 |
| Inline commenting | MEDIUM | HIGH | P2 (model exists) |
| Document outline / TOC | LOW | MEDIUM | P3 |
| Export to HTML | MEDIUM | LOW | P1 (simple) |

## Reference: Comparable Feature Sets

| Feature | Claude.ai Artifacts | ChatGPT Canvas | Our Approach |
|---------|---------------------|----------------|--------------|
| Panel location | Right sidebar | Full-width right pane | Right sidebar (resizable) |
| Trigger | Any substantial output | Writing/code prompts | XML `<deliverable>` tag |
| Live streaming | Yes | Yes | Yes (via existing SSE) |
| Inline editing | Yes (direct in panel) | Yes (direct in panel) | Textarea (existing pattern), agent-assisted revision |
| Version history | Yes (back button) | Yes (back button) | Version selector (DeliverableVersion model) |
| Show changes | No | Yes (highlight mode) | Yes (diff panel toggle) |
| Export | Download button | PDF, Markdown, Word, code files | All 6 formats |
| Inline commenting | No | No | Yes (differentiator) |
| Document types | Code, Markdown, React, SVG | Writing docs, code | Business doc, creative, tech spec, spreadsheet |
| Type-aware rendering | Basic | Basic | Dedicated viewers per type |

## Sources

- [Claude Artifacts Help Center](https://support.claude.ai/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them) — artifact panel UX (HIGH confidence)
- [Claude: Visualize with Artifacts](https://support.claude.ai/en/articles/11649427-use-artifacts-to-visualize-and-create-ai-apps-without-ever-writing-a-line-of-code) — artifact types and patterns (HIGH confidence)
- [ChatGPT Canvas OpenAI announcement](https://openai.com/index/introducing-canvas/) — Canvas UX patterns (HIGH confidence)
- [ChatGPT Canvas review 2025](https://skywork.ai/blog/chatgpt-canvas-review-2025-features-coding-pros-cons/) — inline editing and revision patterns (MEDIUM confidence)
- [Claude artifact inline edits (Oct 2025)](https://hyperdev.matsuoka.com/p/claudeais-quiet-revolution-in-artifact) — 3-4x faster inline replacement vs full regen (MEDIUM confidence)
- [Cloudscape artifact previews pattern](https://cloudscape.design/patterns/genai/artifact-previews/) — AWS design system guidance on artifact display (HIGH confidence)
- [LibreChat artifacts feature](https://www.librechat.ai/docs/features/artifacts) — open-source implementation reference (MEDIUM confidence)
- [AI chat layout patterns (Jan 2026)](https://medium.com/@anastasiawalia/ai-chat-layout-patterns-when-to-use-them-real-examples-d03f04a19194) — layout pattern survey (MEDIUM confidence)
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — v4.3.2, server-side PDF generation (HIGH confidence)
- [docx library for Word generation](https://dev.to/golam_mostafa/pdf-excel-docx-generate-on-react-and-node-js-2keh) — pure JS DOCX generation (MEDIUM confidence)
- [SheetJS/xlsx for Excel](https://dev.to/golam_mostafa/pdf-excel-docx-generate-on-react-and-node-js-2keh) — pure JS Excel generation (MEDIUM confidence)
- [Velt inline commenting patterns](https://velt.dev/blog/build-google-docs-comments-react) — text-range anchoring (MEDIUM confidence)

---
*Feature research for: OneWave AI Agency v3.0 Document Workspace*
*Researched: 2026-03-16*
