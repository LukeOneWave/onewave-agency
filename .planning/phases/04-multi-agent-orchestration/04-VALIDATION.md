---
phase: 4
slug: multi-agent-orchestration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + jsdom |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-00-01 | 00 | 0 | ORCH-01, ORCH-02 | unit | `npx vitest run src/lib/services/__tests__/orchestration.test.ts` | 04-00 creates | ⬜ pending |
| 04-00-02 | 00 | 0 | ORCH-03 | unit | `npx vitest run src/app/api/orchestration/__tests__/stream.test.ts` | 04-00 creates | ⬜ pending |
| 04-00-03 | 00 | 0 | ORCH-04 | unit | `npx vitest run src/store/__tests__/orchestration.test.ts` | 04-00 creates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/services/__tests__/orchestration.test.ts` — stubs for ORCH-01, ORCH-02 (mission CRUD, brief storage)
- [ ] `src/app/api/orchestration/__tests__/stream.test.ts` — stubs for ORCH-03 (parallel streaming)
- [ ] `src/store/__tests__/orchestration.test.ts` — stubs for ORCH-04 (store demuxing, deliverable flow)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Multi-lane streaming renders simultaneously | ORCH-03, ORCH-04 | Visual parallel animation verification | 1. Create mission with 3 agents 2. Verify all 3 lanes stream simultaneously 3. Check independent scrolling |
| Agent selection UI multi-select | ORCH-01 | Interactive UI verification | 1. Open orchestration page 2. Select/deselect agents 3. Verify selection state and count |
| Deliverables from lanes flow to review system | ORCH-04 | End-to-end with review system integration | 1. Run mission 2. Wait for deliverable in a lane 3. Verify approve/revise buttons appear 4. Approve one deliverable |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
