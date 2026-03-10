---
phase: 6
slug: infrastructure-quick-wins
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | UX-02 | manual | visual check | N/A | ⬜ pending |
| 06-02-01 | 02 | 1 | REVW-01 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 1 | UX-04 | manual | visual check | N/A | ⬜ pending |
| 06-04-01 | 04 | 1 | schema | unit | `npx prisma db push` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers test framework (vitest already configured)
- Review queue service test stubs needed during implementation

*Existing infrastructure covers most phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Theme toggle persists across reloads | UX-02 | UI state + visual | Toggle theme, reload page, verify theme persisted |
| Skeleton placeholders show during load | UX-04 | Visual loading state | Navigate to pages, observe skeleton before content |
| Review queue shows pending items | REVW-01 | End-to-end data flow | Create deliverable, check dashboard widget |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
