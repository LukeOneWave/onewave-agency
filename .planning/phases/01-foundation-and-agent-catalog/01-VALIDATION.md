---
phase: 1
slug: foundation-and-agent-catalog
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (Wave 0 installs) |
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
| 1-01-01 | 01 | 1 | FNDN-02 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FNDN-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | AGNT-01 | e2e/manual | manual browser check | N/A | ⬜ pending |
| 1-02-02 | 02 | 1 | AGNT-02 | e2e/manual | manual browser check | N/A | ⬜ pending |
| 1-02-03 | 02 | 1 | AGNT-03 | e2e/manual | manual browser check | N/A | ⬜ pending |
| 1-02-04 | 02 | 1 | AGNT-04 | e2e/manual | manual browser check | N/A | ⬜ pending |
| 1-03-01 | 03 | 1 | FNDN-01 | e2e/manual | manual browser check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` — test framework installation
- [ ] `vitest.config.ts` — vitest configuration
- [ ] `src/__tests__/agents-loader.test.ts` — stubs for FNDN-03 (agent parsing)
- [ ] `src/__tests__/prisma-seed.test.ts` — stubs for FNDN-02 (database seeding)

*Test infrastructure must exist before plans execute.*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
