---
phase: 9
slug: advanced-review
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + Testing Library |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --reporter=dot src/lib/services/__tests__/deliverable.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=dot src/lib/services/__tests__/deliverable.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | REVW-02 | unit | `npm test -- src/lib/services/__tests__/deliverable.test.ts -t "getVersions"` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | REVW-03 | unit | `npm test -- src/lib/services/__tests__/deliverable.test.ts -t "updateContent"` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | PROJ-06 | unit | `npm test -- src/lib/services/__tests__/deliverable.test.ts -t "getByProjectId"` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | PROJ-07 | unit | `npm test -- src/lib/services/__tests__/orchestration.test.ts -t "getMissionDeliverables"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/services/__tests__/deliverable.test.ts` — stubs for REVW-02, REVW-03, PROJ-06
- [ ] `src/lib/services/__tests__/orchestration.test.ts` — stubs for PROJ-07

*No framework install needed — Vitest already configured*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Side-by-side diff with highlighted additions/deletions | REVW-02 | Visual rendering of diff component | 1. Open deliverable with 2+ versions, 2. Select two versions, 3. Verify additions green, deletions red |
| Click-to-edit textarea flow | REVW-03 | User interaction + visual | 1. Click deliverable content, 2. Verify textarea appears, 3. Edit text, save, 4. Verify new version created |
| Drag deliverables between review status columns | PROJ-07 | Drag-and-drop requires browser | 1. Open orchestration review board, 2. Drag deliverable between columns, 3. Reload, verify persistence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
