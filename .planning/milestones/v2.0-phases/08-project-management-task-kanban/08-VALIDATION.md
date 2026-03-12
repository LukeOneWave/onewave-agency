---
phase: 8
slug: project-management-task-kanban
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + Testing Library |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --reporter=dot src/lib/services/__tests__/project.test.ts src/lib/services/__tests__/task.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=dot src/lib/services/__tests__/project.test.ts src/lib/services/__tests__/task.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | PROJ-01 | unit | `npm test -- src/lib/services/__tests__/project.test.ts -t "create"` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | PROJ-02 | unit | `npm test -- src/lib/services/__tests__/task.test.ts -t "assignedAgent"` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | PROJ-03 | unit | `npm test -- src/lib/services/__tests__/project.test.ts -t "getById"` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 1 | PROJ-04 | unit | `npm test -- src/lib/services/__tests__/task.test.ts -t "create"` | ❌ W0 | ⬜ pending |
| 08-01-05 | 01 | 1 | PROJ-05 | unit | `npm test -- src/lib/services/__tests__/task.test.ts -t "updateStatus"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/services/__tests__/project.test.ts` — stubs for PROJ-01, PROJ-03
- [ ] `src/lib/services/__tests__/task.test.ts` — stubs for PROJ-02, PROJ-04, PROJ-05

*No framework install needed — Vitest already configured*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag task between Kanban columns | PROJ-05 | Drag-and-drop requires browser interaction | 1. Open project detail, 2. Drag task from "To Do" to "In Progress", 3. Reload page, 4. Verify task remains in "In Progress" |
| Agent assignment visible on project | PROJ-02 | Visual check of agent avatars/names | 1. Assign agent to task, 2. View project page, 3. Verify agent shown in project context |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
