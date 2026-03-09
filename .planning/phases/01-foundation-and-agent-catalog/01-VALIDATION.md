---
phase: 1
slug: foundation-and-agent-catalog
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (created in Plan 01 Task 1) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FNDN-02 | integration | `npx prisma db push 2>&1 && npm run build 2>&1 \| tail -5` | N/A | ⬜ pending |
| 1-01-02 | 01 | 1 | FNDN-03 | integration | `npx prisma db seed 2>&1 \| tail -5` | N/A | ⬜ pending |
| 1-01-03 | 01 | 1 | FNDN-02, FNDN-03 | unit | `npx vitest run --reporter=verbose` | ✅ (created in task) | ⬜ pending |
| 1-02-01 | 02 | 2 | AGNT-01, AGNT-02, AGNT-03, AGNT-04 | unit+integration | `npx vitest run src/lib/services/__tests__/agent.test.ts --reporter=verbose` | ✅ (created in task) | ⬜ pending |
| 1-02-02 | 02 | 2 | AGNT-01 | build | `npm run build 2>&1 \| tail -10` | N/A | ⬜ pending |
| 1-02-03 | 02 | 2 | AGNT-04 | build | `npm run build 2>&1 \| tail -10` | N/A | ⬜ pending |
| 1-03-01 | 03 | 2 | FNDN-01 | build | `npm run build 2>&1 \| tail -10` | N/A | ⬜ pending |
| 1-03-02 | 03 | 2 | FNDN-01 | build | `npm run build 2>&1 \| tail -10` | N/A | ⬜ pending |
| 1-03-03 | 03 | 2 | ALL | manual | checkpoint:human-verify | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `vitest` + `@testing-library/react` — installed in Plan 01 Task 1
- [x] `vitest.config.ts` — created in Plan 01 Task 1
- [x] `src/__tests__/agents-loader.test.ts` — created in Plan 01 Task 3
- [x] `src/__tests__/prisma-seed.test.ts` — created in Plan 01 Task 3

*All Wave 0 test infrastructure is created by Plan 01 tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App loads with navigation shell and dark mode | FNDN-02 | Visual/UI verification | Run `npm run dev`, verify sidebar, header, dark theme render |
| Agent grid displays with division colors | AGNT-01 | Visual rendering | Browse /agents, verify grid layout with colored cards |
| Division tab filtering works | AGNT-02 | Interactive UI | Click division tabs, verify grid filters correctly |
| Agent search filters results | AGNT-03 | Interactive UI | Type in search, verify results filter in real-time |
| Agent detail shows full personality | AGNT-04 | Content rendering | Click agent card, verify detail page with markdown content |
| API key persists across sessions | FNDN-01 | Requires browser storage | Enter key in settings, refresh page, verify key persists |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
