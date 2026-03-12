---
phase: 11
slug: production-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | UX-05 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | UX-05 | build | `npm run build 2>&1 \| tail -20` | existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/layout/__tests__/PageTransition.test.tsx` — covers UX-05 rendering (component renders, animate-in class present)

*Existing test infrastructure (Vitest + jsdom) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Page transitions animate smoothly between routes | UX-05 | Visual CSS animation | Navigate between pages, verify fade-in transitions |
| Interactive elements have hover/press feedback | UX-05 | Visual hover state | Hover over cards, buttons, nav items — verify scale/shadow effects |
| Lists and cards have entrance animations | UX-05 | Visual staggered animation | Load agents page, verify cards animate in with stagger |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
