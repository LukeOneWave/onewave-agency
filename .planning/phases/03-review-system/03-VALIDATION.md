---
phase: 3
slug: review-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + jsdom |
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
| 03-00-01 | 00 | 0 | REVW-01, REVW-02 | unit | `npx vitest run src/lib/__tests__/deliverable-parser.test.ts` | 03-00 creates | ⬜ pending |
| 03-00-02 | 00 | 0 | REVW-01, REVW-03 | unit | `npx vitest run src/components/chat/__tests__/ReviewPanel.test.tsx` | 03-00 creates | ⬜ pending |
| 03-00-03 | 00 | 0 | REVW-04 | unit | `npx vitest run src/store/__tests__/chat-review.test.ts` | 03-00 creates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/deliverable-parser.test.ts` — stubs for REVW-01, REVW-02 (parser logic, approve status)
- [ ] `src/components/chat/__tests__/ReviewPanel.test.tsx` — stubs for REVW-01, REVW-03 (panel rendering, revision textarea)
- [ ] `src/store/__tests__/chat-review.test.ts` — stubs for REVW-04 (revision auto-send)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Review panel appears inline in chat | REVW-01 | Visual layout verification | 1. Chat with agent 2. Get deliverable response 3. Verify review panel renders below deliverable |
| Approve click changes visual status | REVW-02 | CSS state verification | 1. Click Approve 2. Verify badge changes to "Approved" with green styling |
| Revision feedback continues conversation | REVW-04 | End-to-end flow with real API | 1. Click Revise 2. Enter feedback 3. Verify feedback sent as next message 4. Verify agent responds to feedback |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
