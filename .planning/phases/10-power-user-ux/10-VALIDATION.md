---
phase: 10
slug: power-user-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --reporter=verbose src/lib/services/__tests__/search.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/lib/services/__tests__/search.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | UX-01 | unit | `npm test -- src/lib/services/__tests__/search.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | UX-01 | unit | `npm test -- src/lib/services/__tests__/search.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | UX-01 | integration | `curl "http://localhost:3001/api/search?q=test"` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/services/__tests__/search.test.ts` — stubs for UX-01 search service layer
- [ ] `src/lib/services/search.ts` — search service (created during implementation)

*Existing test infrastructure (Vitest + jsdom) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cmd+K opens palette from any page | UX-01 | Keyboard event + DOM overlay | Open app, press Cmd+K, verify palette appears |
| Selecting result navigates to entity page | UX-01 | Full browser navigation | Open palette, type query, select result, verify URL |
| Type-ahead filtering shows results | UX-01 | Visual rendering + API integration | Type in palette, verify results update live |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
