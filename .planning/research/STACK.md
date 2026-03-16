# Technology Stack -- v3.0 Document Workspace Additions

**Project:** OneWave AI Digital Agency v3.0
**Researched:** 2026-03-16
**Scope:** NEW dependencies only for document workspace features. All v2.0 stack (including motion, dnd-kit, diff, react-diff-viewer-continued, mammoth, react-markdown, rehype-highlight, remark-gfm) is already installed and unchanged.
**Confidence:** HIGH for core picks (verified via npm). MEDIUM for exceljs (maintenance concern noted).

---

## Already-Installed Libraries That Are Relevant

Before adding anything, these already-installed packages cover part of the v3.0 surface:

| Package | Already Used For | v3.0 Reuse |
|---------|-----------------|-----------|
| `mammoth` ^1.11.0 | Not yet actively used in UI | Read `.docx` files back into the app if needed |
| `react-markdown` + `remark-gfm` + `rehype-highlight` | Chat message rendering | Artifacts panel document preview (markdown type) |
| `highlight.js` ^11.11.1 | Code block syntax highlighting | Code artifact rendering |
| `gray-matter` ^4.0.3 | Agent file frontmatter parsing | Potentially strip frontmatter before export |
| `recharts` ^3.8.0 | Dashboard stats | Chart artifact rendering |

Export to Markdown and HTML require zero new dependencies — markdown is the native deliverable format, and HTML export is `document.documentElement.innerHTML` or a marked conversion of the markdown string.

---

## New npm Dependencies Required

### 1. docx -- Word (.docx) Export

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `docx` | ^9.6.1 | Generate `.docx` files from structured document data | The de facto JS/TS Word generation library. No React peer dependency — pure Node/browser. Declarative API (`new Document({ sections: [...] })`). Supports headings, tables, code blocks (monospace runs), lists, images, and custom styles. Works in both Next.js API routes (server-side Blob download) and client-side (browser Blob). 9.6.1 published days before this research. 436+ npm dependents. |

**Why not docxtemplater:** Template-based approach requires pre-existing `.docx` templates. Our deliverables are structured data (not pre-templated), so programmatic generation with `docx` is the right model.

**Why not html-to-docx:** Last published 3 years ago (1.8.0). `@packback/html-to-docx` is more recent but adds an HTML intermediate step with fidelity loss. `docx` gives full structural control.

**Why not remark-docx:** Built on top of `docx` and limited to markdown-to-docx conversion. Our deliverables may include structured data beyond what a markdown pipeline handles. Use `docx` directly for full control; use `remark-docx` only if the implementation proves simpler for markdown-only documents.

**Integration:** API route `POST /api/deliverables/[id]/export/docx` uses `docx` to build the document structure from the deliverable's parsed content (headings, body paragraphs, tables), returns `application/vnd.openxmlformats-officedocument.wordprocessingml.document` blob. Client triggers download.

**Confidence:** HIGH — npm-verified version 9.6.1. Official docs at docx.js.org.

---

### 2. @react-pdf/renderer -- PDF Export

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@react-pdf/renderer` | ^4.3.2 | Generate `.pdf` files using React component syntax | The standard React PDF generation library. Version 4.1.0+ supports React 19 (confirmed in official compatibility docs). No headless browser required — pure JS rendering with a custom layout engine. Declarative API using `<Document>`, `<Page>`, `<Text>`, `<View>` components that mirror how the document looks. Works in Next.js App Router with `'use client'` + dynamic import (no SSR). 482+ npm dependents. |

**Why not puppeteer/headless Chrome:** Requires running a full Chromium process from a Next.js API route. Excessive overhead for a local app. Works fine but is ~100MB binary dependency just for PDF export. `@react-pdf/renderer` is self-contained and faster for structured documents.

**Why not jsPDF:** Client-side only, no CSS support, manual coordinate-based placement. Not suitable for multi-page documents with flowing text, tables, and headings.

**Known Next.js gotcha:** Must be used with `'use client'` and `next/dynamic` with `ssr: false`, OR in an API route. Do not import in Server Components — it will crash. Add to `serverExternalPackages` in `next.config.ts` if used server-side:
```typescript
// next.config.ts
experimental: {
  serverExternalPackages: ['@react-pdf/renderer']
}
```

**Integration:** Two options — (a) client-side: `PDFDownloadLink` component renders a download button that triggers PDF generation in-browser; (b) server-side: API route calls `renderToBuffer()`. Option (a) is simpler for a local app. Use a `'use client'` component with dynamic import in the artifacts panel toolbar.

**Confidence:** HIGH — npm-verified version 4.3.2. React 19 support confirmed in official compatibility docs at react-pdf.org/compatibility.

---

### 3. exceljs -- Excel (.xlsx) Export

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `exceljs` | ^4.4.0 | Generate `.xlsx` files with formatting, multiple sheets | The most feature-complete JS Excel library. Supports cell formatting, column widths, bold headers, multiple worksheets, streaming writes (memory-efficient for large tables). Works server-side in Next.js API routes. 2273+ npm dependents. |

**Maintenance note:** exceljs 4.4.0 was last published ~2 years ago. The repository has a new maintainer but no new npm releases since then. However: the API is stable, the feature set is complete for our use case (write formatted xlsx with headers and data rows), and it has no known security vulnerabilities for write-only usage. For a local tool that only generates files (never parses untrusted input), this maintenance gap is acceptable.

**Why not SheetJS (xlsx npm package):** The `xlsx` package on npm is version 0.18.5 and is stale. The current SheetJS version (0.20.3) requires installation from their own CDN (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`), not npm. Multiple known security vulnerabilities in the npm-published version (prototype pollution, ReDoS). Avoid.

**Why not write-excel-file:** Simpler API but limited formatting options. exceljs gives header bolding, column width control, and multi-sheet support that will be needed for structured report exports.

**CSV export:** No library needed. Native JavaScript `Array.map().join('\n')` or a small utility function. Do not add a CSV library for this.

**Integration:** API route `POST /api/deliverables/[id]/export/xlsx` parses the deliverable's tabular data (from the XML `<deliverable>` content), creates an ExcelJS workbook with a single worksheet, applies bold headers and auto-column widths, returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` blob.

**Confidence:** MEDIUM — Version verified via npm. Maintenance concern is real but acceptable for the use case.

---

### 4. react-hotkeys-hook -- Keyboard Shortcuts (Upgrade from Custom Hook)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `react-hotkeys-hook` | ^5.2.4 | Keyboard shortcuts for review workflow (approve, revise, navigate, export) | v3.0 adds an artifacts panel alongside chat, creating more UI surface that needs keyboard control. The v2.0 custom `useKeyboardShortcuts` hook was appropriate for <10 shortcuts scoped to one panel. v3.0 needs scoped hotkeys (shortcuts active only when artifacts panel is focused vs. chat panel), modifier key combinations (Cmd+E for export, Cmd+S for save), and input field awareness — all features react-hotkeys-hook v5 handles natively via `scopes` API. ~100KB, zero dependencies. React 19-compatible (v5.2.4 published within weeks of research). |

**The v2.0 decision revisited:** The v2.0 STACK.md correctly recommended a custom hook for <10 shortcuts. v3.0 changes the calculus:
- v3.0 adds a split-panel UI (chat + artifacts) where shortcuts must be panel-aware
- Export shortcuts (Cmd+Shift+W, Cmd+Shift+P, Cmd+Shift+E) require modifier combinations that the custom hook handles awkwardly
- The `scopes` API prevents hotkey collisions between panels without manual `isFocused` tracking
- Still lightweight: ~100KB vs. the 50-line custom hook, but it eliminates a category of bugs

**If v3.0 ends up with the same 5 shortcuts as v2.0:** Keep the custom hook. Add `react-hotkeys-hook` only when the shortcut count grows or panel scoping becomes necessary during implementation.

**Confidence:** HIGH — npm-verified version 5.2.4. React 19 compatible.

---

## Export Formats: Zero-Dependency Options

These two formats need no new libraries:

| Format | Implementation | Notes |
|--------|---------------|-------|
| **Markdown (.md)** | `deliverable.content` is already markdown. Trigger browser download via `URL.createObjectURL(new Blob([content], {type: 'text/markdown'}))`. | Zero deps. The existing deliverable content IS the markdown. |
| **HTML** | Convert markdown to HTML using the existing `react-markdown` render pipeline, or use a lightweight `marked` conversion. Trigger download as `text/html`. | `marked` is 40KB if needed; check if `react-markdown`'s internal remark processor can output HTML string directly (it can via `unified().use(remarkGfm).use(rehype...).stringify()`). |
| **CSV** | Map tabular deliverable data to comma-separated strings. Native JS, no library. | Only for spreadsheet-type deliverables. |

---

## Artifacts Panel: No New UI Libraries Needed

The artifacts panel itself requires no new library installs:

| Feature | Implementation | Uses |
|---------|---------------|------|
| Panel layout (chat + artifacts side-by-side) | CSS Grid / Flexbox with a resizable splitter | Native CSS or a tiny custom ResizeObserver hook |
| Markdown document preview | Already rendering with `react-markdown` + `rehype-highlight` + `remark-gfm` | Existing stack |
| Code artifact preview | Already have `highlight.js` and syntax highlighting | Existing stack |
| Chart artifact preview | Already have `recharts` | Existing stack |
| Table artifact preview | Render markdown tables via `remark-gfm` | Existing stack |
| Document type detection | Parse XML `<deliverable type="...">` attribute (already extracting deliverables) | Existing XML parser |
| Inline document editing | shadcn `textarea` toggled by an edit button | Already installed |
| Toolbar (export buttons, edit toggle) | shadcn `button` + `dropdown-menu` + lucide icons | Already installed |

**Resizable panel option:** `react-resizable-panels` by Brian Vaughn is the community standard for split-panel layouts with draggable dividers (~10KB). Consider it if the fixed-width split feels too rigid during implementation. Not a requirement upfront — start with a CSS-based split.

---

## shadcn/ui Components to Add (No npm Dependencies)

| Component | Command | Used By |
|-----------|---------|---------|
| `resizable` | `npx shadcn add resizable` | Split-panel layout for chat + artifacts (uses `react-resizable-panels` under the hood — shadcn adds it as a dep) |
| `tooltip` | `npx shadcn add tooltip` | Export button tooltips showing keyboard shortcuts |

**Already installed (relevant to v3.0):** button, card, dialog, dropdown-menu, popover, scroll-area, separator, sheet, tabs, textarea, badge, skeleton, switch

---

## Inline Commenting (Carrying from v2.0)

No library change. The v2.0 STACK.md recommendation stands:

- `Comment` Prisma model with `anchorStart` / `anchorEnd` character offsets
- Highlighted ranges rendered as `<mark>` elements in the document view
- shadcn `popover` for comment thread UI anchored to highlighted range
- Resolving a comment sets `resolved: true` in SQLite

The `Comment` model was already specified in v2.0 STACK.md schema additions. If it was added to the schema in v2.0, it already exists. If not, it needs adding as part of v3.0.

---

## Recommended Installation

```bash
# New npm dependencies for v3.0 (3 required, 1 conditional)
npm install docx @react-pdf/renderer exceljs

# Add react-hotkeys-hook only if panel-scoped shortcuts become necessary
npm install react-hotkeys-hook

# New shadcn components (copies source, installs react-resizable-panels as a dep)
npx shadcn add resizable tooltip
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `docx` 9.6.1 | `docxtemplater` | Template-first model doesn't fit structured data generation |
| `docx` 9.6.1 | `html-to-docx` | Last published 3 years ago, fidelity loss via HTML intermediate |
| `docx` 9.6.1 | `remark-docx` | Narrow use case (markdown-only), built on docx anyway |
| `@react-pdf/renderer` 4.3.2 | Puppeteer | 100MB+ binary, excessive for a local app |
| `@react-pdf/renderer` 4.3.2 | jsPDF | Coordinate-based, no CSS, bad for flowing text |
| `exceljs` 4.4.0 | SheetJS (xlsx npm) | Known CVEs (prototype pollution, ReDoS), stale npm version |
| `exceljs` 4.4.0 | `write-excel-file` | Limited formatting for professional spreadsheet output |
| `react-hotkeys-hook` | Custom hook (v2.0) | Adequate for v2.0; v3.0 panel-scoped shortcuts justify the upgrade |
| Native JS CSV | `papaparse` | Overkill for write-only CSV of structured data |
| `react-markdown` (existing) | Tiptap / Slate for preview | WYSIWYG editors are not document viewers; existing renderer is correct |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| SheetJS `xlsx` from npm | Prototype pollution + ReDoS CVEs in 0.18.5; current 0.20.3 not on npm | `exceljs` |
| `puppeteer` / `playwright` | ~100MB binary dependency just for PDF; no benefit in a local app | `@react-pdf/renderer` |
| Tiptap / ProseMirror / Slate | v3.0 still doesn't need WYSIWYG editing. Artifacts panel shows rendered preview + togglable textarea. Comments are character-offset based, not editor-embedded. | Custom textarea + `react-markdown` |
| `papaparse` | Only needed for CSV parsing; we only write CSV | Native `Array.join()` |
| `react-resizable-panels` directly | shadcn `resizable` component wraps it and installs it — use shadcn | `npx shadcn add resizable` |
| `marked` | `unified` (underlying `react-markdown`) can output HTML string; avoid adding another markdown processor | Existing remark/rehype pipeline |
| Rich text editors for inline commenting | Comments are stored as character offsets in the existing `Comment` model, rendered as `<mark>` highlights | Popover + textarea (existing) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `docx` ^9.6.1 | Node.js ≥14, browser | No React peer dep. Pure ESM. Works in Next.js API routes and client components. |
| `@react-pdf/renderer` ^4.3.2 | React ≥16.8, React 19 (since v4.1.0), Next.js ≥14.1.1 | Must use `'use client'` + dynamic import (`ssr: false`) in App Router. Add to `serverExternalPackages` for server-side use. |
| `exceljs` ^4.4.0 | Node.js ≥8, no browser support | Server-side only (Next.js API route). Do not import in client components — it uses Node.js stream APIs. |
| `react-hotkeys-hook` ^5.2.4 | React ≥16.8, React 19 | Pure client-side hook. No SSR concerns. |

---

## Dependency Budget

| Category | Packages | Estimated Bundle Impact |
|----------|----------|------------------------|
| .docx generation | `docx` | ~180KB gzipped (runs in API route — no client bundle impact) |
| PDF generation | `@react-pdf/renderer` | ~280KB gzipped (loaded client-side via dynamic import — only when export triggered) |
| .xlsx generation | `exceljs` | ~140KB gzipped (runs in API route — no client bundle impact) |
| Keyboard shortcuts | `react-hotkeys-hook` | ~8KB gzipped |
| shadcn resizable | via shadcn add | ~10KB gzipped (react-resizable-panels) |
| **Total new client bundle** | | **~298KB gzipped** (PDF only on demand via dynamic import) |
| **Total new server deps** | | docx + exceljs run in API routes, 0 client impact |

---

## Sources

- [docx npm package](https://www.npmjs.com/package/docx) — verified version 9.6.1, 2026-03-16
- [docx.js.org official docs](https://docx.js.org/) — API reference for headings, tables, styling
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — verified version 4.3.2, 2026-03-16
- [react-pdf compatibility docs](https://react-pdf.org/compatibility) — React 19 support confirmed since v4.1.0, Next.js 14.1.1+ required
- [exceljs npm](https://www.npmjs.com/package/exceljs) — verified version 4.4.0, maintenance status reviewed
- [SheetJS security CVEs (Snyk)](https://snyk.io/vuln/npm:xlsx) — prototype pollution documented, reason to avoid npm xlsx
- [react-hotkeys-hook npm](https://www.npmjs.com/package/react-hotkeys-hook) — verified version 5.2.4, 2026-03-16
- [nutrient.io JS PDF library comparison 2026](https://www.nutrient.io/blog/top-js-pdf-libraries/) — puppeteer vs react-pdf tradeoffs
- [Mammoth.js (already installed)](https://www.npmjs.com/package/mammoth) — mammoth ^1.11.0 already in project for potential .docx reading

---

*Stack research for: OneWave AI Digital Agency v3.0 — Document Workspace*
*Researched: 2026-03-16*
