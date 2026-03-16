import { describe, test, expect, beforeEach } from "vitest";
import { useChatStore } from "../chat";

describe("chat store panel state", () => {
  beforeEach(() => {
    // Reset store to a clean initial state before each test
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
      panelOpen: false,
      activeDeliverableId: null,
    });
  });

  test("togglePanel flips panelOpen from false to true and back", () => {
    const store = useChatStore.getState();

    expect(store.panelOpen).toBe(false);

    store.togglePanel();
    expect(useChatStore.getState().panelOpen).toBe(true);

    useChatStore.getState().togglePanel();
    expect(useChatStore.getState().panelOpen).toBe(false);
  });

  test("openPanel sets panelOpen to true; with id also sets activeDeliverableId", () => {
    useChatStore.getState().openPanel();
    expect(useChatStore.getState().panelOpen).toBe(true);
    expect(useChatStore.getState().activeDeliverableId).toBeNull();

    // Reset and call with id
    useChatStore.setState({ panelOpen: false, activeDeliverableId: null });
    useChatStore.getState().openPanel("del-123");
    expect(useChatStore.getState().panelOpen).toBe(true);
    expect(useChatStore.getState().activeDeliverableId).toBe("del-123");
  });

  test("closePanel sets panelOpen to false but does not clear activeDeliverableId", () => {
    useChatStore.setState({ panelOpen: true, activeDeliverableId: "del-456" });

    useChatStore.getState().closePanel();

    expect(useChatStore.getState().panelOpen).toBe(false);
    expect(useChatStore.getState().activeDeliverableId).toBe("del-456");
  });

  test("initSession resets panelOpen to false and activeDeliverableId to null", () => {
    useChatStore.setState({ panelOpen: true, activeDeliverableId: "del-789" });

    useChatStore.getState().initSession("new-session", "agent-slug", "Agent Name");

    const state = useChatStore.getState();
    expect(state.panelOpen).toBe(false);
    expect(state.activeDeliverableId).toBeNull();
  });

  test("togglePanel does NOT change isStreaming or deliverables", () => {
    useChatStore.setState({
      isStreaming: true,
      deliverables: { "msg-1-0": { status: "approved" } },
    });

    useChatStore.getState().togglePanel();

    const state = useChatStore.getState();
    expect(state.isStreaming).toBe(true);
    expect(state.deliverables).toEqual({ "msg-1-0": { status: "approved" } });
  });
});
