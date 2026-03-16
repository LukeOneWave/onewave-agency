# Domain Pitfalls

**Domain:** Adding document workspace / artifacts panel (live preview, rich export, inline commenting, keyboard shortcuts) to existing Next.js 16 + Prisma 7 + SQLite + SSE streaming app
**Researched:** 2026-03-16
**Confidence:** HIGH (based on direct codebase audit + verified external sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, streaming regressions, or data loss.

### Pitfall 1: Artifacts Panel Layout Breaks the Existing Chat Layout

**What goes wrong:** The current `ChatPage` renders as a simple single-column flex container (`flex h-full flex-col`). Adding a side-by-side artifacts panel requires converting this to a horizontal split layout. If this is done naively — wrapping the existing component in a new parent div — two problems emerge: (a) the `AppShell` already constrains `<main>` to `max-w-7xl p-6`, which leaves no room for an expanded split layout; (b) the page route passes a fully serialized `ChatSession` from a Server Component, and restructuring the layout client-side after hydration causes SSE streaming to re-initialize as Zustand detects a session change.

**Why it happens:** The `ChatPage` client component calls `useChatStore.getState().initSession()` on first render and guards it with a `current.sessionId === session.id` check. If the parent layout structure changes and triggers a re-mount, this guard is bypassed and the store resets — losing in-flight streaming state and any draft content in the artifacts panel.

**How to avoid:**
- Move the chat-level layout to a dedicated `layout.tsx` in `app/chat/[sessionId]/` so it exists outside `AppShell`'s `max-w-7xl` constraint. The artifacts panel needs full-width.
- Add a `suppressArtifactsPanel` prop to `AppShell` or introduce a chat-specific shell variant that opts out of the `max-w-7xl p-6` wrapper.
- Use `react-resizable-panels` (bvaughn) for the split — it handles SSR hydration with a documented workaround (persisted layout sizes trigger layout shift on hydration; wrap with `suppressHydrationWarning` on the panel group or use `dynamic` import with `ssr: false`).
- Do NOT use CSS Grid column toggling driven by React state to show/hide the panel — this causes `ChatPage` to re-mount if the grid collapses the column. Use `visibility: hidden` + `width: 0` instead of removing from the DOM.

**Warning signs:** SSE streaming resets when artifacts panel is toggled. Chat store shows `sessionId: null` after panel open/close. Network tab shows second POST to `/api/chat` triggered by panel toggle.

**Phase to address:** Phase 1 of v3.0 — the layout restructure must happen before any artifacts panel content is built.

---

### Pitfall 2: Document Export Libraries with Node.js-Only Dependencies Break the Client Bundle

**What goes wrong:** The most natural choices for Word (.docx) and Excel (.xlsx) export — `docx`, `exceljs`, `docx-templates` — use Node.js built-ins (`fs`, `path`, `stream`, `Buffer` in ways that browsers cannot polyfill). Importing them anywhere in `"use client"` components, or in a shared utility file used by both client and server, causes Next.js to bundle them into the browser bundle, producing build errors like `Module not found: Can't resolve 'fs'` or silent runtime crashes.

**Why it happens:** The docx library (most popular Word generation lib) conditionally uses `fs.writeFile` when it detects a Node.js environment. When webpack 5 encounters this import in a client component tree, it either fails or includes a 600KB+ dead import in the browser bundle. `exceljs` is similar — it has browser builds but they are separate files that must be explicitly imported. The Next.js App Router makes this worse because the module boundary between Server Components and Client Components is not always obvious.

**How to avoid:**
- All document generation MUST happen in API route handlers (`/api/export/...`) — never in client components.
- Use `docx` (npm package) server-side only for Word generation. It has no browser alternative. Return the result as a binary `application/octet-stream` response.
- For Excel, use `exceljs/dist/exceljs.bare.min.js` if client-side is needed, or handle via API route with the standard `exceljs` build.
- SheetJS (`xlsx`) has a genuine browser build at `dist/xlsx.full.min.js` but adds ~800KB to the bundle. Import it only in a dedicated API route or with dynamic `import()` behind the export action.
- For HTML and Markdown export, these are pure string transformations — they are safe in any context.
- For CSV, `array.join(',')` with proper escaping — no library needed, completely safe.
- Add `@types/node` exclusions to `tsconfig.json` client paths if needed to enforce the boundary.

**Warning signs:** Build error mentioning `fs`, `path`, or `stream`. Bundle size suddenly increases by 500KB+. Export works in development but fails in production builds.

**Phase to address:** Phase 2 of v3.0 (Export) — establish the server-only export pattern as the first step before implementing any format.

---

### Pitfall 3: SSE Streaming and Artifacts Panel State Are Two Independent State Machines That Desynchronize

**What goes wrong:** The current `useChatStore` owns all streaming state. The artifacts panel will need its own state (which document is displayed, edit mode, comment threads). As streaming completes, a `done` SSE event carries the `messageId`, which triggers `parseDeliverables()` and populates artifacts. If the artifacts panel state is maintained in a separate store or local state, the hand-off between "streaming complete" and "artifact ready" becomes a race condition: the panel may try to render an artifact before the `done` event fires, or may miss the event entirely if it mounts after the event is processed.

**Why it happens:** The `done` event updates Zustand store message ID and triggers `loadDeliverables()` asynchronously. A panel component that subscribes to this at mount time may subscribe after the event has already been processed, and the initial `deliverables: {}` state (which is reset on `initSession`) means a newly mounted panel has no knowledge of the just-completed stream.

**How to avoid:**
- Extend `useChatStore` to include `activeArtifactId: string | null` and `artifactPanelOpen: boolean` — keep all streaming-related state in one store.
- When the `done` SSE event fires, dispatch a single action that both marks streaming complete AND sets `activeArtifactId` to the first deliverable in the message.
- The artifacts panel should derive its content from `useChatStore` selectors — it should not maintain its own copy of document content. Treat the panel as a view over the store, not a separate domain.
- Do NOT reset `deliverables: {}` on `initSession` if the panel is open — check `artifactPanelOpen` before clearing.

**Warning signs:** Artifacts panel shows "no document" immediately after a message streams in, then updates after a second delay. Panel shows stale content from previous session after navigating to a new chat.

**Phase to address:** Phase 1 of v3.0 — design the unified state model before building any panel UI.

---

### Pitfall 4: PDF Generation in the Browser Produces Inconsistent Layout

**What goes wrong:** Using a client-side PDF library (`jsPDF`, `@react-pdf/renderer`, `pdfmake`) to generate PDFs from deliverable content produces output that does not match the screen rendering. Code blocks lose syntax highlighting. Tables collapse. Long lines overflow the page. The root cause is that none of these libraries render from the DOM or from CSS — they use their own layout engines that re-implement typography from scratch. `@react-pdf/renderer` requires rewriting all content using its own `<View>`, `<Text>`, `<Page>` primitives rather than reusing existing React components.

**Why it happens:** Developers see a deliverable rendered nicely with `react-markdown` + Tailwind and assume PDF export will capture that fidelity. It won't. `jsPDF` is an imperative canvas API (position text at x/y coordinates). `@react-pdf/renderer` is a separate React renderer entirely. `pdfmake` uses a JSON document definition. All three require re-expressing the document layout in their own format.

**How to avoid:**
- For fidelity PDF output: use Puppeteer or Playwright in an API route to render the deliverable as HTML and capture it. This uses the actual browser rendering engine and respects CSS. The overhead is acceptable for a local-only app where PDF is an explicit user action.
- Add a minimal `/app/print/[deliverableId]/page.tsx` page styled for print (white background, print-optimized CSS, no sidebar). The Puppeteer API route navigates to this page, captures PDF, returns it.
- Alternatively: `@react-pdf/renderer` is acceptable if a custom PDF layout component is built specifically for it — but budget 2-3x the implementation time versus screen rendering.
- Do NOT use `jsPDF`'s `html()` method — it uses Canvas which produces blurry rasterized text, not selectable PDF text.
- Do NOT use `window.print()` for PDF export — it exports the entire page including sidebar, header, and navigation.

**Warning signs:** PDF fonts look different from screen. Code blocks in PDF are unstyled or missing. Table formatting breaks. User reports exported PDF looks "terrible."

**Phase to address:** Phase 2 of v3.0 (Export) — decide the PDF strategy (Puppeteer vs react-pdf) before implementing. Puppeteer is the high-confidence choice for quality; react-pdf requires more custom work.

---

### Pitfall 5: Deliverable Content Stored as `String?` in SQLite Cannot Hold Binary Export Formats

**What goes wrong:** The current schema stores `Deliverable.content String?` — plain text or markdown. v3.0 adds document types (business doc, spreadsheet, technical spec). If the app needs to cache a generated DOCX or XLSX binary in the database for subsequent download without regeneration, SQLite stores it as BLOB, but Prisma 7 with the `sqlite` driver does not support `Bytes` field types the same way as PostgreSQL. Using `String` with Base64-encoded binary content increases storage by 33% and makes the content column semantically ambiguous.

**Why it happens:** The schema was designed for text content. Adding binary document storage is a natural extension that seems straightforward but introduces complexity at the Prisma layer.

**How to avoid:**
- Do NOT cache binary export files in SQLite. Generate them on-demand in the export API route and stream the response directly to the browser. A 50KB DOCX generates in under 100ms — there is no benefit to caching it.
- SQLite is well-suited for text documents up to several MB. The limit where reads become slow is around 100KB per row — most deliverable text will be under 50KB and is fine.
- If document type metadata is needed (e.g., "this deliverable is a spreadsheet"), add a `documentType String? @default("markdown")` column to `Deliverable` — pure enumeration, no binary storage.
- For larger generated documents (e.g., full report with many sections), consider a `Document` model that is separate from `Deliverable` — a deliberate user-created file rather than an auto-extracted deliverable.

**Warning signs:** `Deliverable.content` contains Base64 strings starting with `UEsD`. Binary data appearing in text columns. Slow deliverable list queries as row sizes grow.

**Phase to address:** Phase 3 of v3.0 (Document model) — decide the Document data model before building the artifacts panel persistence layer.

---

### Pitfall 6: Inline Commenting Anchor Positions Break on Content Resize

**What goes wrong:** Inline comments require anchoring a UI element (comment bubble, highlight) to a specific text span within the deliverable. When using `document.getSelection()` + `Range` to capture the selection position, the anchor is stored as character offset within the raw text. When the content is later rendered at a different column width (panel resize, window resize, zoom), the character offset is valid but the pixel position changes — comments appear in wrong locations or overlap content.

**Why it happens:** Pixel-based anchoring (storing `getBoundingClientRect()`) breaks on any resize. Character-offset anchoring (storing start/end character index within the text) is stable but converting back to pixel coordinates for rendering the UI widget requires re-running `Range` calculations at render time, which is expensive and can fail if the DOM structure changes (e.g., markdown re-renders the text into different `<p>` and `<code>` elements).

**How to avoid:**
- Store comment anchors as character offsets within the raw markdown string, not as DOM positions. The raw string is stable; the rendered DOM is not.
- When rendering comments, walk the rendered DOM to find the text node at the stored character offset using a custom `findTextPosition()` utility. This is moderately complex but reliable.
- Accept that comments on code blocks inside markdown are harder than comments on plain text — the syntax markers (`\`\`\``) contribute to character count but are not visible. Document this edge case.
- Use a `highlight.js`-aware approach: apply comment highlights as CSS markers over the rendered output using `::highlight()` or a wrapper span, not absolutely-positioned overlays.
- Alternatively: simplify the feature for v3.0 — allow comments only on entire deliverables, not on text selections. This is a significant scope reduction but eliminates the anchor complexity entirely. Inline text-selection comments are a Level 2 feature.

**Warning signs:** Comments appear at wrong position after window resize. Comments on code blocks highlight the wrong text. Character count mismatch between stored offset and rendered text.

**Phase to address:** Phase 4 of v3.0 (Inline Commenting) — define the anchoring strategy explicitly before building the comment UI. Recommend starting with deliverable-level comments only.

---

### Pitfall 7: Keyboard Shortcut Registry Conflicts with Existing Cmd+K and Browser Shortcuts

**What goes wrong:** The existing `AppShell` registers a global `keydown` listener for `Cmd+K` (command palette). Adding review workflow shortcuts (`a` = approve, `r` = revise, `e` = edit, `Cmd+Enter` = submit) creates three classes of conflict: (a) new shortcuts fire inside text inputs (documented in v2.0 pitfalls as Pitfall 3); (b) `Cmd+K` is already bound at the shell level — if the artifacts panel adds its own `Cmd+K` handler for "link" in a rich text editor, both fire; (c) `Cmd+P` triggers the browser print dialog on macOS, `Cmd+S` may trigger page save in some browsers, `Cmd+B` triggers bold in many browser text inputs.

**Why it happens:** The v2.0 shortcut research (Pitfall 3 in the prior PITFALLS.md) addressed the input-focus problem. The new problem is specifically about the artifacts panel adding a rich editing context where document editing shortcuts conflict with app navigation shortcuts. A document editor inherently wants `Cmd+B`, `Cmd+I`, `Cmd+Z` — all of which have browser meanings.

**How to avoid:**
- Do NOT implement rich text formatting keyboard shortcuts for the artifacts panel in v3.0. The current inline editor uses a `<textarea>` which handles `Cmd+Z` natively (undo). Keep this model.
- If a rich text editor (Tiptap) is introduced, explicitly disable all its default keyboard shortcuts that conflict with global app shortcuts and re-bind them with scoping.
- The shortcut registry from v2.0 infrastructure must be used — do not add a second `addEventListener('keydown')` in the artifacts panel.
- Add the concept of "shortcut context" to the registry: when the artifacts panel is in edit mode, suspend all non-editor shortcuts. When the command palette is open, suspend all panel shortcuts.
- Explicitly avoid: `Cmd+K` (taken by command palette), `Cmd+P` (browser print), `Cmd+S` (browser save), `Escape` (already handles streaming stop — must not conflict with panel close).

**Warning signs:** Pressing `Cmd+K` in the artifacts panel opens the command palette AND a link dialog. `Escape` key closes the panel but also aborts streaming. `Cmd+S` triggers browser save-page dialog.

**Phase to address:** Phase 1 of v3.0 — update the shortcut registry to support context scoping before adding any new shortcuts.

---

## Moderate Pitfalls

### Pitfall 8: Rich Document Preview Fires Expensive Re-Renders During Streaming

**What goes wrong:** The artifacts panel displays a live preview of the document being streamed. If the panel subscribes to the Zustand `messages` slice and re-renders `ReactMarkdown` on every text chunk, each streaming update (which can arrive 10-30 times per second) triggers a full re-render of the preview including syntax highlighting. For deliverables longer than 500 tokens, this creates visible lag.

**Prevention:**
- Derive the artifact preview content from a separate `streamingArtifactDraft` state, not from the messages array.
- Use `useMemo` to memoize `parseDeliverables()` output — only re-parse when the full content string changes, not on every chunk.
- Throttle artifact preview updates during streaming to 4 renders per second using a ref-based throttle — the preview does not need to update every chunk.
- Use React's `useDeferredValue` for the preview content so main thread input handling takes priority over preview re-renders.
- Disable syntax highlighting in `ReactMarkdown` during streaming — it is unnecessary latency on partial code blocks. Re-enable after streaming completes.

**Phase to address:** Phase 1 of v3.0 when the artifacts panel receives streaming content.

---

### Pitfall 9: react-resizable-panels Hydration Mismatch in Next.js App Router

**What goes wrong:** `react-resizable-panels` stores panel sizes in `localStorage` and tries to restore them on mount. During SSR, `localStorage` is undefined. On client hydration, the server-rendered sizes (defaults) and client-rendered sizes (from localStorage) differ, causing React to throw a hydration warning or, in some Next.js versions, a hard error.

**Prevention:**
- The library author has documented this — use the library's `storage` prop with a custom storage that returns `null` on the server side.
- Alternatively wrap the `PanelGroup` component in `dynamic(() => import('./ArtifactsLayout'), { ssr: false })` — this delays render to client-only, eliminating the mismatch at the cost of a brief layout shift on load.
- The bvaughn/react-resizable-panels-demo-ssr repository is the reference for correct Next.js App Router integration.
- Default panel sizes should be defined as explicit props (`defaultSize={60}` for chat, `defaultSize={40}` for artifacts) and matched between SSR and client initial render to prevent layout shift.

**Phase to address:** Phase 1 of v3.0 — the layout setup phase.

---

### Pitfall 10: Document Type Detection Requires Agent Coordination

**What goes wrong:** The artifacts panel needs to know whether a deliverable is a "business doc", "spreadsheet data", "technical spec", or "creative content" to render it correctly (e.g., table view for spreadsheet data, formatted prose for business docs). If this detection is pure regex/heuristic on the content, it will misclassify frequently. If the agent must explicitly output a structured type header, existing agents (61 of them) will not produce this format without prompt changes.

**Why it happens:** The existing deliverable extraction uses `<deliverable>` XML tags. Adding a `<document type="spreadsheet">` attribute pattern sounds simple but requires updating all 61 agent system prompts, and many user-created sessions will have the old format for existing deliverables.

**How to avoid:**
- Add optional `type` attribute to the `<deliverable>` tag: `<deliverable type="spreadsheet">`. Default to `"document"` when absent. This is backward-compatible — all existing deliverables continue to work as plain documents.
- Update only the agents most likely to produce structured data (Data Analysis, Finance division agents) to emit type attributes. Leave other agents with the default.
- For content-based heuristic detection as a fallback: check if content starts with a CSV header pattern or Markdown table (first line contains `|` separators) to identify spreadsheet-type content.
- Store the `documentType` on the `Deliverable` model as a nullable string — populated when detected, null for old deliverables.

**Phase to address:** Phase 3 of v3.0 (rich document types).

---

### Pitfall 11: Excel Export of Markdown Tables Requires Parsing, Not Direct Streaming

**What goes wrong:** Deliverable content is stored as markdown. Excel/CSV export requires parsing the markdown table syntax into row/column data before generating the spreadsheet. Naive string splitting on `|` characters fails for cells that contain embedded `|` or for multiline table cells. Using a markdown AST parser (remark + remark-gfm) adds dependency weight; writing a custom parser introduces subtle bugs.

**Prevention:**
- Use `remark` + `remark-gfm` to parse the markdown AST on the server side. Extract table nodes as structured data. This is already in the dependency tree (`remark-gfm` is used client-side for rendering) — but use it server-side for AST parsing in the export route.
- For CSV: implement a minimal RFC 4180 compliant serializer — quote fields containing commas, newlines, or quotes. Do not use `.join(',')` without escaping.
- For Excel: use `exceljs` in the API route. Limit features to: header row formatting, auto-column widths, frozen header row. Do not attempt charts or formulas in v3.0.
- If content has no parseable tables, fall back to exporting the raw markdown text as a single-cell spreadsheet with a warning comment.

**Phase to address:** Phase 2 of v3.0 (Export).

---

### Pitfall 12: The `max-w-7xl` AppShell Wrapper Clips the Artifacts Panel

**What goes wrong:** `AppShell` renders `<div className="mx-auto max-w-7xl p-6">` around all page content. An artifacts panel that needs to use the full horizontal viewport width cannot work within this constraint — the chat content and artifacts panel together would be constrained to 1280px with 48px padding on each side (max 1184px usable). On 1440px or 1920px monitors, significant horizontal space is wasted.

**Why it happens:** The `max-w-7xl` is appropriate for single-column pages (agent list, dashboard, project detail) but inappropriate for a split-layout document workspace that benefits from full-width use.

**How to avoid:**
- Add a `fullWidth` prop to `AppShell` (or create a `ChatShell` variant) that removes the `max-w-7xl` constraint for chat pages.
- The chat route already differs from other routes — it has no page padding in the content area since the chat itself fills the viewport. Making this explicit with a shell variant is cleaner than fighting the default styles.
- The `Sidebar` and `Header` remain unchanged — only the `<main>` content area wrapper changes.

**Phase to address:** Phase 1 of v3.0 — part of the layout restructure.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store artifact content in component state instead of Zustand | Simpler component code | Artifact state lost on navigation, streaming desync | Never — streaming completion events must update global store |
| Generate DOCX client-side with a browser-compatible library | No API route needed | fs module errors in Next.js build, or 600KB+ bundle | Never — keep export server-only |
| Use `window.print()` for PDF | Zero implementation effort | Exports entire page with nav/sidebar, terrible output | Only as a temporary fallback with explicit labeling |
| Absolute-position comment bubbles using `getBoundingClientRect()` | Simpler to implement | Breaks on resize, scroll, and zoom | Never — store character offsets instead |
| Add a new SSE endpoint for artifact live updates | Real-time feel | Hits browser HTTP/1.1 connection limit (6 per domain) when combined with existing chat SSE | Never — use polling or Zustand-driven updates |
| Use Tiptap for rich text editing from day one | Powerful editor | 150KB bundle, learning curve, complex cursor/selection management | Only if explicit formatting (bold/italic/tables) is a v3.0 requirement |
| Detect document type from content heuristics only | No prompt changes | Frequent misclassification, brittle | Acceptable as fallback only — primary detection should use explicit XML attribute |

---

## Integration Gotchas

Common mistakes when connecting to the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Existing SSE streaming + artifacts panel | Subscribe to `messages` array, re-render on every chunk | Subscribe to `isStreaming` + `activeArtifactId` from store; throttle preview updates |
| Existing `Deliverable` schema + document types | Add new model for "Document" separate from Deliverable | Add `documentType` and `artifactData` columns to existing `Deliverable` model — avoids schema churn |
| Existing `InlineEditor` (textarea) + artifacts panel | Replace InlineEditor with a new rich editor | Keep textarea-based InlineEditor in the review panel; use a separate preview pane in artifacts panel |
| Export API routes + Next.js client components | Import `docx`/`exceljs` in client component | All export libraries in API routes only; client sends export request and handles binary response |
| `AppShell` layout + full-width split pane | Toggle CSS classes to show/hide artifacts column | Use a chat-specific shell that opts out of `max-w-7xl` — prevents DOM thrash and layout shift |
| Existing `deliverables` Zustand slice + artifact panel state | Create second `artifactStore` | Add `activeArtifactId` and `panelOpen` to existing `useChatStore` to keep streaming state colocated |
| Existing `cmdk` Command Palette (Cmd+K) + editor shortcuts | Register new Cmd+K binding in artifacts panel | Use existing shortcut registry with context scoping — never add a second document-level keydown listener |

---

## Performance Traps

Patterns that work but degrade user experience.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-render `ReactMarkdown` on every SSE text chunk | Visible lag in artifacts preview during streaming | Throttle preview to 4 fps; use `useDeferredValue` | Deliverables > 200 lines during active streaming |
| Generate DOCX synchronously in API route for large documents | HTTP timeout for long documents | Streaming response or background job — but for local app, synchronous under 5 seconds is fine | Documents > 100 pages (unlikely for this app) |
| Load all comments for a deliverable in a single query without pagination | Slow comment load on well-commented documents | Limit to 50 comments with `take: 50` | Any deliverable with > 50 comments |
| Run `parseDeliverables()` on every message re-render | CPU spike when message list has 50+ messages | Memoize per `messageId` + `content` hash — only re-parse when content changes | Sessions with > 20 messages |
| Binary export response without `Content-Disposition` header | Browser opens binary file inline instead of downloading | Always set `Content-Disposition: attachment; filename="..."` on export responses | Every export |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Artifacts panel opens and shifts the chat scrollback to the wrong position | User loses context of the conversation mid-stream | Preserve scroll position on panel toggle; use `scrollTop` restoration on layout change |
| Export format buttons visible but disabled before a deliverable exists | Confusing affordance — buttons that don't do anything | Hide export controls entirely until a deliverable is present in the panel |
| Inline comment UI overlaps the text being commented on | Comment covers the content the user wants to read | Offset comment bubbles to the right margin, not floating over text |
| "Approve" action available in artifacts panel AND in the existing ReviewPanel below the message | Two ways to do the same action, risk of double-action | Keep approve/revise actions in ReviewPanel only; artifacts panel is view + edit only |
| Streaming preview shows partial XML tags (`<deliv`) during stream | Visual noise that confuses users | Strip incomplete XML tags from preview using a regex during streaming |
| Export to Word produces a file named "document.docx" | Users can't find their file in Downloads | Auto-generate filename from deliverable content: first 50 chars of title or first line, sanitized |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Artifacts panel:** Often missing scroll sync with chat — when user jumps to a message, panel should show that message's artifact. Verify artifact panel tracks active message.
- [ ] **DOCX export:** Often missing: heading styles, code block formatting, table borders. Verify exported file opens correctly in Microsoft Word, not just LibreOffice.
- [ ] **PDF export:** Often missing: page breaks inside long code blocks, correct font rendering. Verify PDF text is selectable (not rasterized).
- [ ] **Excel export:** Often missing: header row is not frozen/bolded. Verify row 1 has formatting that distinguishes it from data rows.
- [ ] **Inline commenting:** Often missing: comments persist after page navigation and reload. Verify comments are fetched from DB on mount, not just from component state.
- [ ] **Keyboard shortcuts:** Often missing: shortcuts listed in the UI somewhere discoverable. Verify a `?` key or tooltip shows all active shortcuts.
- [ ] **Panel resize:** Often missing: panel size is not persisted across sessions. Verify localStorage-based size restoration works after page reload.
- [ ] **Binary export downloads:** Often missing: `Content-Disposition: attachment` header. Verify the browser downloads the file rather than displaying garbled binary content.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Artifacts panel layout breaks streaming | HIGH | Revert to single-column layout, isolate layout changes from store changes, rebuild incrementally |
| fs module error from export library in client bundle | LOW | Move import to API route, add `"use server"` directive, clear `.next` cache and rebuild |
| Streaming desync between chat store and artifacts panel | MEDIUM | Add logging to `done` event handler, trace `activeArtifactId` assignment, verify no double `initSession` calls |
| PDF output quality unacceptable | MEDIUM | Switch from client-side library to Puppeteer API route approach; add a print-optimized page route |
| Inline comment anchors break after content edit | MEDIUM | Add content hash to comment record; invalidate/disable comments when content hash changes post-edit |
| Keyboard shortcut conflict with browser | LOW | Check `e.metaKey`/`e.ctrlKey` combination, rename conflicting shortcut, update shortcut registry |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Artifacts panel breaks chat layout | Phase 1: Layout & Shell Restructure | Toggle panel open/close 5 times during active streaming — verify no store reset |
| Export libraries break client bundle | Phase 2: Export | `next build` succeeds with zero `fs`/`path` module errors |
| SSE + artifacts state desync | Phase 1: Unified state model | Send a message, verify artifact appears in panel within 200ms of `done` event |
| PDF layout quality | Phase 2: Export | Export a deliverable with code blocks and tables — verify selectable text and correct layout |
| SQLite binary storage | Phase 3: Document model | Confirm no binary data in `Deliverable.content` column; export is always on-demand |
| Inline comment anchors break on resize | Phase 4: Inline Commenting | Resize panel while comments are visible — verify comment positions update correctly |
| Keyboard shortcut conflicts | Phase 1: Shortcut Registry Update | Test all existing shortcuts after adding new ones; test in chat input, artifact edit mode, command palette |
| Preview re-render lag during streaming | Phase 1: Artifacts panel | Stream a 2000-token response — verify preview updates feel smooth, no UI blocking |
| react-resizable-panels hydration | Phase 1: Layout | Hard reload chat page — verify no React hydration warning in console |
| Document type detection | Phase 3: Rich document types | Test with agent that doesn't emit type attribute — verify graceful fallback to markdown rendering |
| AppShell max-w-7xl clips panel | Phase 1: Layout | On 1440px monitor, verify chat + artifacts panel use >80% of horizontal space |
| Excel table parsing | Phase 2: Export | Export a deliverable with a GFM markdown table — verify cell alignment and header row formatting in Excel |

---

## Sources

- Codebase audit: `/Users/luke/onewave-agency/src/components/chat/ChatPage.tsx`, `AppShell.tsx`, `chat.ts` (Zustand store), `InlineEditor.tsx`, `prisma/schema.prisma`
- [react-resizable-panels SSR issue #144](https://github.com/bvaughn/react-resizable-panels/issues/144) — hydration mismatch with localStorage
- [react-resizable-panels SSR demo (Next.js)](https://github.com/bvaughn/react-resizable-panels-demo-ssr) — reference implementation
- [Next.js App Router layout re-mount issue #52558](https://github.com/vercel/next.js/issues/52558) — components re-rendering on navigation
- [Next.js dynamic segment re-mount RFC Discussion #50711](https://github.com/vercel/next.js/discussions/50711)
- [Next.js fs module resolution Discussion #58642](https://github.com/vercel/next.js/discussions/58642) — Node.js modules in client bundles
- [Module not found: Can't resolve 'fs' — Sentry](https://sentry.io/answers/module-not-found-nextjs/)
- [Top JS PDF libraries for 2026 — Nutrient](https://www.nutrient.io/blog/top-js-pdf-libraries/)
- [PDF generation comparison — npm-compare](https://npm-compare.com/@react-pdf/renderer,jspdf,pdfmake,react-pdf)
- [SheetJS bundle size issue #694](https://github.com/SheetJS/sheetjs/issues/694) — 1MB+ bundle
- [SQLite Internal vs External BLOBs — sqlite.org](https://sqlite.org/intern-v-extern-blob.html) — 100KB threshold
- [SQLite Implementation Limits — sqlite.org](https://sqlite.org/limits.html)
- [Handling State Update Race Conditions in React — Medium/CyberArk](https://medium.com/cyberark-engineering/handling-state-update-race-conditions-in-react-8e6c95b74c17)
- [CSS Anchor Positioning API — Chrome for Developers](https://developer.chrome.com/docs/css-ui/anchor-positioning-api)
- [Keyboard shortcuts for web applications — xjavascript.com](https://www.xjavascript.com/blog/available-keyboard-shortcuts-for-web-applications/)
- Prior v2.0 pitfalls research (Pitfalls 1-14, 2026-03-10) — retained as reference for carried-forward issues

---
*Pitfalls research for: v3.0 Document Workspace / Artifacts Panel additions to existing Next.js 16 + Prisma 7 + SSE app*
*Researched: 2026-03-16*
