---
phase: 12-layout-shell-unified-state
plan: "02"
subsystem: ui
tags: [react-resizable-panels, zustand, keyboard-shortcuts, localStorage, vitest, tdd]

# Dependency graph
requires:
  - phase: 12-layout-shell-unified-state
    plan: "01"
    provides: "ResizablePanelGroup/Panel/Handle components, useChatStore panel state, ArtifactsPanel shell"
provides:
  - "ChatPage restructured with ResizablePanelGroup horizontal split layout"
  - "ArtifactsPanel always mounted in collapsible right panel (SSE-safe)"
  - "] keyboard shortcut toggles artifacts panel with input guard"
  - "j/k/a/r keyboard stubs registered with preventDefault for Phase 13/16"
  - "Panel sizes persisted to localStorage via onLayoutChanged (keyed by panel id)"
  - "Store sync via onResize: closePanel on collapse, openPanel on expand"
affects:
  - 13-artifacts-rendering
  - 16-revision-panel

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: write failing tests first, then implement to make them pass"
    - "ResizablePanelGroup with orientation=horizontal, panel ids for stable layout storage"
    - "PanelImperativeHandle via panelRef prop (not React ref) for imperative collapse/expand"
    - "onLayoutChanged (not onLayout) for persisting sizes — called after pointer release"
    - "Keyboard shortcut guard: check tagName === INPUT/TEXTAREA or contenteditable before handling"
    - "localStorage wrapped in try/catch for test environment and storage quota safety"

key-files:
  created:
    - src/components/chat/__tests__/ChatPage.test.tsx
  modified:
    - src/components/chat/ChatPage.tsx

key-decisions:
  - "Use onLayoutChanged (not onLayoutChange) for localStorage persistence — only fires after drag completes, not on every pixel"
  - "] shortcut calls useChatStore.getState().togglePanel() for store-first state management; panel visual state is driven by store panelOpen"
  - "Panel sizes stored as {chat: number, artifacts: number} keyed by stable panel id, not array indices"
  - "localStorage access wrapped in try/catch — jsdom test environment has no localStorage, production always has it"
  - "ArtifactsPanel always mounted (never conditionally rendered) to prevent SSE initSession guard re-mount"

patterns-established:
  - "Panel keyboard shortcut pattern: document.addEventListener in useEffect with tagName/contenteditable guard"
  - "Store sync from panel resize: onResize callback updates store when panel reaches 0% (collapsed)"

requirements-completed:
  - ARTF-01
  - ARTF-10
  - REVW-05

# Metrics
duration: 15min
completed: 2026-03-16
---

# Phase 12 Plan 02: Split-Panel ChatPage Summary

**ResizablePanelGroup split-panel layout with ArtifactsPanel always-mounted, ] keyboard shortcut with input guard, and localStorage panel size persistence**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-16T13:47:00Z
- **Completed:** 2026-03-16T13:51:00Z
- **Tasks:** 1 automated (Task 2 is human-verify checkpoint)
- **Files modified:** 2

## Accomplishments
- Rewrote ChatPage to use `ResizablePanelGroup` with `orientation="horizontal"` — chat column left (60%), ArtifactsPanel right (40%)
- ArtifactsPanel always mounted inside `ResizablePanel` (never conditionally rendered) — protects SSE `initSession` guard from re-mount
- Keyboard shortcut handler: `]` toggles panel via `useChatStore.getState().togglePanel()`; `j`/`k`/`a`/`r` stubs with `preventDefault()` for Phase 13/16
- Input guard blocks all shortcuts when `INPUT`, `TEXTAREA`, or `contenteditable` element is focused (REVW-05)
- Panel sizes persisted to localStorage via `onLayoutChanged` callback, hydrated on mount with graceful fallback
- `onResize` callback syncs store `closePanel`/`openPanel` when panel collapses to 0% or expands
- TDD: 6 tests written RED then GREEN, all passing; chat-artifacts store tests unchanged

## Task Commits

Each task was committed atomically:

1. **TDD RED: Failing ChatPage tests** - `9809aa7` (test)
2. **TDD GREEN: ChatPage ResizablePanelGroup implementation** - `d5d2cc5` (feat)

## Files Created/Modified
- `src/components/chat/__tests__/ChatPage.test.tsx` - 6 TDD tests: ResizablePanelGroup structure, ArtifactsPanel always mounted, ] shortcut, textarea input guard, j/k/a/r preventDefault, REVW-05 guard
- `src/components/chat/ChatPage.tsx` - Restructured with ResizablePanelGroup, keyboard shortcuts, localStorage persistence, store sync via onResize

## Decisions Made
- Used `onLayoutChanged` (not `onLayoutChange`) — fires after drag completes, not on every pixel move, which is correct for storage APIs
- `]` shortcut calls `togglePanel()` on store directly — simpler and more testable than calling `artifactsPanelRef.current.collapse()/expand()`; store is source of truth, visual panel state syncs via `panelOpen`
- Panel sizes stored as `{chat: number, artifacts: number}` object using stable panel ids — more robust than array index-based storage
- localStorage calls wrapped in `try/catch` — jsdom test environment returns a warning without a valid path; production always has localStorage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed localStorage unavailability in jsdom test environment**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Initial implementation called `localStorage.getItem()` in a `useEffect` after checking `sizesLoaded` state, but jsdom warning caused all tests to fail with `localStorage.getItem is not a function`
- **Fix:** Wrapped all localStorage access in `try/catch`; removed `sizesLoaded`/`null`-return guard in favor of default sizes + async update pattern
- **Files modified:** src/components/chat/ChatPage.tsx
- **Verification:** All 6 tests pass; component renders immediately with default sizes
- **Committed in:** d5d2cc5 (Task 1 feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for testability and correctness. No scope creep.

## Issues Encountered
- Pre-existing test failures in `src/lib/services/__tests__/deliverable.test.ts` (missing `message.sessionId` in include) and `src/app/api/chat/__tests__/route.test.ts` (done event assertion mismatch) — both existed before this plan and are out of scope. Logged to deferred-items.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Human verification checkpoint (Task 2) required before marking plan complete
- Phase 13 (artifacts rendering) can proceed after checkpoint approval: ChatPage split layout is in place
- Panel keyboard stubs `j`/`k`/`a` registered and ready for Phase 13 implementation
- Panel stub `r` registered and ready for Phase 16 revision panel

---
*Phase: 12-layout-shell-unified-state*
*Completed: 2026-03-16*

## Self-Check: PASSED

All files verified present, all commits verified in git history:
- FOUND: src/components/chat/ChatPage.tsx
- FOUND: src/components/chat/__tests__/ChatPage.test.tsx
- FOUND: .planning/phases/12-layout-shell-unified-state/12-02-SUMMARY.md
- FOUND: 9809aa7 (test commit — TDD RED)
- FOUND: d5d2cc5 (feat commit — TDD GREEN)
