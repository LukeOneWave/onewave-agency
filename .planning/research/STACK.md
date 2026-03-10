# Technology Stack -- v2.0 Additions

**Project:** OneWave AI Digital Agency v2.0
**Researched:** 2026-03-10
**Scope:** NEW dependencies only. Existing stack (Next.js 16.1.6, Prisma 7, SQLite, Zustand, shadcn/ui, Tailwind v4, next-themes, sonner, etc.) is validated and unchanged.

## Existing Stack (Validated, No Changes)

| Technology | Version | Status |
|------------|---------|--------|
| Next.js | 16.1.6 | Keep |
| React | 19.2.3 | Keep |
| Prisma | 7.4.2 | Keep |
| SQLite (better-sqlite3) | 12.6.2 | Keep |
| Zustand | 5.0.11 | Keep |
| Tailwind CSS | v4 | Keep |
| shadcn/ui | 4.0.2 (CLI, base-nova style) | Keep, add components |
| next-themes | 0.4.6 | Keep (already installed for dark/light toggle) |
| sonner | 2.0.7 | Keep |
| lucide-react | 0.577.0 | Keep |
| Zod | 4.3.6 | Keep |
| tw-animate-css | 1.4.0 | Keep |
| react-markdown + rehype-highlight + remark-gfm | installed | Keep |
| Recharts | 3.8.0 | Keep |
| @anthropic-ai/sdk | 0.78.0 | Keep (SSE streaming already built) |

## New npm Dependencies (4 packages total)

### 1. motion -- Animations, Transitions, Polish

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `motion` | ^12.35.2 | Page transitions, layout animations, loading states, drag feedback | The de facto React animation library (rebranded from Framer Motion). Provides `AnimatePresence` for exit animations (CSS cannot animate unmounting components), `layout` prop for smooth Kanban card reflows, spring physics for drag feedback, and skeleton-to-content transitions. |

**Why needed:** The project has `tw-animate-css` for simple CSS animations, but v2.0 requires capabilities CSS cannot provide:
- **AnimatePresence**: Animate components as they unmount (page transitions, removing Kanban cards)
- **Layout animations**: Smooth reflow when cards move between Kanban columns
- **Shared layout**: Page-to-page content transitions in App Router
- **Spring physics**: Natural-feeling drag-and-drop feedback with dnd-kit
- **Orchestrated sequences**: Staggered skeleton-to-content reveals

**Why not react-spring:** Motion has better Next.js App Router integration, simpler declarative API (`animate` prop vs imperative hooks), and AnimatePresence has no react-spring equivalent.

**Confidence:** HIGH -- Motion v12.35.2 published within 24 hours of research. 12M+ weekly npm downloads. Active development.

### 2. @dnd-kit -- Kanban Drag and Drop

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@dnd-kit/core` | ^6.3.1 | Drag-and-drop primitives | De facto React DnD standard. Lightweight (~10kb), zero deps, accessible (keyboard + screen reader), hook-based. Well-documented Kanban pattern with shadcn/ui + Tailwind. |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable lists within Kanban columns | Required companion for reordering items within columns. Provides `useSortable` hook and `SortableContext`. |
| `@dnd-kit/utilities` | ^3.2.2 | CSS transform utilities | Helper for transform styles on dragged items. Tiny utility package. |

**Used for:** Task Kanban board (To Do / In Progress / Review / Done) and orchestration review board (mission deliverables).

**Why not @hello-pangea/dnd:** dnd-kit is more actively maintained, smaller bundle, better composability with shadcn/ui. hello-pangea/dnd is a fork of the deprecated react-beautiful-dnd with legacy API patterns.

**Why not native HTML5 DnD:** No keyboard accessibility, poor mobile support, no animation control.

**Confidence:** HIGH -- Community standard. Multiple reference implementations exist for dnd-kit + shadcn/ui + Tailwind Kanban boards (including a Jan 2026 tutorial from Marmelab).

### 3. diff + react-diff-viewer-continued -- Deliverable Diff View

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `diff` | ^8.0.3 | Text diffing engine | The foundational JS diff library (jsdiff). v8 ships TypeScript types natively (no @types/diff needed). Provides `diffLines`, `diffWords`, `diffChars` for flexible comparison granularity. 8,100+ npm dependents. |
| `react-diff-viewer-continued` | ^4.1.2 | React diff rendering UI | Actively maintained fork of react-diff-viewer. Split and unified views, syntax highlighting, line numbers, word-level diffs. Takes `oldValue`/`newValue` strings directly -- perfect for comparing deliverable revision content. v4.1.2 published March 5, 2026. |

**Integration:** Query two Deliverable records (original message content and revised version). Pass content strings as `oldValue`/`newValue` props. The viewer renders a GitHub-style diff with syntax highlighting.

**Why not diff2html:** Designed for git unified diff format. Our use case is comparing two plain text strings (deliverable versions), not git patches. react-diff-viewer-continued takes strings directly.

**Why not git-diff-view:** Oriented toward git diff output format. More performant for large diffs but overkill for deliverable text comparison. Less React-specific ecosystem support.

**Confidence:** HIGH -- `diff` is the standard JS diffing library. react-diff-viewer-continued is the most actively maintained React diff component.

## shadcn/ui Components to Add (No New npm Dependencies)

These install via the shadcn CLI and copy source code into the project. They use Radix UI primitives already bundled with shadcn:

| Component | Command | Used By Feature |
|-----------|---------|----------------|
| `command` | `npx shadcn add command` | Global search (Cmd+K). Built on cmdk by pacocoursey. Provides CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem with fuzzy search and keyboard navigation. |
| `dialog` | `npx shadcn add dialog` | Modals for agent editor, confirmations, CommandDialog wrapper. |
| `skeleton` | `npx shadcn add skeleton` | Loading placeholders for production polish. |
| `switch` | `npx shadcn add switch` | Dark/light mode toggle, boolean settings. |
| `select` | `npx shadcn add select` | Agent editor (division picker), filters, sort controls. |
| `popover` | `npx shadcn add popover` | Inline comment threads anchored to deliverable text. |
| `context-menu` | `npx shadcn add context-menu` | Right-click actions on Kanban cards. |
| `progress` | `npx shadcn add progress` | Mission progress indicators. |
| `collapsible` | `npx shadcn add collapsible` | Session history date grouping. |

**Already installed (12 components):** avatar, badge, button, card, dropdown-menu, input, scroll-area, separator, sheet, tabs, textarea, tooltip

## What to Build Custom (No Libraries Needed)

### Inline Editing and Commenting

**Do NOT add a rich text editor (Tiptap, Slate, ProseMirror).** Deliverables are markdown/code strings stored in SQLite. Adding a full WYSIWYG editor is massive overkill.

**Implementation approach:**
- **Edit mode**: Toggle the existing rendered markdown view to a controlled `<textarea>` (shadcn textarea component already installed). Save edits back to the Deliverable content.
- **Comments**: New `Comment` Prisma model with character offset anchoring (`anchorStart`, `anchorEnd`). Render highlighted ranges in the markdown view. Click a highlight to open a shadcn `popover` with the comment thread.

**Why not Tiptap:** Tiptap's inline commenting is a Pro (paid) feature. The free tier does not include comments. Adding Tiptap for basic text editing when you already render markdown is architectural bloat. Tiptap is for Notion-like document editors, not for reviewing AI-generated deliverables.

**Why not Slate:** Same reasoning. Over-engineered for "click to edit this text, save it."

**Confidence:** HIGH -- Architectural decision based on the existing deliverable format (plain text strings).

### Keyboard Shortcuts

**Do NOT add react-hotkeys-hook or similar.** The shortcuts needed are:
- `j`/`k`: Navigate review items
- `a`: Approve deliverable
- `r`: Revise deliverable
- `Cmd+K`: Open search (handled by shadcn Command)
- `Escape`: Close modals/panels

This is a custom `useKeyboardShortcuts` hook (~50 lines):

```typescript
// hooks/useKeyboardShortcuts.ts
type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.metaKey ? `cmd+${e.key}` : e.key;
      shortcuts[key]?.(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
```

**Confidence:** HIGH -- Standard React pattern for <10 shortcuts.

### Session History

**No new dependencies.** The existing `ChatSession` model already has `createdAt`, `updatedAt`, related `messages`, and `agent`. Session history is a UI feature (new page/panel) backed by Prisma queries with cursor-based pagination. Group by date, show agent name and message count.

**Confidence:** HIGH -- Schema already supports this.

### Dark/Light Mode Toggle

**No new dependencies.** `next-themes` is already installed and the `ThemeProvider` is already configured in `src/components/providers/ThemeProvider.tsx` with `attribute="class"`, `enableSystem`, and `defaultTheme="dark"`. Implementation is just a shadcn `switch` or `dropdown-menu` calling `setTheme()` from the `useTheme` hook.

**Confidence:** HIGH -- Already 90% implemented.

### Custom Agents (Create/Edit)

**No new dependencies.** The `Agent` model already has `isCustom: Boolean @default(false)`. Custom agent creation is a form (shadcn input, textarea, select for division) that POSTs to an API route and creates an Agent record with `isCustom: true`. The system prompt field is already a text column. Add a `customConfig` JSON field if needed for additional agent settings.

**Confidence:** HIGH -- Schema supports it, just needs UI.

### Review Queue Widget

**No new dependencies.** Query `Deliverable` records where `status = "pending"`, join with `Message -> ChatSession -> Agent` to get context. Render as a shadcn card list on the dashboard.

**Confidence:** HIGH -- Pure query + UI.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Animations | `motion` | CSS-only (tw-animate-css) | Cannot animate unmounts, no layout animations |
| Animations | `motion` | `react-spring` | Worse Next.js integration, no AnimatePresence |
| Drag & Drop | `@dnd-kit` | `@hello-pangea/dnd` | Legacy API, larger bundle, less composable |
| Drag & Drop | `@dnd-kit` | `react-dnd` | Steeper learning curve, less accessible |
| Diff View | `react-diff-viewer-continued` | `diff2html` | Designed for git diffs, not string-to-string |
| Diff View | `react-diff-viewer-continued` | `git-diff-view` | Git-format oriented, overkill |
| Cmd+K | shadcn `command` (cmdk) | `kbar` | Not in shadcn ecosystem, extra styling work |
| Cmd+K | shadcn `command` (cmdk) | `react-cmdk` | Last published 3+ years ago, unmaintained |
| Inline Edit | Custom textarea | Tiptap | Comments are paid/Pro, massive overkill |
| Inline Edit | Custom textarea | Slate | Over-engineered for markdown editing |
| Shortcuts | Custom hook | `react-hotkeys-hook` | Unnecessary dep for <10 shortcuts |
| Data Fetching | Existing fetch + Zustand | `@tanstack/react-query` | Would create two state management patterns |

## What NOT to Add

| Library | Why Skip |
|---------|----------|
| Tiptap / Slate / ProseMirror | Deliverables are markdown strings, not rich documents. Comments is a paid Tiptap feature. |
| react-hotkeys-hook | Custom hook is simpler for <10 shortcuts |
| react-beautiful-dnd | Deprecated (Atlassian archived it) |
| @tanstack/react-query | Zustand + fetch already works; adding TQ creates two state management patterns |
| socket.io / ws | SSE already built and working; single-user app |
| Any auth library | Single-user local app, explicitly out of scope |
| date-fns / dayjs | Only needed if session history requires relative dates ("2 hours ago"). Use native `Intl.RelativeTimeFormat` first; add date-fns only if needed. |

## Installation Commands

```bash
# New npm dependencies (6 packages, ~60kb total gzipped)
npm install motion @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities diff react-diff-viewer-continued

# New shadcn/ui components (copies source code, no npm deps added)
npx shadcn add command dialog skeleton switch select popover context-menu progress collapsible
```

## Schema Additions Required

New Prisma models for v2.0 features (no new database dependencies -- still SQLite):

```prisma
model Comment {
  id            String      @id @default(cuid())
  deliverableId String
  deliverable   Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  anchorStart   Int         // Character offset start in deliverable content
  anchorEnd     Int         // Character offset end
  content       String      // Comment text
  resolved      Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      String   @default("active") // active | archived
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tasks       Task[]
}

model Task {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title           String
  description     String?
  status          String   @default("todo") // todo | in_progress | review | done
  assignedAgentId String?
  order           Int      @default(0) // For Kanban column ordering
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Extend existing Deliverable model:
// Add: comments Comment[] relation
// Add: version Int @default(1) -- for tracking revision versions
// Add: parentId String? -- link revised deliverable to original

// Extend existing Agent model:
// isCustom already exists
// Add: customConfig String? -- JSON blob for custom agent settings (tools, personality, etc.)
```

## Integration Points

| New Tech | Integrates With | How |
|----------|----------------|-----|
| `motion` | Next.js App Router | `AnimatePresence` wraps page content in `layout.tsx` for route transitions |
| `motion` | shadcn skeleton | Animate skeleton-to-content transitions via `animate` + `exit` props |
| `motion` | @dnd-kit | Use `motion.div` as DragOverlay for smooth drag animations |
| `@dnd-kit` | Zustand | Drag-end handlers update Zustand task store, persist via API to Prisma Task model |
| `@dnd-kit` | shadcn card | Kanban cards are shadcn Cards wrapped in `useSortable` |
| `react-diff-viewer-continued` | Deliverable model | Query two deliverable versions, pass content as `oldValue`/`newValue` |
| `diff` | react-diff-viewer-continued | Used internally by the viewer; also useful standalone for computing change stats |
| shadcn `command` | Prisma queries | `/api/search` endpoint queries agents, projects, sessions; results populate CommandItems |
| shadcn `command` | Custom shortcuts hook | `Cmd+K` opens CommandDialog; handled by the command component natively |
| next-themes (existing) | shadcn switch | Toggle calls `setTheme()` from `useTheme()` hook |
| Custom shortcuts hook | Zustand review store | `j`/`k` update selected index, `a`/`r` dispatch approve/revise actions |

## Dependency Budget Summary

| Category | New Packages | Estimated Bundle Impact |
|----------|-------------|----------------------|
| Animations | `motion` | ~30kb gzipped |
| Drag & Drop | `@dnd-kit/*` (3 pkgs) | ~10kb gzipped |
| Diff View | `diff` + `react-diff-viewer-continued` | ~20kb gzipped |
| **Total new npm deps** | **6 packages** | **~60kb gzipped** |
| shadcn components | 9 components (source code) | Tree-shaken, minimal |
| Custom code | 3 hooks/patterns | 0kb deps |

## Sources

- [Motion (Framer Motion) docs](https://motion.dev/docs/react) -- React animation library, v12.35.2
- [Motion changelog](https://motion.dev/changelog) -- Recent releases
- [dnd-kit official docs](https://dndkit.com/) -- Installation, API reference
- [dnd-kit + shadcn/ui + Tailwind Kanban example](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui)
- [Kanban with shadcn (Jan 2026)](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html)
- [react-diff-viewer-continued on npm](https://www.npmjs.com/package/react-diff-viewer-continued) -- v4.1.2
- [diff (jsdiff) on npm](https://www.npmjs.com/package/diff) -- v8.0.3
- [shadcn/ui Command component](https://ui.shadcn.com/docs/components/radix/command) -- cmdk integration
- [shadcn/ui Components list](https://ui.shadcn.com/docs/components) -- Full component catalog
- [shadcn/ui dark mode with next-themes](https://ui.shadcn.com/docs/dark-mode/next) -- Official docs
- [shadcn/ui CLI v4 (March 2026)](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) -- Latest CLI
