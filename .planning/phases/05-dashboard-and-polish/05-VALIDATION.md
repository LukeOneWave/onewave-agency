---
phase: 5
slug: dashboard-and-polish
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-10
---

# Phase 5 — Validation Strategy

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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Created By | Status |
|---------|------|------|-------------|-----------|-------------------|------------|--------|
| 05-01-01 | 01 | 1 | DASH-01, DASH-02, DASH-03 | unit | `npx vitest run src/lib/services/__tests__/dashboard.test.ts` | 05-01 Task 1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Creation Mapping

Tests are created inline within their respective plan tasks (no separate Wave 0 plan):

- **`src/lib/services/__tests__/dashboard.test.ts`** — Created by Plan 01, Task 1 (TDD task covering DASH-01, DASH-02, DASH-03: stats, activity feed, utilization)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stat cards display correct numbers | DASH-01 | Visual layout verification | 1. Open dashboard 2. Verify stat cards show sessions, agents, tokens 3. Cross-reference with database |
| Activity feed shows chronological entries | DASH-02 | Visual + scroll behavior | 1. Create some sessions/missions 2. Open dashboard 3. Verify feed shows recent actions in order |
| Agent utilization chart renders correctly | DASH-03 | Visual chart verification | 1. Open dashboard 2. Verify bar/pie chart shows agent usage distribution 3. Check hover tooltips |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or inline test creation
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Test files mapped to creating plan/task (no orphaned references)
- [x] No watch-mode flags
- [x] Feedback latency < 8s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
