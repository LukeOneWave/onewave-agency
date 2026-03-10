import { describe, test, expect, vi, beforeEach } from "vitest";
import { useChatStore } from "../chat";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("chat store review extensions", () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      sessionId: "session-1",
      agentSlug: "test-agent",
      agentName: "Test Agent",
      messages: [],
      isStreaming: false,
      selectedModel: "claude-sonnet-4-6",
      error: null,
      _abortController: null,
      deliverables: {},
    });
    mockFetch.mockReset();
  });

  test("approveDeliverable updates deliverable state to approved", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messageId: "msg-1", index: 0, status: "approved" }),
    });

    await useChatStore.getState().approveDeliverable("msg-1", 0);

    const state = useChatStore.getState();
    expect(state.deliverables["msg-1-0"]).toEqual({ status: "approved" });
    expect(mockFetch).toHaveBeenCalledWith("/api/deliverables/msg-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: 0, status: "approved" }),
    });
  });

  test("requestRevision updates state and calls sendMessage with revision prompt", async () => {
    // Mock the PATCH call for revision status
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messageId: "msg-1",
        index: 0,
        status: "revised",
        feedback: "Make it shorter",
      }),
    });

    // Mock the POST call for sendMessage (the auto-sent revision)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"type":"done","usage":{"input_tokens":10,"output_tokens":5}}\n\n'
            )
          );
          controller.close();
        },
      }),
    });

    await useChatStore.getState().requestRevision("msg-1", 0, "Make it shorter");

    const state = useChatStore.getState();
    expect(state.deliverables["msg-1-0"]).toEqual({
      status: "revised",
      feedback: "Make it shorter",
    });

    // First call is PATCH for status, second is POST for sendMessage
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/deliverables/msg-1");
    expect(mockFetch.mock.calls[1][0]).toBe("/api/chat");
  });

  test("deliverable state persists across re-renders", async () => {
    // Simulate loadDeliverables returning existing records
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { messageId: "msg-1", index: 0, status: "approved", feedback: null },
        {
          messageId: "msg-1",
          index: 1,
          status: "revised",
          feedback: "Fix typos",
        },
      ],
    });

    await useChatStore.getState().loadDeliverables("msg-1");

    const state = useChatStore.getState();
    expect(state.deliverables["msg-1-0"]).toEqual({ status: "approved" });
    expect(state.deliverables["msg-1-1"]).toEqual({
      status: "revised",
      feedback: "Fix typos",
    });
  });
});
