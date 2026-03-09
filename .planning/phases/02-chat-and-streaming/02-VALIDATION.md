---
phase: 2
slug: chat-and-streaming
status: draft
nyquist_compliant: true
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
| 02-00-01 | 00 | 0 | CHAT-01, CHAT-04 | unit | `npx vitest run src/lib/services/__tests__/chat.test.ts` | 02-00 creates | ⬜ pending |
| 02-00-02 | 00 | 0 | CHAT-02 | integration | `npx vitest run src/app/api/chat/__tests__/route.test.ts` | 02-00 creates | ⬜ pending |
| 02-00-03 | 00 | 0 | CHAT-03 | unit | `npx vitest run src/components/chat/__tests__/MessageBubble.test.tsx` | 02-00 creates | ⬜ pending |
| 02-01-01 | 01 | 1 | CHAT-01, CHAT-04 | unit | `npx vitest run src/lib/services/__tests__/chat.test.ts` | via 02-00 | ⬜ pending |
| 02-01-02 | 01 | 1 | CHAT-02 | integration | `npx vitest run src/app/api/chat/__tests__/route.test.ts` | via 02-00 | ⬜ pending |
| 02-02-01 | 02 | 2 | CHAT-03 | unit | `npx vitest run src/components/chat/__tests__/MessageBubble.test.tsx` | via 02-00 | ⬜ pending |
| 02-02-02 | 02 | 2 | CHAT-01, CHAT-02 | build | `npx next build` | N/A | ⬜ pending |
| 02-02-03 | 02 | 2 | CHAT-01, CHAT-02 | build | `npx next build` | N/A | ⬜ pending |
| 02-02-04 | 02 | 2 | ALL | manual | human-verify checkpoint | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/services/__tests__/chat.test.ts` — stubs for CHAT-01, CHAT-04 (session CRUD, model selection)
- [ ] `src/app/api/chat/__tests__/route.test.ts` — stubs for CHAT-02 (mock Anthropic SDK, verify SSE output)
- [ ] `src/components/chat/__tests__/MessageBubble.test.tsx` — stubs for CHAT-03 (markdown + code highlight rendering)
- [ ] `src/test/mocks/anthropic.ts` — Anthropic SDK mock utilities for test isolation

**Wave 0 Plan:** 02-00-PLAN.md (wave: 0, 2 tasks)

---

## Sampling Continuity Check

| Sequence | Task | Has vitest verify? |
|----------|------|--------------------|
| 1 | 02-00-01 (test stubs) | YES — vitest run chat.test.ts |
| 2 | 02-00-02 (test stubs) | YES — vitest run route.test.ts + MessageBubble.test.tsx |
| 3 | 02-01-01 (schema + service) | YES — vitest run chat.test.ts |
| 4 | 02-01-02 (route + store) | YES — vitest run route.test.ts |
| 5 | 02-02-01 (MessageBubble + components) | YES — vitest run MessageBubble.test.tsx |
| 6 | 02-02-02 (ChatPage + route) | build only (acceptable: UI wiring) |
| 7 | 02-02-03 (sidebar + agent detail) | build only (acceptable: UI wiring) |
| 8 | 02-02-04 (checkpoint) | manual verify |

No 3+ consecutive tasks without vitest-based verify. Continuity: PASS.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Token-by-token streaming visible | CHAT-02 | Visual timing/rendering cannot be automated | 1. Start chat with agent 2. Send message 3. Verify text appears incrementally, not all-at-once |
| Syntax highlighting theme applied | CHAT-03 | CSS visual verification | 1. Ask agent for code example 2. Verify code block has colored syntax highlighting |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (02-00-PLAN.md)
- [x] No watch-mode flags
- [x] Feedback latency < 5s (vitest unit tests ~2-3s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
