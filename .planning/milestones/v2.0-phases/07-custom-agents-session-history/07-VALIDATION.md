---
phase: 7
slug: custom-agents-session-history
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/services/__tests__/agent.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | AGNT-01 | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "create"` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | AGNT-02 | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "update"` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | AGNT-03 | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "clone"` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | AGNT-04 | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "delete"` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | UX-03 | unit | `npx vitest run src/lib/services/__tests__/chat.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/services/__tests__/agent.test.ts` — stubs for AGNT-01 through AGNT-04 (create, update, clone, delete)
- [ ] `src/lib/services/__tests__/chat.test.ts` — stubs for UX-03 (getRecentSessions)

*Test framework already configured (vitest.config.ts exists).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent form renders with all fields | AGNT-01 | UI rendering | Navigate to /agents/new, verify name/division/role/personality/process fields present |
| Edit form pre-fills existing data | AGNT-02 | UI state | Click edit on custom agent, verify fields pre-populated |
| Clone pre-fills form from source | AGNT-03 | UI state + navigation | Click clone on any agent, verify form opens with source data |
| Delete button hidden on seeded agents | AGNT-04 | UI conditional rendering | Browse agent catalog, verify no delete option on seeded agents |
| Session list shows agent info | UX-03 | UI rendering | Navigate to /chat, verify past sessions list with agent names |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
