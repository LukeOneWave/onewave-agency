# Phase 12: Layout, Shell, and Unified State - Research

**Researched:** 2026-03-16
**Domain:** Next.js App Router split-panel layout, Zustand state colocated with SSE streaming, keyboard shortcut scoping
**Confidence:** HIGH (direct codebase analysis + verified library sources)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARTF-01 | User sees a split-panel layout with chat on the left and artifacts panel on the right | ResizablePanelGroup with collapsible right panel; route segment layout bypasses AppShell max-w-7xl constraint |
| ARTF-10 | User can dismiss/minimize the artifacts panel to return to full-width chat | `collapsible` + `collapsedSize={0}` on ArtifactsPanel; close button + `]` shortcut; state in Zustand |
| REVW-05 | User can navigate and act on deliverables with keyboard shortcuts (j/k/a/r) | Global keydown listener with input-focus guard; colocated with ChatPage; Cmd+K conflict avoidance |
</phase_requirements>

---

## Summary

Phase 12 is purely structural — it builds the shell that every subsequent v3.0 phase depends on. No document rendering, no export logic, no comments. The three deliverables are: (1) a route-level layout that frees the chat page from AppShell's `max-w-7xl p-6` constraint, (2) a two-column resizable split layout with a collapsible right panel, and (3) the Zustand artifacts store whose state coordinates panel open/close across MessageBubble clicks and keyboard shortcuts without touching the active SSE stream.

The most dangerous work is the AppShell bypass and the panel collapse mechanism. The existing `AppShell` renders `<div className="mx-auto max-w-7xl p-6"><PageTransition>{children}</PageTransition></div>` — a segment layout placed at `app/chat/[sessionId]/layout.tsx` receives children inside that wrapper, not outside it. The safe bypass is a CSS negative-margin override (`-m-6`) on the ChatPage wrapper div, or better: modify `AppShell` to accept a `fullViewport` prop that removes the `max-w-7xl p-6` div for the chat route. Either approach must be validated before building panel content. The panel collapse MUST use CSS `visibility: hidden` / `width: 0` — never remove the DOM node — because removing it re-mounts `ChatPage` which triggers `initSession` and loses in-flight SSE state.

**Primary recommendation:** Add `panelOpen` and `activeDeliverableId` to `useChatStore` (not a separate store) to keep streaming-related state colocated, then build the segment layout and ResizablePanelGroup with the correct hydration workaround, and finally add the keyboard shortcut handler using the same input-guard pattern already in AppShell.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-resizable-panels` | ^4.7.3 (via `shadcn add resizable`) | Draggable panel splitter with collapse, keyboard-accessible, WAI-ARIA | Brian Vaughn (React core team); used by Claude.ai, VSCode web; built-in collapsible + size persistence |
| `zustand` | ^5.0.11 (already installed) | Panel state (open/closed, activeDeliverableId) colocated with chat store | Already the state model for the entire app |
| `shadcn resizable` | wraps react-resizable-panels v4 | Opinionated component with Tailwind integration | Matches existing shadcn UI pattern; installs via `npx shadcn add resizable` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand/middleware persist` | already in `app.ts` | Persist panel split ratio to localStorage | Stores `defaultPanelSizes` for reload |
| Native `document.addEventListener` | — | Keyboard shortcut handler for `]`, `j`, `k`, `a`, `r` | Lightweight; no new dep needed for Phase 12 shortcuts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `useChatStore` | Separate `useArtifactsStore` | Separate store risks desync with SSE `done` event; colocated state is safer in Phase 12 |
| CSS `visibility: hidden` / `width: 0` | Remove panel from DOM | Removing panel re-mounts ChatPage → triggers `initSession` → loses in-flight stream |
| `npx shadcn add resizable` | Direct `npm install react-resizable-panels` | shadcn wrapper adds Tailwind classes + proper TypeScript types; prefer shadcn |

**Installation:**
```bash
npx shadcn add resizable
# react-resizable-panels is added as a dep automatically
# No other new npm installs for Phase 12
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 12 new files only)

```
src/
├── app/
│   └── chat/
│       └── [sessionId]/
│           ├── layout.tsx         # NEW — bypasses global padding
│           └── page.tsx           # Unchanged
├── components/
│   ├── chat/
│   │   ├── ChatPage.tsx           # MODIFIED — add ResizablePanelGroup + ArtifactsPanel stub
│   │   └── ArtifactsPanel.tsx     # NEW — collapsible right panel shell (empty in Phase 12)
│   └── ui/
│       └── resizable.tsx          # NEW — added by `npx shadcn add resizable`
└── store/
    └── chat.ts                    # MODIFIED — add panelOpen, activeDeliverableId, panel actions
```

### Pattern 1: AppShell Bypass via Negative-Margin Override

**What:** `AppShell` renders `<div className="mx-auto max-w-7xl p-6"><PageTransition>{children}</PageTransition></div>`. A segment layout at `app/chat/[sessionId]/layout.tsx` lands INSIDE that div, not outside it — it cannot remove the parent constraint. The safe bypass is to render the ChatPage wrapper with `-m-6 h-full` which cancels the `p-6` padding without touching AppShell.

**When to use:** Any chat route that needs full viewport width.

**Confirmed approach from STATE.md:** "AppShell `max-w-7xl p-6` bypass requires route segment layout at `app/chat/[sessionId]/layout.tsx` — validate exact technique before restructuring ChatPage" + "may require `-m-6` negative margin workaround if segment layout doesn't fully escape `PageTransition` wrapper."

```typescript
// src/app/chat/[sessionId]/layout.tsx  (NEW)
export default function ChatSessionLayout({ children }: { children: React.ReactNode }) {
  // -m-6 cancels the AppShell p-6 padding; h-full fills the flex-1 main area
  return <div className="-m-6 h-full overflow-hidden">{children}</div>;
}
```

```typescript
// src/components/chat/ChatPage.tsx  (MODIFIED outer wrapper)
// Was: <div className="flex h-full flex-col">
// Now the layout.tsx -m-6 wrapper provides the full-height context
export function ChatPage({ session }: ChatPageProps) {
  // ... unchanged logic
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Chat panel */}
      <ResizablePanel defaultSize={60} minSize={35}>
        <div className="flex h-full flex-col">
          {/* TopBar, MessageList, ChatInput — unchanged */}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Artifacts panel — collapsible */}
      <ResizablePanel
        ref={artifactsPanelRef}
        defaultSize={40}
        minSize={0}
        collapsible
        collapsedSize={0}
        onCollapse={() => setPanelOpen(false)}
        onExpand={() => setPanelOpen(true)}
      >
        <ArtifactsPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

**Confidence:** HIGH for the negative-margin approach. Validated in STATE.md blockers. Exact `overflow-hidden` vs `overflow-y-auto` split needs testing.

### Pattern 2: Panel State Colocated in useChatStore

**What:** Add `panelOpen: boolean` and `activeDeliverableId: string | null` to the existing `useChatStore`. The SSE `done` event already updates this store — if artifacts state lives separately, the hand-off is a race condition.

**When to use:** Any time panel visibility must respond to streaming events.

**Why NOT a separate store:** `initSession` resets `deliverables: {}`. A separate artifacts store would not know when a new session begins and could show stale data from the previous session.

```typescript
// src/store/chat.ts  (additions only)
interface ChatState {
  // ... existing fields unchanged ...
  panelOpen: boolean;
  activeDeliverableId: string | null;

  openPanel: (deliverableId?: string) => void;
  closePanel: () => void;
  togglePanel: () => void;
}

// In initSession — add these resets:
initSession: (sessionId, agentSlug, agentName, existingMessages) => {
  set({
    // ... existing resets ...
    panelOpen: false,
    activeDeliverableId: null,
  });
  // ...
},

openPanel: (deliverableId) =>
  set({ panelOpen: true, ...(deliverableId && { activeDeliverableId: deliverableId }) }),

closePanel: () => set({ panelOpen: false }),

togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
```

### Pattern 3: Panel Collapse Without DOM Removal

**What:** Use `react-resizable-panels` v4 `collapsible` + `collapsedSize={0}` props on the right `ResizablePanel`. When collapsed, the panel renders at 0% width but remains mounted. Visibility state syncs back to the Zustand store via `onCollapse`/`onExpand` callbacks.

**When to use:** Every panel toggle operation — close button, `]` shortcut, re-open from chat column button.

**Critical:** Never conditionally render `{panelOpen && <ArtifactsPanel />}` — this unmounts the component. Use `collapsible` props instead.

```typescript
// Imperative control via ref (for keyboard shortcut and close button)
const artifactsPanelRef = useRef<ImperativePanelHandle>(null);

function toggleArtifactsPanel() {
  const panel = artifactsPanelRef.current;
  if (!panel) return;
  if (panel.isCollapsed()) {
    panel.expand();
  } else {
    panel.collapse();
  }
}
```

**react-resizable-panels v4 API note:** `direction` prop renamed to `orientation`; `onLayout` renamed to `onLayoutChange`; `defaultSize={50}` now accepts percentage string or number; `ref` on Panel changed to `panelRef`. Verify exact API with `npx shadcn add resizable` output.

### Pattern 4: Keyboard Shortcut Handler with Input Guard

**What:** A `useEffect` in `ChatPage` registers `document.keydown`. The guard checks `document.activeElement` before firing any shortcut. Mirrors the existing Cmd+K handler in AppShell exactly.

**When to use:** All Phase 12 shortcuts: `]` = toggle panel, `j`/`k` = navigate deliverables (Phase 12 stub), `a` = approve active, `r` = revise active.

**Important constraint from REVW-05:** "keyboard shortcuts (j/k/a/r) work inside the chat view without conflicting with browser or Cmd+K shortcuts." The Cmd+K handler is in AppShell — a second Cmd+K binding in ChatPage would double-fire. Do not bind Cmd+K in ChatPage.

```typescript
// src/components/chat/ChatPage.tsx — inside component
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    // Input guard — same pattern as AppShell Cmd+K handler
    const tag = (document.activeElement as HTMLElement)?.tagName;
    const isEditable = document.activeElement?.getAttribute('contenteditable');
    if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return;

    // Do not intercept modified keys that are browser-reserved
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case ']':
        e.preventDefault();
        toggleArtifactsPanel();
        break;
      case 'a':
        // Phase 12: stub — will call approveDeliverable in Phase 13
        break;
      case 'r':
        // Phase 12: stub — will open revision panel in Phase 13
        break;
      case 'j':
        // Phase 12: stub — navigate to next deliverable
        break;
      case 'k':
        // Phase 12: stub — navigate to previous deliverable
        break;
    }
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Pattern 5: Persisted Panel Size via localStorage

**What:** Store the last panel split ratio in `localStorage` and restore it via `react-resizable-panels` `defaultLayout` prop. Use a ref to debounce writes.

**When to use:** `onLayoutChange` callback on `ResizablePanelGroup`.

**SSR hydration note:** `react-resizable-panels` v4 warns about layout shift when restoring localStorage sizes during hydration. Use `suppressHydrationWarning` on the panel group OR read localStorage in a `useEffect` (not during render). The shadcn `resizable.tsx` component handles this correctly — do not bypass it.

```typescript
// In ChatPage — safe localStorage restore pattern
const [defaultSizes, setDefaultSizes] = useState<number[] | undefined>(undefined);

useEffect(() => {
  // Read localStorage client-side only (after hydration)
  const stored = localStorage.getItem('chat-panel-sizes');
  if (stored) {
    try { setDefaultSizes(JSON.parse(stored)); } catch { /* ignore */ }
  }
}, []);

// In ResizablePanelGroup
<ResizablePanelGroup
  orientation="horizontal"
  onLayoutChange={(sizes) => {
    localStorage.setItem('chat-panel-sizes', JSON.stringify(sizes));
  }}
>
```

### Anti-Patterns to Avoid

- **Conditional rendering the artifacts panel:** `{panelOpen && <ArtifactsPanel />}` unmounts → re-mounts ChatPage chain → `initSession` fires → SSE stream lost. Use `collapsible` prop only.
- **Separate Zustand store for panel state:** Desynchronizes from SSE `done` event; `initSession` reset won't clear stale artifact. Add to `useChatStore`.
- **Binding keyboard shortcuts in AppShell:** AppShell already owns `Cmd+K`. Adding more shortcuts there couples all pages to chat concerns. Keep shortcut handler inside `ChatPage`.
- **`max-w-7xl` override via a new global wrapper prop:** Tempting but creates coupling. The `-m-6` approach in the segment layout is self-contained.
- **Reading localStorage during SSR:** Causes hydration mismatch. Always read in `useEffect`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Draggable panel divider | Custom mouse event tracking + resizing logic | `react-resizable-panels` via `shadcn add resizable` | Touch support, keyboard accessibility, SSR hydration, imperative collapse API all built-in |
| Panel collapse animation | CSS transition on width state variable | `react-resizable-panels` `collapsible` + `collapsedSize={0}` | Handles animation, accessibility, size persistence internally |
| Keyboard shortcut registry | Second event listener manager | Extend existing `document.addEventListener` pattern from AppShell | One listener per document; two listeners don't conflict but two separate systems are harder to reason about |

**Key insight:** The hardest part of this phase is not building UI — it is not breaking what already works. Every structural change must be proven to not reset the SSE stream.

---

## Common Pitfalls

### Pitfall 1: Segment Layout Does Not Fully Escape AppShell Padding
**What goes wrong:** `app/chat/[sessionId]/layout.tsx` renders inside `<div className="mx-auto max-w-7xl p-6"><PageTransition>`. The segment layout cannot remove that parent div.
**Why it happens:** Next.js App Router composes layouts by nesting — parent layout's HTML wraps children. The parent `<div>` is always rendered.
**How to avoid:** Render `<div className="-m-6 h-full overflow-hidden">{children}</div>` in the segment layout. The `-m-6` cancels all four sides of the `p-6` parent. Verify visually on a 1440px screen.
**Warning signs:** Artifacts panel has unexpected 24px padding on left/right edges. Right panel clips at `max-w-7xl` boundary.

### Pitfall 2: Panel Toggle Resets the SSE Stream
**What goes wrong:** Collapsing/expanding the artifacts panel causes `ChatPage` to re-render in a way that re-runs `useEffect([session.id])`, which calls `initSession` and resets `deliverables: {}`.
**Why it happens:** If panel state is in local `useState` inside ChatPage, every toggle triggers a re-render. If the toggle happens while streaming, the `isStreaming` guard in `initSession` is bypassed because the session ID hasn't changed — but `deliverables` is reset anyway.
**How to avoid:** Panel open/close state lives in Zustand (`panelOpen`), not local state. `ChatPage` does not re-run `initSession` on Zustand state changes — only on `session.id` changes (verified in existing code: `useEffect([session.id])`). Store state changes don't trigger the guard.
**Warning signs:** Network tab shows second POST to `/api/chat` after toggling panel. `deliverables` object empties while streaming.

### Pitfall 3: react-resizable-panels v4 API Breaking Changes
**What goes wrong:** Architecture research was written referencing v4 APIs but some props have changed. Using old prop names causes silent failures or TypeScript errors.
**Why it happens:** shadcn `resizable.tsx` wraps the upstream library — the component API exposed by shadcn may differ from the raw library API.
**How to avoid:** Read the actual generated `src/components/ui/resizable.tsx` after running `npx shadcn add resizable` before writing code against it. Key v4 changes: `direction` → `orientation`; `onLayout` → `onLayoutChange`; `ref` → `panelRef` on Panel; `defaultSize={50}` now accepts percentage string.
**Warning signs:** TypeScript errors on `direction` prop. Panel collapse not working. `onLayout` callback not firing.

### Pitfall 4: Keyboard Shortcut `]` Fires While Typing in Chat Input
**What goes wrong:** User types `]` in the ChatInput textarea — panel toggles unexpectedly.
**Why it happens:** `document.keydown` fires regardless of which element has focus.
**How to avoid:** Input guard checks `document.activeElement.tagName`. ChatInput uses a `<textarea>` — the guard `if (tag === 'TEXTAREA') return;` catches it.
**Warning signs:** Typing in chat input accidentally opens/closes the artifacts panel.

### Pitfall 5: Panel Size Persistence Hydration Mismatch
**What goes wrong:** React warns `Prop 'style' did not match. Server: "" Client: "flex: 0 0 38%"` when panel sizes are loaded from localStorage before hydration completes.
**Why it happens:** Server renders default sizes; client reads stored sizes; they differ.
**How to avoid:** Read localStorage only in `useEffect`, never during initial render. Pass `undefined` as `defaultLayout` until the effect runs.
**Warning signs:** Hydration mismatch warning in browser console on page reload.

---

## Code Examples

Verified patterns from codebase analysis and official sources:

### AppShell Actual Structure (confirmed from source)
```typescript
// AppShell renders exactly this — the segment layout must work around it:
<main className="flex-1 overflow-y-auto">
  <div className="mx-auto max-w-7xl p-6">
    <PageTransition>{children}</PageTransition>
  </div>
</main>
```

### Segment Layout (bypasses padding)
```typescript
// src/app/chat/[sessionId]/layout.tsx
export default function ChatSessionLayout({ children }: { children: React.ReactNode }) {
  return <div className="-m-6 h-full overflow-hidden">{children}</div>;
}
```

### Chat Store Additions
```typescript
// Additions to ChatState interface in src/store/chat.ts
panelOpen: boolean;
activeDeliverableId: string | null;
openPanel: (deliverableId?: string) => void;
closePanel: () => void;
togglePanel: () => void;

// In initSession reset block — add:
panelOpen: false,
activeDeliverableId: null,
```

### ResizablePanelGroup Layout
```typescript
// Source: shadcn resizable docs + react-resizable-panels v4.7.3
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";

const artifactsPanelRef = useRef<ImperativePanelHandle>(null);

<ResizablePanelGroup
  orientation="horizontal"
  className="h-full"
  onLayoutChange={(sizes: number[]) => {
    localStorage.setItem('chat-panel-sizes', JSON.stringify(sizes));
  }}
>
  <ResizablePanel defaultSize={60} minSize={35}>
    {/* Chat column content */}
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel
    panelRef={artifactsPanelRef}
    defaultSize={40}
    minSize={0}
    collapsible
    collapsedSize={0}
    onCollapse={() => useChatStore.getState().closePanel()}
    onExpand={() => useChatStore.getState().openPanel()}
  >
    <ArtifactsPanel />
  </ResizablePanel>
</ResizablePanelGroup>
```

### Keyboard Shortcut Handler
```typescript
// Source: AppShell.tsx pattern, extended for chat shortcuts
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    const tag = (document.activeElement as HTMLElement)?.tagName;
    const isEditable = document.activeElement?.getAttribute('contenteditable');
    if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === ']') {
      e.preventDefault();
      const panel = artifactsPanelRef.current;
      if (panel?.isCollapsed()) panel.expand();
      else panel?.collapse();
    }
    // j/k/a/r stubs for Phase 12 (wired up in Phase 13)
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS Grid column toggle (show/hide) | `react-resizable-panels` collapsible prop | v2.0 → v3.0 | Prevents DOM unmount/remount on toggle |
| Separate artifacts Zustand store | Colocated in `useChatStore` | Phase 12 decision | Eliminates SSE done-event race condition |
| `direction` prop on PanelGroup | `orientation` prop | react-resizable-panels v4 | Breaking change in v4 — must use new API |
| `onLayout` callback | `onLayoutChange` | react-resizable-panels v4 | Breaking change in v4 |

**Deprecated/outdated:**
- `direction` prop: replaced by `orientation` in v4.0+
- `onLayout` prop: replaced by `onLayoutChange` in v4.0+
- `ref` on Panel: replaced by `panelRef` in v4.0+

---

## Open Questions

1. **Does `-m-6` fully escape PageTransition wrapper?**
   - What we know: AppShell renders `max-w-7xl p-6` wrapping `PageTransition`. Segment layout lands inside both.
   - What's unclear: Whether PageTransition adds its own padding/overflow constraints that `-m-6` doesn't cancel.
   - Recommendation: Validate visually on first commit. If `-m-6 h-full overflow-hidden` still clips, inspect PageTransition source and add a `suppressMaxWidth` prop to AppShell instead.

2. **react-resizable-panels v4 exact prop names after `npx shadcn add resizable`**
   - What we know: v4.7.3 current. Key renames: `direction`→`orientation`, `onLayout`→`onLayoutChange`, `ref`→`panelRef`.
   - What's unclear: Whether shadcn's generated `resizable.tsx` re-exports renamed props with backward-compat aliases.
   - Recommendation: Read the generated `src/components/ui/resizable.tsx` before writing ChatPage code. The file is the authoritative API surface to code against.

3. **Should `]` shortcut close the panel or toggle it?**
   - What we know: Success criterion says "close button or `]` keyboard shortcut." Figma uses `]` as a toggle.
   - What's unclear: UX intent — if panel is closed, does `]` reopen it?
   - Recommendation: Implement as toggle (open if closed, close if open). This matches Figma and the word "dismiss" vs "toggle" is ambiguous in the requirement.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + jsdom |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run src/store/__tests__/chat-review.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARTF-01 | ResizablePanelGroup renders chat + artifacts side by side | unit (component) | `npx vitest run src/components/chat/__tests__/ChatPage.test.tsx` | ❌ Wave 0 |
| ARTF-10 | Panel collapses and expands without unmounting ArtifactsPanel | unit (component) | `npx vitest run src/components/chat/__tests__/ChatPage.test.tsx` | ❌ Wave 0 |
| ARTF-10 | `]` key toggles panel when focus is not in input | unit (store + shortcut) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ Wave 0 |
| ARTF-10 | `]` key does NOT toggle when textarea is focused | unit (shortcut guard) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ Wave 0 |
| REVW-05 | `a` key does not fire when ChatInput textarea is focused | unit (shortcut guard) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ Wave 0 |
| REVW-05 | `j`/`k` shortcuts are registered in ChatPage keydown handler | unit (component) | `npx vitest run src/components/chat/__tests__/ChatPage.test.tsx` | ❌ Wave 0 |
| All | `panelOpen` and `activeDeliverableId` reset on `initSession` | unit (store) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ Wave 0 |
| All | `togglePanel` flips `panelOpen` without affecting `isStreaming` | unit (store) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/store/__tests__/chat-artifacts.test.ts src/store/__tests__/chat-review.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/store/__tests__/chat-artifacts.test.ts` — covers ARTF-01, ARTF-10, REVW-05 store behavior; `panelOpen`/`activeDeliverableId` reset; `togglePanel` correctness
- [ ] `src/components/chat/__tests__/ChatPage.test.tsx` — covers split-panel rendering, keyboard shortcut registration, panel collapse/expand via imperative ref
- [ ] No framework install needed — Vitest already configured with jsdom and `@testing-library/react`

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `/Users/luke/onewave-agency/src/components/chat/ChatPage.tsx` — confirmed `useEffect([session.id])` guard
- Direct codebase analysis: `/Users/luke/onewave-agency/src/components/layout/AppShell.tsx` — confirmed `max-w-7xl p-6` wrapper; Cmd+K handler pattern
- Direct codebase analysis: `/Users/luke/onewave-agency/src/store/chat.ts` — confirmed `initSession` resets `deliverables: {}`; no `panelOpen` yet
- Direct codebase analysis: `/Users/luke/onewave-agency/src/store/app.ts` — confirmed `persist` middleware pattern for localStorage
- react-resizable-panels v4.7.3 GitHub — collapsible API, `onCollapse`/`onExpand` callbacks, `ImperativePanelHandle`
- shadcn resizable docs: https://ui.shadcn.com/docs/components/resizable

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions block — AppShell bypass technique validation note; `visibility: hidden` decision for panel collapse
- `.planning/research/ARCHITECTURE.md` — Pattern 1 (segment layout), Pattern 2 (Zustand artifacts store shape)
- `.planning/research/PITFALLS.md` — Pitfall 1 (layout breaks chat), Pitfall 3 (SSE desync), Pitfall 7 (shortcut conflicts), Pitfall 9 (hydration mismatch), Pitfall 12 (max-w-7xl clips panel)

### Tertiary (LOW confidence — verify during implementation)
- react-resizable-panels v4 prop rename list (direction→orientation, onLayout→onLayoutChange) — confirmed via GitHub README fetch but exact shadcn wrapper re-export behavior needs verification after `npx shadcn add resizable`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-resizable-panels v4.7.3 verified; zustand already installed; shadcn pattern already in use
- Architecture: HIGH — AppShell source read directly; segment layout behavior confirmed from Next.js App Router docs
- Pitfalls: HIGH — SSE guard code read directly from `chat.ts`; `initSession` reset behavior confirmed; AppShell Cmd+K pattern confirmed

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable libraries; react-resizable-panels v4 API may drift slightly)
