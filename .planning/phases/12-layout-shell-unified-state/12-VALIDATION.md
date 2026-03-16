---
phase: 12
slug: layout-shell-unified-state
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + jsdom |
| **Config file** | `vitest.config.ts` at project root |
| **Quick run command** | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/store/__tests__/chat-artifacts.test.ts src/components/chat/__tests__/ChatPage.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | ARTF-01 | unit (component) | `npx vitest run src/components/chat/__tests__/ChatPage.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | ARTF-10 | unit (component) | `npx vitest run src/components/chat/__tests__/ChatPage.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | ARTF-10 | unit (store + shortcut) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | ARTF-10 | unit (shortcut guard) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-05 | 01 | 1 | REVW-05 | unit (shortcut guard) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-06 | 01 | 1 | REVW-05 | unit (component) | `npx vitest run src/components/chat/__tests__/ChatPage.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-07 | 01 | 1 | All | unit (store) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-08 | 01 | 1 | All | unit (store) | `npx vitest run src/store/__tests__/chat-artifacts.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/__tests__/chat-artifacts.test.ts` — stubs for ARTF-01, ARTF-10, REVW-05 store behavior; `panelOpen`/`activeDeliverableId` reset; `togglePanel` correctness
- [ ] `src/components/chat/__tests__/ChatPage.test.tsx` — stubs for split-panel rendering, keyboard shortcut registration, panel collapse/expand
- [ ] No framework install needed — Vitest already configured with jsdom and `@testing-library/react`

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Panel resize persists on reload | ARTF-01 | localStorage persistence requires browser context | 1. Drag divider to 60/40 split. 2. Reload page. 3. Verify split ratio is restored. |
| SSE stream survives 5 panel toggles | ARTF-01/ARTF-10 | Requires live SSE connection | 1. Start agent chat. 2. While streaming, toggle panel 5 times with `]`. 3. Verify no content loss. |
| `-m-6` bypass renders full-viewport | ARTF-01 | Visual layout validation | 1. Navigate to any chat session. 2. Verify chat page spans full viewport width without AppShell `max-w-7xl` constraint. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
