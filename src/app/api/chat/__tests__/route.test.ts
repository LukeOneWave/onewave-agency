import { describe, it, expect, vi, beforeEach } from "vitest";

// These tests will be activated once src/app/api/chat/route.ts is implemented.
// For now, they document the expected behavior of the SSE streaming route (CHAT-02).
//
// Mock setup is defined here so tests can be un-todo'd without additional boilerplate.
// See src/test/mocks/anthropic.ts for mock utilities.

describe("POST /api/chat", () => {
  it.todo("returns 401 when API key is not configured");

  it.todo("returns 404 when agent is not found");

  it.todo("streams SSE text events from Claude API");

  it.todo("sends done event with usage after stream completes");

  it.todo("sends error event on stream failure");
});

/*
 * Implementation notes for when route.ts is created:
 *
 * import { mockStream, mockAnthropicModule } from "@/test/mocks/anthropic";
 * vi.mock("@anthropic-ai/sdk", () => mockAnthropicModule());
 * vi.mock("@/lib/services/settings", () => ({ settingsService: { getApiKey: vi.fn() } }));
 * vi.mock("@/lib/services/agent", () => ({ agentService: { getBySlug: vi.fn() } }));
 * vi.mock("@/lib/services/chat", () => ({ chatService: { addMessage: vi.fn() } }));
 *
 * Then import { POST } from "../route" and test with:
 *   new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({...}) })
 *
 * Verify:
 * - 401 status when getApiKey returns null
 * - 404 status when getBySlug returns null
 * - SSE format: data: {"type":"text","text":"..."}\n\n
 * - Done event: data: {"type":"done","usage":{...}}\n\n
 * - Error event: data: {"type":"error","message":"..."}\n\n
 */
