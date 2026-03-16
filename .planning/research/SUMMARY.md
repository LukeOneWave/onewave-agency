# Project Research Summary

**Project:** OneWave AI Digital Agency v3.0 — Document Workspace
**Domain:** AI chat document workspace / artifacts panel with live preview, type-aware rendering, and multi-format export
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

OneWave AI Agency v3.0 is an incremental feature expansion on a shipped product — not a greenfield build. The foundation is solid: SSE streaming, `<deliverable>` XML extraction, `DeliverableVersion` model, inline editing via textarea, `react-hotkeys-hook`, and a Zustand-managed chat store are all in place from v2.0. The v3.0 milestone transforms the existing deliverable review flow into a full document workspace by adding a side-by-side artifacts panel with live streaming preview, document-type-aware rendering, and multi-format export. The architecture pattern is well-established — Claude.ai Artifacts and ChatGPT Canvas have proven the resizable split-panel model — and the required libraries are all npm-verified and React 19 compatible.

The recommended approach is strict dependency-order execution: layout restructuring must come first (before any panel content is built), followed by the unified state model, then preview components, then exports, then commenting. The biggest implementation risk is not new technology — it is protecting the existing SSE streaming infrastructure from disruption during the layout refactor. The `ChatPage` component currently uses a fragile `initSession` guard tied to session ID; any layout re-mount caused by panel toggling will reset the streaming store and kill in-flight streams. This must be solved architecturally in Phase 1 before a single export button is built. The `AppShell max-w-7xl p-6` constraint also must be bypassed for the chat route before the split panel can use available horizontal space.

The export story is clearly scoped: Markdown and HTML need zero new dependencies; Word and Excel generation must run server-side only (never in client components due to Node.js built-in references); PDF has two viable paths — `@react-pdf/renderer` (lighter, requires custom layout components) vs Puppeteer (heavier, highest fidelity) — with a proof-of-concept recommended before committing. SheetJS via npm is explicitly off the table due to documented prototype-pollution and ReDoS CVEs. The `exceljs` maintenance concern is real but acceptable for a write-only local tool.

---

## Key Findings

### Recommended Stack

The v3.0 stack requires only 3 new required npm packages and 2 shadcn components. The existing stack already covers markdown rendering, diff viewing, chart rendering, and keyboard shortcut management. Export formats divide cleanly into client-safe (Markdown, HTML, CSV — native JS) and server-only (Word, Excel, PDF — must run in API routes). Dynamic imports are required for `docx` and `@react-pdf/renderer` to avoid adding 600KB+ to the initial bundle on page load.

**Core new technologies:**
- `docx` ^9.6.1: Word (.docx) generation — pure JS, works in API routes, declarative structural API (headings, tables, code blocks)
- `@react-pdf/renderer` ^4.3.2: PDF generation — React 19 compatible; requires `'use client'` + `ssr: false` or server-side `renderToBuffer()`; Puppeteer is the higher-fidelity alternative worth evaluating
- `exceljs` ^4.4.0: Excel (.xlsx) generation — server-side only (Node.js streams); maintenance stalled but stable and CVE-clean for write-only usage
- `react-hotkeys-hook` ^5.2.4 (conditional): add only if v2.0 custom hook proves insufficient for split-panel scope isolation
- `shadcn resizable` + `shadcn tooltip`: split-panel layout and shortcut tooltips; `resizable` installs `react-resizable-panels` as a dep with documented SSR hydration workarounds

**What NOT to add:** SheetJS `xlsx` from npm (CVE-ridden), Puppeteer unless react-pdf fidelity is unacceptable after testing, Tiptap/Slate/ProseMirror (WYSIWYG is an anti-feature — textarea-based editing is the correct model), papaparse (write-only CSV needs no library), marked (existing remark/rehype pipeline can output HTML strings).

### Expected Features

The v3.0 feature set is validated against Claude.ai Artifacts (official docs), ChatGPT Canvas (official announcement), and the AWS Cloudscape design system. Missing any table-stakes item makes the feature feel like a stub, not a workspace.

**Must have (table stakes — v3.0 Core):**
- Side-panel split layout (resizable, collapsible) — established pattern set by Claude.ai and ChatGPT Canvas; users will be confused if artifacts appear elsewhere
- Artifact card in chat stream (clickable, opens panel) — entry point for all artifact interaction
- Live streaming preview (markdown updates during SSE stream) — the defining characteristic of the feature
- Document type detection (heuristic on content, stored on `Deliverable.docType`) — gates type-aware rendering; add optional `type` XML attribute for agent-explicit classification
- Type-aware rendering: `MarkdownDocument`, `SpreadsheetDocument`, `TechnicalSpec` viewer components
- Version navigation within panel (leverages existing `DeliverableVersion` model — zero new schema)
- Show diff in panel (leverages existing `react-diff-viewer-continued` — zero new deps)
- Export: Markdown (.md), HTML, PDF, Word (.docx), Excel (.xlsx), CSV
- Copy to clipboard, panel collapse/dismiss, `]` keyboard shortcut toggle

**Should have (differentiators — v3.1):**
- In-place agent revision: highlight text in preview, send targeted revision prompt; 3-4x faster than full regeneration; defer until panel UX is proven
- Inline commenting with text-selection anchoring: `Comment` model already exists; defer until panel layout is stable and the UX conflict with in-place revision text selection is resolved

**Defer (v4+):**
- Document outline / table of contents (useful for long docs but not blocking launch)
- Agent-specific document templates (requires prompt engineering per agent type)
- Export to PowerPoint (slide layout from linear document structure is an unsolved quality problem)

**Anti-features to avoid:** Full WYSIWYG editor (200KB+ dep, fights markdown-as-source-of-truth), real-time collaboration (single-user app), embedded spreadsheet editor (Handsontable licensing), AI-powered doc type classification (latency + cost without meaningful accuracy gain over heuristics), streaming preview for all message types (only trigger on `<deliverable>` XML detection).

### Architecture Approach

The architecture is an evolution of the existing `ChatPage` single-column layout. The core change converts the flex column to a `ResizablePanelGroup` with a chat panel (55% default) and an artifacts panel (45%). A new route segment layout at `app/chat/[sessionId]/layout.tsx` bypasses the global `max-w-7xl p-6` AppShell constraint — this is the critical infrastructure unlock for full-viewport split layout. A dedicated `store/artifacts.ts` Zustand store owns panel state, active deliverable ID, content snapshot, and doc type. All export logic lives in `lib/export/` as pure functions (invoked via API routes for binary formats). Schema changes are minimal: `docType String?` column on `Deliverable` and a new `DeliverableComment` model.

**Major components:**
1. `app/chat/[sessionId]/layout.tsx` — segment layout bypassing global padding; full-viewport chat surface
2. `ArtifactsPanel` — right panel shell with tabs (Preview / Comments), deliverable selector, export bar
3. `DocumentPreview` — dispatches to type-specific viewer based on `docType`; throttled at 4fps during streaming
4. `store/artifacts.ts` — Zustand store for active deliverable ID, content snapshot, panel open state, comment visibility
5. `lib/document-type.ts` — heuristic classifier (table row density, heading count, code fence count); runs at `upsertStatus()` time on deliverable creation
6. `lib/export/` — `exportDocx.ts`, `exportXlsx.ts`, `exportMarkdown.ts`, `exportPdf.ts` (client wrapper calling server API)
7. `app/api/export/pdf/route.ts` — server-side PDF generation; text-selectable output
8. `app/api/deliverables/[id]/comments/route.ts` — full CRUD for `DeliverableComment` model

**Key data flow patterns:**
- Artifact content is passed from `MessageBubble`'s already-fetched `deliverableRecords` directly into the artifacts store — no second network call on panel open
- `InlineEditor.handleSave()` calls `artifacts.updateContent(draft)` to keep preview in sync without a refetch
- Document type is inferred at `done` SSE event time (deliverable creation) and stored on the `Deliverable` record — not re-calculated on every render
- Comment anchors stored as character offsets in the raw markdown string (not DOM positions) — stable across re-renders; start with general (non-anchored) comments for v3.0

### Critical Pitfalls

1. **Artifacts panel layout breaks SSE streaming** — The `ChatPage` `initSession` guard fires on re-mount, resetting the Zustand store and losing in-flight stream state. Prevention: use segment layout + `react-resizable-panels` with `visibility: hidden` / `width: 0` for collapse (never remove from DOM via React state toggling). Verify by toggling panel 5 times during an active stream.

2. **Export libraries break the client bundle** — `docx` and `exceljs` reference Node.js built-ins (`fs`, `stream`) that webpack 5 cannot polyfill in client components, producing `Module not found: Can't resolve 'fs'` errors. Prevention: ALL binary export generation in API routes only. Dynamic `import()` for any library used client-side.

3. **SSE state and artifacts panel state desynchronize** — The `done` SSE event may fire before a newly-mounted panel subscribes. Prevention: keep `activeArtifactId` and `panelOpen` in `useChatStore` alongside streaming state; dispatch a single action on `done` that marks streaming complete AND sets the active artifact. Do NOT reset `deliverables: {}` on `initSession` when the panel is open.

4. **react-resizable-panels hydration mismatch** — Library reads `localStorage` for persisted panel sizes at mount; server renders defaults, causing hydration mismatch or hard error. Prevention: wrap `PanelGroup` in `dynamic(() => import(...), { ssr: false })` or use the library's `storage` prop with a null-on-server custom storage implementation.

5. **PDF output quality is unacceptable from client-side libraries** — `jsPDF` html() produces rasterized (non-selectable) text. `@react-pdf/renderer` requires rewriting all content in its own component primitives. Prevention: server-side rendering via API route is mandatory; evaluate Puppeteer vs `@react-pdf/renderer` with a code-block + table proof-of-concept before Phase 4 implementation begins.

6. **Inline comment anchors break on content edit** — Character offsets reference the markdown string at comment creation time; any subsequent edit shifts anchors. Prevention: start v3.0 with deliverable-level (non-anchored) comments only; defer text-selection anchoring to v3.1; if anchors are built, store a content hash alongside and invalidate when hash changes post-edit.

---

## Implications for Roadmap

Based on the dependency graph in ARCHITECTURE.md Build Order (Steps 1-8) and the pitfall-to-phase mapping in PITFALLS.md, the roadmap must follow strict dependency order. Every downstream feature depends on the layout being correct and the state model being unified. Rushing any phase risks breaking the existing streaming functionality that the entire app depends on.

### Phase 1: Layout, Shell, and Unified State

**Rationale:** All v3.0 features depend on the split layout existing and being safe to toggle. The `max-w-7xl` AppShell constraint must be resolved before any panel content is built. The unified state model (artifacts store + `useChatStore` coordination) must be established before streaming and panel state interact. This is the highest-risk phase — it directly touches the existing SSE infrastructure.

**Delivers:** Route segment layout at `app/chat/[sessionId]/layout.tsx`, `ResizablePanelGroup` in `ChatPage` with placeholder right panel, `store/artifacts.ts` Zustand store with all actions stubbed, SSR-safe `react-resizable-panels` integration, shortcut context scoping update to existing keyboard registry.

**Addresses:** Side-panel split layout (table stakes), panel collapse/dismiss, `]` keyboard shortcut toggle.

**Avoids:** Pitfall 1 (layout breaks streaming), Pitfall 3 (SSE/artifacts state desync), Pitfall 7 (keyboard shortcut conflicts with `Cmd+K` and browser shortcuts), Pitfall 9 (react-resizable-panels hydration mismatch), Pitfall 12 (AppShell `max-w-7xl` clips panel).

### Phase 2: Live Preview and Document Type Detection

**Rationale:** The artifact card in chat and the live streaming preview are the next foundational layer — all visible panel content depends on these. Document type must be classified at deliverable creation time and cannot be added later. Streaming preview must be throttled (4fps via `useDeferredValue`) to avoid visible lag.

**Delivers:** Artifact card component in chat stream, `DocumentPreview` with streaming markdown renderer (throttled), `lib/document-type.ts` heuristic classifier, `docType String?` column on `Deliverable` schema via `prisma db push`, `DocumentTypeIcon` component in panel header, `MessageBubble` onClick wiring to artifacts store.

**Addresses:** Artifact card in chat (table stakes), live streaming preview (table stakes), document type detection (table stakes).

**Avoids:** Pitfall 8 (preview re-render lag during streaming — use `useDeferredValue` + 4fps throttle), Pitfall 10 (doc type detection agent coordination — use optional `type` XML attribute with heuristic fallback for backward compatibility).

### Phase 3: Type-Aware Renderers and Version Navigation

**Rationale:** With preview infrastructure in place, the three viewer components can be built independently. Version navigation and diff toggle are low-effort because both `DeliverableVersion` and `react-diff-viewer-continued` are already present from v2.0. This phase turns the panel from a plain markdown view into a rich document workspace.

**Delivers:** `MarkdownDocument` viewer (with optional document outline for long docs), `SpreadsheetDocument` viewer (interactive grid for tabular data), `TechnicalSpec` viewer (syntax-highlighted code), version selector in panel header, diff toggle in panel header reusing `react-diff-viewer-continued`.

**Addresses:** Type-aware rendering (table stakes), version navigation in panel (table stakes), show diff in panel (table stakes).

**Avoids:** Pitfall 5 (SQLite binary storage — `docType` is a string enum only; never store binary export data in the DB).

### Phase 4: Multi-Format Export

**Rationale:** Export is the highest-value deliverable feature for professional use cases. All export logic is independent of commenting. The server-only pattern for binary formats must be established as the first act of this phase before writing any format-specific code, to prevent the client bundle breakage pitfall.

**Delivers:** `lib/export/exportMarkdown.ts` (zero deps), `lib/export/exportDocx.ts` (server-side via API route), `lib/export/exportXlsx.ts` (server-side via API route using remark-gfm AST parsing for tables), `app/api/export/pdf/route.ts` (server-side, approach selected from POC), `ExportBar` component with format buttons + tooltips, copy-to-clipboard.

**Addresses:** Export to Markdown, HTML, PDF, Word, Excel, CSV (all table stakes), copy to clipboard (table stakes).

**Uses:** `docx` ^9.6.1, `exceljs` ^4.4.0, `@react-pdf/renderer` ^4.3.2 (or Puppeteer pending POC result), dynamic imports for bundle efficiency.

**Avoids:** Pitfall 2 (export libraries break client bundle — all binary generation in API routes, dynamic imports everywhere), Pitfall 4 (PDF layout quality — server-side rendering only), Pitfall 6 in PITFALLS.md (Excel table parsing — use remark-gfm AST, not naive `|` string splitting). Always set `Content-Disposition: attachment` header on binary responses.

### Phase 5: Inline Commenting

**Rationale:** The `DeliverableComment` model and comment API routes are new infrastructure. v3.0 starts with deliverable-level (general) comments only to avoid the anchor-management complexity. The Comment model from v2.0 schema already exists as a `Comment` model on `Deliverable`; this phase adds the panel UI surface and general-comment CRUD. Text-selection anchoring is deferred to v3.1.

**Delivers:** `DeliverableComment` Prisma model (with `anchor String?` field for future use), `app/api/deliverables/[id]/comments/route.ts`, `deliverableService` comment methods, `CommentThread` component (general comments only, no text-selection anchoring in v3.0).

**Addresses:** Inline commenting (differentiator/P2 feature) — delivered at general-comment scope.

**Avoids:** Pitfall 6 (inline comment anchors break on resize — general comments only in v3.0; defer text-selection anchoring).

### Phase Ordering Rationale

- Phases 1 and 2 are strictly sequential — layout and state model must be proven safe before live preview components are built on top of them.
- Phases 3 and 4 can overlap once Phase 2 preview infrastructure is confirmed working.
- Phase 5 is independent of Phase 4 but requires the stable preview panel from Phase 3 to provide the surface for comment display.
- In-place agent revision (highlight + targeted revision prompt) is intentionally deferred to v3.1 — it conflicts with text-selection commenting UX and requires both features to be designed together.

### Research Flags

Phases likely needing deeper validation during planning:

- **Phase 1 (AppShell bypass):** ARCHITECTURE.md flags that the segment layout approach may require a negative margin (`-m-6`) workaround because `max-w-7xl p-6` is inside `PageTransition`, not directly overridable from segment layouts. Validate the exact technique in an isolated branch before restructuring `ChatPage`.
- **Phase 4 (PDF strategy):** `@react-pdf/renderer` requires custom layout components and is lower-fidelity for mixed content (code blocks + tables). Puppeteer requires a print-optimized route (`/app/print/[deliverableId]`) but uses the real browser engine. Build a proof-of-concept with a deliverable containing code blocks, tables, and headings before committing to either approach.

Phases with standard patterns (skip deeper research):

- **Phase 3 (Type-aware renderers):** Straightforward component composition reusing existing `react-markdown`, `recharts`, and `highlight.js`. Well-documented patterns with no novel integrations.
- **Phase 5 (Commenting API):** Standard Prisma CRUD + Next.js REST route pattern already established in the codebase. No new infrastructure needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All new npm packages verified (docx 9.6.1, @react-pdf/renderer 4.3.2, exceljs 4.4.0, react-hotkeys-hook 5.2.4). React 19 compatibility confirmed for react-pdf. Single MEDIUM caveat: exceljs maintenance stall is real but acceptable for write-only local use. |
| Features | HIGH | Validated against Claude.ai Artifacts (official docs), ChatGPT Canvas (official announcement), and Cloudscape Design System. Feature boundaries are clear. Differentiator vs table-stakes distinction is well-grounded. |
| Architecture | HIGH | Based on direct codebase analysis of 12,504 LOC. Component boundaries, data flows, build order, and schema changes are fully specified. One caveat: the exact AppShell `max-w-7xl` bypass technique requires implementation validation. |
| Pitfalls | HIGH | 12 pitfalls documented with direct codebase code references (ChatPage.tsx, AppShell.tsx, chat.ts store, InlineEditor.tsx, schema.prisma). Top 6 are confirmed risks based on actual code paths reviewed, not hypothetical scenarios. |

**Overall confidence:** HIGH

### Gaps to Address

- **PDF strategy decision (Phase 4):** `@react-pdf/renderer` is lighter but requires custom layout components and produces lower-fidelity output for code-heavy documents. Puppeteer is heavier but uses the real browser engine. PITFALLS.md and STACK.md give conflicting recommendations. Resolve with a proof-of-concept before Phase 4 planning begins. See `.planning/research/PITFALLS.md` Pitfall 4 vs `.planning/research/STACK.md` Section 2.
- **AppShell bypass technique (Phase 1):** ARCHITECTURE.md Pattern 1 notes the segment layout approach may not fully escape the `max-w-7xl p-6` wrapper if it is rendered inside `PageTransition`. The `-m-6` negative margin override or a `fullWidth` AppShell prop are fallback approaches. Validate in isolation before restructuring the full ChatPage. See `.planning/research/ARCHITECTURE.md` Pattern 1 caveat.
- **In-place revision + commenting UX conflict (v3.1 planning):** Both features use text selection in the preview pane. The commenting UX design in Phase 5 should document the selection interaction model explicitly so v3.1 in-place revision can be designed around it rather than requiring a redesign.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `/Users/luke/onewave-agency/src/` (12,504 LOC TypeScript, Prisma schema, Zustand stores, API routes)
- [Claude Artifacts Help Center](https://support.claude.ai/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them) — artifact panel UX patterns
- [ChatGPT Canvas OpenAI announcement](https://openai.com/index/introducing-canvas/) — Canvas split-panel UX patterns
- [Cloudscape artifact previews pattern](https://cloudscape.design/patterns/genai/artifact-previews/) — AWS design system artifact display guidance
- [docx npm v9.6.1](https://www.npmjs.com/package/docx) — verified version, official docs at docx.js.org
- [@react-pdf/renderer npm v4.3.2](https://www.npmjs.com/package/@react-pdf/renderer) — verified, React 19 compat confirmed at react-pdf.org/compatibility
- [exceljs npm v4.4.0](https://www.npmjs.com/package/exceljs) — verified, maintenance status reviewed
- [react-hotkeys-hook npm v5.2.4](https://www.npmjs.com/package/react-hotkeys-hook) — verified, React 19 compatible
- [shadcn resizable](https://ui.shadcn.com/docs/components/resizable) — wraps react-resizable-panels v4
- [Next.js App Router nested layouts](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)

### Secondary (MEDIUM confidence)
- [react-resizable-panels SSR issue #144](https://github.com/bvaughn/react-resizable-panels/issues/144) — localStorage hydration mismatch pattern and workaround
- [Claude inline edits (Oct 2025)](https://hyperdev.matsuoka.com/p/claudeais-quiet-revolution-in-artifact) — 3-4x faster inline section replacement vs full regeneration
- [ChatGPT Canvas review 2025](https://skywork.ai/blog/chatgpt-canvas-review-2025-features-coding-pros-cons/) — inline editing and revision UX patterns
- [AI chat layout patterns (Jan 2026)](https://medium.com/@anastasiawalia/ai-chat-layout-patterns-when-to-use-them-real-examples-d03f04a19194) — layout pattern survey
- [SheetJS security CVEs (Snyk)](https://snyk.io/vuln/npm:xlsx) — prototype pollution and ReDoS, reason to avoid npm xlsx
- [Top JS PDF libraries 2026 (Nutrient)](https://www.nutrient.io/blog/top-js-pdf-libraries/) — puppeteer vs react-pdf tradeoffs

### Tertiary (needs validation)
- PDF fidelity comparison: PITFALLS.md Pitfall 4 recommends Puppeteer; STACK.md Section 2 recommends `@react-pdf/renderer`. Needs empirical proof-of-concept with actual deliverable content (code blocks + tables) before Phase 4 planning.

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
