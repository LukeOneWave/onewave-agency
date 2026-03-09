---
phase: 2
slug: chat-and-streaming
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
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
| 02-01-01 | 01 | 0 | CHAT-01, CHAT-04 | unit | `npx vitest run src/lib/services/__tests__/chat.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | CHAT-02 | integration | `npx vitest run src/app/api/chat/__tests__/route.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | CHAT-03 | unit | `npx vitest run src/components/chat/__tests__/MessageBubble.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/services/__tests__/chat.test.ts` — stubs for CHAT-01, CHAT-04 (session CRUD, model selection)
- [ ] `src/app/api/chat/__tests__/route.test.ts` — stubs for CHAT-02 (mock Anthropic SDK, verify SSE output)
- [ ] `src/components/chat/__tests__/MessageBubble.test.tsx` — stubs for CHAT-03 (markdown + code highlight rendering)
- [ ] Anthropic SDK mock utilities for test isolation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Token-by-token streaming visible | CHAT-02 | Visual timing/rendering cannot be automated | 1. Start chat with agent 2. Send message 3. Verify text appears incrementally, not all-at-once |
| Syntax highlighting theme applied | CHAT-03 | CSS visual verification | 1. Ask agent for code example 2. Verify code block has colored syntax highlighting |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
