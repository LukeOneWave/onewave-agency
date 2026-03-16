# Architecture Research

**Domain:** Document Workspace — artifacts panel + rich preview + multi-format export integration into existing Next.js AI agency app (v3.0)
**Researched:** 2026-03-16
**Confidence:** HIGH (direct codebase analysis + verified library sources)

---

## System Overview

### Current Chat Layout (v2.0 Baseline)

```
AppShell (Sidebar + Header + max-w-7xl p-6 main wrapper)
  └── ChatPage (flex col, h-full)
        ├── TopBar (agent name, ProjectSelector, ModelSelector)
        ├── MessageList (flex-1, overflow)
        │    └── MessageBubble
        │         └── AssistantContent
        │              ├── ReactMarkdown (plain text segments)
        │              └── Deliverable block (per <deliverable> tag)
        │                   ├── InlineEditor
        │                   ├── ReviewPanel (approve/revise)
        │                   ├── DeliverableProjectLink
        │                   └── DiffViewer
        └── ChatInput
```

The critical issue for v3.0: `AppShell` wraps all pages in `max-w-7xl p-6` via `<main className="flex-1 overflow-y-auto"><div className="mx-auto max-w-7xl p-6">`. The artifacts panel needs full viewport width. A per-route segment layout bypasses that wrapper for the chat route only.

### Target Chat Layout (v3.0)

```
AppShell (Sidebar + Header — unchanged)
  └── Chat segment layout (h-full overflow-hidden — bypasses global padding)
        └── ChatPage (ResizablePanelGroup horizontal)
              ┌─────────────────────────────┬──────────────────────────┐
              │  Chat Panel (55% default)    │  Artifacts Panel (45%)   │
              │                             │                           │
              │  TopBar                     │  Panel header + tabs      │
              │  MessageList                │  Deliverable list/tabs    │
              │    └── MessageBubble        │  DocumentPreview          │
              │         (click → activate   │  ExportBar                │
              │          artifact)          │  CommentThread            │
              │  ChatInput                  │  (collapsible)            │
              └─────────────────────────────┴──────────────────────────┘
                         ResizableHandle (draggable divider)
```

---

## Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|----------------|-----------------|
| `ChatPage` | Wraps chat + artifacts panels in ResizablePanelGroup | **Modified** |
| `app/chat/[sessionId]/layout.tsx` | Bypasses global `max-w-7xl p-6` wrapper for chat route | **New** |
| `ArtifactsPanel` | Right panel shell: tabs, deliverable selector, preview area, export bar | **New** |
| `DocumentPreview` | Renders active deliverable as rich preview (markdown, table, code) | **New** |
| `DocumentTypeIcon` | Icon + label badge showing inferred document type | **New** |
| `ExportBar` | Export format buttons triggering download functions | **New** |
| `CommentThread` | Comment list + add comment form in artifacts panel | **New** |
| `KeyboardShortcutHandler` | Keydown listener for review workflow shortcuts (A/R/N/P) | **New** |
| `store/artifacts.ts` | Zustand store: active deliverable, panel state, comment visibility | **New** |
| `lib/document-type.ts` | Heuristic content classifier returning DocumentType | **New** |
| `lib/export/exportDocx.ts` | Markdown → .docx Blob using `docx` library | **New** |
| `lib/export/exportXlsx.ts` | Markdown tables → .xlsx Blob using SheetJS | **New** |
| `lib/export/exportMarkdown.ts` | Markdown → .md file and Markdown → HTML string | **New** |
| `app/api/export/pdf/route.ts` | Server-side PDF generation using jsPDF | **New** |
| `app/api/deliverables/[id]/comments/route.ts` | GET/POST comments for a deliverable | **New** |
| `deliverableService` | Add `createComment`, `getComments`, `updateComment`, `deleteComment` | **Modified** |
| `app/api/deliverables/[id]/route.ts` | Add `docType` update PATCH path | **Modified** |
| `MessageBubble` | Add onClick to deliverable blocks to activate artifact panel | **Modified** |
| `InlineEditor` | Sync saved content to artifacts store (no second network call) | **Modified** |
| `prisma/schema.prisma` | Add `docType` to Deliverable; add `DeliverableComment` model | **Modified** |
| `types/chat.ts` | Add `DocumentType`, `DeliverableComment` types | **Modified** |
| `components/ui/resizable.tsx` | shadcn resizable wrapper (install via `shadcn add resizable`) | **New** |

---

## Recommended Project Structure

New files only (existing structure unchanged):

```
src/
├── app/
│   ├── chat/
│   │   └── [sessionId]/
│   │       ├── layout.tsx             # NEW: bypasses global padding
│   │       └── page.tsx               # Unchanged
│   └── api/
│       ├── deliverables/
│       │   └── [id]/
│       │       ├── route.ts            # Modified: add docType PATCH path
│       │       ├── versions/route.ts   # Existing (unchanged)
│       │       └── comments/
│       │           └── route.ts        # NEW: GET/POST/PATCH/DELETE comments
│       └── export/
│           └── pdf/
│               └── route.ts            # NEW: server-side PDF generation
│
├── components/
│   ├── chat/
│   │   ├── ArtifactsPanel.tsx          # NEW: right panel shell
│   │   ├── DocumentPreview.tsx         # NEW: rich preview renderer
│   │   ├── DocumentTypeIcon.tsx        # NEW: icon + badge
│   │   ├── ExportBar.tsx               # NEW: export buttons
│   │   ├── CommentThread.tsx           # NEW: comment list + form
│   │   └── KeyboardShortcutHandler.tsx # NEW: A/R/N/P shortcuts
│   └── ui/
│       └── resizable.tsx               # NEW: shadcn resizable component
│
├── lib/
│   ├── document-type.ts                # NEW: content heuristic classifier
│   └── export/
│       ├── exportDocx.ts               # NEW: .docx via `docx` library
│       ├── exportXlsx.ts               # NEW: .xlsx via SheetJS
│       ├── exportMarkdown.ts           # NEW: .md and .html output
│       └── exportPdf.ts               # NEW: client wrapper for /api/export/pdf
│
├── store/
│   └── artifacts.ts                    # NEW: active artifact + panel state
│
└── types/
    └── chat.ts                         # Modified: add DocumentType, DeliverableComment
```

### Structure Rationale

- **`lib/export/`** — Export logic is pure computation (no React), belongs in lib not components. Each format is a separate module so they tree-shake independently and can be tested without HTTP.
- **`store/artifacts.ts`** — Separate Zustand store keeps `chat.ts` focused on streaming/messages. The artifacts panel has its own concerns (active deliverable, panel state, comment visibility) that have no business in the chat store.
- **`app/api/export/pdf/route.ts`** — PDF runs server-side because client-side html2canvas produces image-only (non-searchable) PDFs. A server API route with jsPDF produces proper text-selectable PDFs from the markdown AST.
- **`app/chat/[sessionId]/layout.tsx`** — Next.js App Router segment layouts receive `children` inside the parent's `<main>` element but bypass inner wrapper divs. This cleanly opts the chat route out of `max-w-7xl p-6` without touching AppShell.

---

## Architectural Patterns

### Pattern 1: Chat Route Escapes Global Padding via Segment Layout

**What:** The root `layout.tsx` wraps all content in `max-w-7xl p-6`. Add a `layout.tsx` inside `app/chat/[sessionId]/` that renders `{children}` in a full-height container. Next.js composes layouts, so the segment layout receives the children after `AppShell`'s `<main>` element but before the `max-w-7xl` div — that div simply never exists for this route.

**When to use:** Any route requiring custom viewport-filling layout diverging from the global shell.

**Trade-offs:** The chat route renders its own sizing. AppShell still provides Sidebar and Header correctly.

```typescript
// src/app/chat/[sessionId]/layout.tsx  (NEW)
export default function ChatSessionLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-hidden">{children}</div>;
}
```

Note: `AppShell` renders `<main className="flex-1 overflow-y-auto">`. This segment layout sits inside that `main` and fills it. The `<div className="mx-auto max-w-7xl p-6">` in `AppShell` is replaced by this layout for the chat route — actually, looking at the code, `AppShell` renders children directly inside `<div className="mx-auto max-w-7xl p-6"><PageTransition>`. A segment layout cannot remove that parent div. The fix is to make `ChatPage` use negative margins to break out, or — preferably — move the padding div inside `PageTransition` so segment layouts can override it. The cleanest solution: add an optional `fullViewport` prop to `AppShell` triggered by the chat route, or simply adjust the chat route's `page.tsx` to pass `className="h-full overflow-hidden -m-6"` to compensate for the parent padding.

**Confidence:** HIGH for the segment layout approach. The exact margin-override technique needs implementation validation.

### Pattern 2: Zustand Artifacts Store as Single Source of Truth for Panel State

**What:** A dedicated `artifacts` store holds the active deliverable ID, its content snapshot (avoiding refetch), panel open/collapsed state, and whether comments are visible. Components communicate panel focus via store actions.

**When to use:** Multiple components must coordinate around the active artifact — `MessageBubble` sets it on click, `ArtifactsPanel` reads it to render the preview, `ExportBar` reads content for export, `KeyboardShortcutHandler` navigates it.

**Trade-offs:** Adds a store, but keeps `chat.ts` focused on streaming. Cross-store coordination (shortcuts calling `chat.ts` approve actions) is explicit and auditable.

```typescript
// src/store/artifacts.ts
interface ArtifactsState {
  activeDeliverableId: string | null;
  activeContent: string | null;
  activeDocType: DocumentType | null;
  panelOpen: boolean;
  commentsVisible: boolean;

  setActiveDeliverable: (id: string, content: string, docType: DocumentType) => void;
  clearActive: () => void;
  togglePanel: () => void;
  toggleComments: () => void;
  updateContent: (content: string) => void; // sync from InlineEditor on save
}
```

### Pattern 3: Document Type Inferred at Parse Time, Stored on Deliverable

**What:** When `deliverableService.upsertStatus()` creates a deliverable, run a heuristic classifier on the content to set `docType`. The classifier examines: markdown table density, heading count, code fence count, list density, and presence of key-value patterns.

**When to use:** Must be set when the deliverable is first persisted — the `done` SSE event triggers deliverable creation, which is the right time to classify.

**Trade-offs:** Rule-based classification handles common cases but will misclassify edge cases. The user can override via a dropdown in the artifacts panel UI. No LLM call needed — speed and predictability matter here.

```typescript
// src/lib/document-type.ts
export type DocumentType =
  | 'business-doc'
  | 'technical-spec'
  | 'creative'
  | 'spreadsheet'
  | 'code'
  | 'generic';

export function inferDocumentType(content: string): DocumentType {
  const tableRows = (content.match(/^\|.+\|$/gm) ?? []).length;
  const headings = (content.match(/^#{1,3} /gm) ?? []).length;
  const codeBlocks = (content.match(/```/g) ?? []).length / 2;
  const listItems = (content.match(/^[-*] /gm) ?? []).length;

  if (tableRows > 3) return 'spreadsheet';
  if (codeBlocks >= 2) return 'technical-spec';
  if (headings >= 4 && listItems >= 4) return 'business-doc';
  if (content.length > 500 && headings <= 2 && listItems <= 2) return 'creative';
  return 'generic';
}
```

### Pattern 4: Export as Client-Side Pure Functions (except PDF)

**What:** docx, xlsx, csv, markdown, and html exports are pure client-side functions in `lib/export/`. They accept a content string and trigger a browser download. PDF uses a POST to `/api/export/pdf` because server-side jsPDF produces a text-selectable PDF (not an image).

**When to use:** All format exports. Dynamic import the `docx` and `xlsx` libraries so their ~600KB bundle weight only loads when the user actually clicks Export.

**Trade-offs:** Dynamic import adds a small delay on first use. For a local app with a warm server, this is imperceptible.

```typescript
// src/lib/export/exportDocx.ts
export async function exportDocx(content: string, filename: string): Promise<void> {
  const { Document, Packer, Paragraph, HeadingLevel } = await import('docx');
  // parse markdown lines → Paragraph/Heading nodes
  const doc = new Document({ sections: [{ children: buildParagraphs(content) }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${filename}.docx`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Pattern 5: Inline Comments Stored with Character Offset Anchors

**What:** A new `DeliverableComment` Prisma model stores: `deliverableId`, `anchor` (JSON string with `{start, end}` character offsets — null for general comments), `text`, `resolved`. Character offsets reference the current `Deliverable.content` at comment creation time.

**When to use:** v3.0 inline commenting feature. The anchor approach is simpler than XPath or line-number anchoring and sufficient for single-user markdown documents.

**Trade-offs:** Offsets go stale when content is edited. For a single-user local tool this is acceptable — comment anchors may shift after edits but general comments remain valid. If anchor precision becomes important, snapshot the content version number alongside the anchor.

---

## Schema Changes Required

Two additions to `prisma/schema.prisma`:

```prisma
// Modified: Deliverable — add docType column and comments relation
model Deliverable {
  // ... all existing fields unchanged ...
  docType   String?              // 'business-doc' | 'technical-spec' | 'creative' | 'spreadsheet' | 'code' | 'generic'
  comments  DeliverableComment[]
}

// New model: DeliverableComment
model DeliverableComment {
  id            String      @id @default(cuid())
  deliverableId String
  deliverable   Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  anchor        String?     // JSON: { start: number, end: number } — null = general comment
  text          String
  resolved      Boolean     @default(false)
  createdAt     DateTime    @default(now())
}
```

Apply with `npx prisma db push` (no migration files needed — single-user local app using `db push` pattern already established in the project).

---

## New API Routes Required

| Route | Method | Purpose | Notes |
|-------|--------|---------|-------|
| `PATCH /api/deliverables/[id]` | PATCH | **Modified** — add `{ docType }` path alongside existing content/status/project paths | Extend existing route handler |
| `GET /api/deliverables/[id]/comments` | GET | Fetch all comments for a deliverable | New sub-route |
| `POST /api/deliverables/[id]/comments` | POST | Create comment `{ anchor?, text }` | New sub-route |
| `PATCH /api/deliverables/[id]/comments/[commentId]` | PATCH | Resolve/unresolve or edit comment text | New sub-route |
| `DELETE /api/deliverables/[id]/comments/[commentId]` | DELETE | Delete a comment | New sub-route |
| `POST /api/export/pdf` | POST | Server-side PDF generation `{ content, filename }` → returns `application/pdf` | New route |

The existing `GET /api/deliverables/[messageId]` response automatically includes `docType` once the column is added to the Prisma model — no route change needed.

---

## Data Flows

### Deliverable Activation Flow (MessageBubble → ArtifactsPanel)

```
Claude streams response
    ↓
SSE "done" event → messageId assigned to last assistant message
    ↓
MessageBubble fetches GET /api/deliverables/[messageId]
    → returns [{ id, index, status, docType, content, ... }]
    ↓
deliverableRecords state set in MessageBubble
    ↓
User clicks a deliverable block in chat
    ↓
artifacts store: setActiveDeliverable(record.id, record.content, record.docType)
    ↓
ArtifactsPanel reads { activeDeliverableId, activeContent, activeDocType }
    → DocumentPreview renders with docType-aware layout
    → ExportBar renders format options
    → CommentThread fetches GET /api/deliverables/[id]/comments
```

No second network call to get content — `Deliverable.content` is already in the initial `GET /api/deliverables/[messageId]` response.

### Export Flow (client-side formats)

```
User clicks "Export DOCX" in ExportBar
    ↓
ExportBar reads activeContent + activeDocType from artifacts store
    ↓
Calls lib/export/exportDocx(content, filename)
    ↓
Dynamic import of `docx` library (first use only)
    ↓
Build Document AST from markdown content
    ↓
Packer.toBlob() → Blob
    ↓
triggerDownload(blob, 'filename.docx') → browser downloads file
```

### Export Flow (PDF)

```
User clicks "Export PDF" in ExportBar
    ↓
ExportBar calls lib/export/exportPdf(content, filename)
    ↓
POST /api/export/pdf { content, filename }
    ↓
API route: parse markdown → build jsPDF document
    ↓
Return Response with Content-Type: application/pdf
    ↓
Client: URL.createObjectURL(blob) → trigger download
```

### Comment Creation Flow

```
User selects text range in DocumentPreview
    ↓
CommentThread captures window.getSelection() → compute char offsets
    ↓
User types comment text → POST /api/deliverables/[id]/comments
    { anchor: { start, end }, text }
    ↓
deliverableService.createComment() → DeliverableComment record
    ↓
CommentThread refetches → list updates
    ↓
DocumentPreview highlights anchored range (span with highlight class)
```

### Keyboard Shortcut Flow

```
KeyboardShortcutHandler mounts inside ChatPage
    ↓
document.addEventListener('keydown', handler)
    ↓
Guard: if (activeElement is input/textarea/[contenteditable]) → skip
    ↓
Key 'a' → chatStore.approveDeliverable(activeMessageId, activeDeliverableIndex)
Key 'r' → open revision feedback inline
Key 'n' → artifacts store: navigate to next deliverable in session
Key 'p' → artifacts store: navigate to previous deliverable in session
```

### InlineEditor ↔ DocumentPreview Content Sync

```
User edits deliverable in InlineEditor (chat column)
    ↓
InlineEditor.handleSave() → PATCH /api/deliverables/[messageId] { content }
    + POST /api/deliverables/[id]/versions { content }
    ↓
On success: artifacts store: updateContent(draft)
    ↓
DocumentPreview re-renders with updated content
    (no second network fetch — content comes from store)
```

---

## Integration Points

### ArtifactsPanel ↔ Chat Panel (ResizablePanelGroup)

`ChatPage` wraps both columns in `ResizablePanelGroup` with `direction="horizontal"`. The artifacts panel uses `collapsible` + `collapsedSize={0}` props from `react-resizable-panels` v4. Panel collapse state syncs to the artifacts Zustand store so a "Show Artifacts" button in the chat column can re-expand it.

Install shadcn's resizable: `npx shadcn add resizable`. This adds `src/components/ui/resizable.tsx` wrapping `react-resizable-panels`. The package is not yet in `package.json`.

### MessageBubble ↔ ArtifactsPanel (via artifacts store)

Deliverable blocks in `MessageBubble` get an `onClick` handler calling `artifacts.setActiveDeliverable(record.id, record.content, record.docType ?? 'generic')`. The panel auto-opens on first click if collapsed. No prop drilling — both components are decoupled via the store.

### InlineEditor ↔ DocumentPreview (content sync)

After `InlineEditor.handleSave()` persists content to the API, it calls `artifacts.updateContent(draft)`. `DocumentPreview` reads `activeContent` from the store and re-renders. Content stays fresh without a second GET call.

### Export Functions ↔ Deliverable Content

`ExportBar` receives `content` and `docType` directly from the artifacts store via `useArtifactsStore()`. No prop threading. Export functions are invoked client-side (or via API for PDF) using the cached content string.

### KeyboardShortcutHandler ↔ Chat Store + Artifacts Store

Reads `activeDeliverableId` from artifacts store to know which deliverable to act on. Calls `approveDeliverable` / `requestRevision` from the existing `chat` store (already handles API calls + status updates). Mounts inside `ChatPage` — not in `AppShell` — so bindings are scoped to the chat route and don't leak to other pages.

---

## Anti-Patterns

### Anti-Pattern 1: Putting the Artifacts Panel in AppShell

**What people do:** Add the panel to the global layout so it's "available everywhere."
**Why it's wrong:** Dashboard, Projects, Agents, Orchestration have no deliverables to preview. A global panel couples AppShell to chat context and bloats every page's bundle.
**Do this instead:** Keep the panel inside `ChatPage`. The segment layout handles the viewport override cleanly.

### Anti-Pattern 2: Client-Side PDF via html2canvas

**What people do:** Use html2canvas + jsPDF client-side for zero-server PDF.
**Why it's wrong:** html2canvas produces an image-based PDF — no text selection, no search, large file size, browser-dependent rendering. For a document workspace where PDF is a first-class output format, this is unacceptable quality.
**Do this instead:** `POST /api/export/pdf` API route using jsPDF server-side, building the PDF from the markdown content's parsed structure. Text remains selectable.

### Anti-Pattern 3: Storing docType on Message Instead of Deliverable

**What people do:** Classify the full message and attach `docType` to `Message`.
**Why it's wrong:** One message can contain multiple `<deliverable>` blocks of different types. The type belongs on the individual `Deliverable` record.
**Do this instead:** `docType` column on `Deliverable` model, inferred per block.

### Anti-Pattern 4: Refetching Deliverable Content in ArtifactsPanel

**What people do:** Trigger a `GET /api/deliverables/[id]` call when the user clicks a deliverable to load content for the preview pane.
**Why it's wrong:** The content is already in the `MessageBubble`'s `deliverableRecords` state (from the initial fetch). A second fetch causes flicker and is redundant.
**Do this instead:** `setActiveDeliverable(id, content, docType)` — pass content directly from the already-fetched record into the artifacts store. Zero extra requests.

### Anti-Pattern 5: Keyboard Shortcuts Without an Input Guard

**What people do:** Add global `document` keydown listeners without checking whether a form field has focus.
**Why it's wrong:** Pressing 'A' to approve while typing in the chat input would both fire the shortcut and insert the letter. The existing `AppShell` keyboard handler for Cmd+K already handles this correctly — replicate that guard.
**Do this instead:**

```typescript
function handler(e: KeyboardEvent) {
  const tag = document.activeElement?.tagName;
  const isEditable = document.activeElement?.getAttribute('contenteditable');
  if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return;
  // ... handle shortcut
}
```

### Anti-Pattern 6: Loading Export Libraries at Page Load

**What people do:** Import `docx` and `xlsx` at the top of the export module files.
**Why it's wrong:** `docx` is ~600KB and `xlsx` is ~400KB. Loading them at page load bloats the initial bundle unnecessarily — they're only needed when the user clicks an export button.
**Do this instead:** Dynamic `import()` inside each export function. The library loads once on first use, then is cached by the browser.

---

## Build Order

Dependencies drive this order — each step unlocks the next:

**Step 1 — Schema + shadcn resizable install**
- `prisma db push` with `docType` on Deliverable + `DeliverableComment` model
- `npx shadcn add resizable` → adds `components/ui/resizable.tsx` + installs `react-resizable-panels`
- No UI yet, but the data contract is set

**Step 2 — `lib/document-type.ts` + `store/artifacts.ts`**
- Pure function, no dependencies. Write and unit-test in isolation.
- Zustand store: shape defined, all actions stubbed. No UI consumers yet.

**Step 3 — ChatPage layout refactor**
- Add `app/chat/[sessionId]/layout.tsx` segment
- Add `ResizablePanelGroup` to `ChatPage` with placeholder right panel
- Verify split layout renders correctly before building panel content

**Step 4 — `ArtifactsPanel` + `DocumentPreview`**
- Panel shell with tabs (Preview / Comments)
- `DocumentPreview` renders content from `activeContent` in artifacts store
- Wire `MessageBubble` onClick to `setActiveDeliverable`
- Panel toggle (collapse/expand)

**Step 5 — `ExportBar` + `lib/export/` modules**
- `exportMarkdown.ts` (trivial — just download the string)
- `exportDocx.ts` (docx library)
- `exportXlsx.ts` (SheetJS)
- `exportPdf.ts` client wrapper + `/api/export/pdf` route
- `ExportBar` UI with buttons for each format

**Step 6 — `CommentThread` + comment API routes**
- `deliverableService` comment methods
- `/api/deliverables/[id]/comments/route.ts`
- `CommentThread` component (list + add comment form)
- Anchor highlighting in `DocumentPreview`

**Step 7 — `KeyboardShortcutHandler`**
- Mounts inside `ChatPage`
- A/R for approve/revise, N/P for navigate deliverables
- Input guard using existing AppShell pattern

**Step 8 — docType classification wired into save path**
- Modify `deliverableService.upsertStatus()` to call `inferDocumentType()` on content and set `docType` on create
- Add `PATCH /api/deliverables/[id]` path for manual type override
- `DocumentTypeIcon` component in panel header

---

## Sources

- Direct codebase analysis: `/Users/luke/onewave-agency/src/` (12,504 LOC TypeScript, Prisma schema, Zustand stores, API routes)
- shadcn resizable (built on react-resizable-panels v4): https://ui.shadcn.com/docs/components/resizable
- react-resizable-panels npm: https://www.npmjs.com/package/react-resizable-panels
- docx library v9.6.1 (browser + Node): https://www.npmjs.com/package/docx
- SheetJS community edition (XLSX client-side): https://docs.sheetjs.com/docs/demos/frontend/react/
- Server-side PDF in Next.js API routes (jsPDF): https://dev.to/jordykoppen/turning-react-apps-into-pdfs-with-nextjs-nodejs-and-puppeteer-mfi
- html2canvas client-side PDF limitations: https://ekoopmans.github.io/html2pdf.js/
- Next.js App Router nested layouts: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates

---

*Architecture research for: OneWave AI Agency v3.0 Document Workspace*
*Researched: 2026-03-16*
