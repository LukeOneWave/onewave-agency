import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mock: useChatStore — define spies INSIDE the factory to avoid hoisting issues
// ---------------------------------------------------------------------------
const mockTogglePanel = vi.fn();

// Mutable variable: tests can set this before re-render to simulate reactive state change
let mockPanelOpen = false;

vi.mock("@/store/chat", () => {
  const togglePanel = vi.fn();
  const mockGetState = vi.fn(() => ({
    sessionId: "session-1",
    togglePanel,
    closePanel: vi.fn(),
    openPanel: vi.fn(),
    initSession: vi.fn(),
  }));

  const useChatStore = (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      error: null,
      sessionId: "session-1",
      get panelOpen() { return mockPanelOpen; },
      activeDeliverableId: null,
      messages: [],
      isStreaming: false,
    });

  useChatStore.getState = mockGetState;

  return { useChatStore };
});

// ---------------------------------------------------------------------------
// Shared mock imperative handle — accessible by all tests for assertions
// ---------------------------------------------------------------------------
const mockPanelHandle = {
  isCollapsed: vi.fn(() => false),
  collapse: vi.fn(),
  expand: vi.fn(),
};

// ---------------------------------------------------------------------------
// Mock: ResizablePanelGroup, ResizablePanel, ResizableHandle
// ---------------------------------------------------------------------------
vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="resizable-panel-group" data-orientation={props["orientation"] as string}>
      {children}
    </div>
  ),
  ResizablePanel: ({
    children,
    panelRef,
    ...props
  }: {
    children?: React.ReactNode;
    panelRef?: React.Ref<unknown>;
    [key: string]: unknown;
  }) => {
    // Attach shared mock imperative handle if panelRef is provided
    if (panelRef && typeof panelRef === "object" && "current" in panelRef) {
      (panelRef as React.MutableRefObject<unknown>).current = mockPanelHandle;
    }
    return (
      <div data-testid="resizable-panel">
        {children}
      </div>
    );
  },
  ResizableHandle: ({ withHandle, ...props }: { withHandle?: boolean; [key: string]: unknown }) => (
    <div data-testid="resizable-handle" />
  ),
}));

// ---------------------------------------------------------------------------
// Mock: ArtifactsPanel
// ---------------------------------------------------------------------------
vi.mock("@/components/chat/ArtifactsPanel", () => ({
  ArtifactsPanel: () => <div data-testid="artifacts-panel" />,
}));

// ---------------------------------------------------------------------------
// Mock: heavy child components
// ---------------------------------------------------------------------------
vi.mock("@/components/chat/MessageList", () => ({
  MessageList: () => <div data-testid="message-list" />,
}));

vi.mock("@/components/chat/ChatInput", () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}));

vi.mock("@/components/chat/ModelSelector", () => ({
  ModelSelector: () => <div data-testid="model-selector" />,
}));

vi.mock("@/components/chat/ProjectSelector", () => ({
  ProjectSelector: () => <div data-testid="project-selector" />,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// ---------------------------------------------------------------------------
// Import component AFTER mocks are declared
// ---------------------------------------------------------------------------
import { ChatPage } from "@/components/chat/ChatPage";
import { useChatStore } from "@/store/chat";

// ---------------------------------------------------------------------------
// Shared session fixture
// ---------------------------------------------------------------------------
const session = {
  id: "session-1",
  agent: { slug: "test-agent", name: "Test Agent", division: "Strategy" },
  project: null,
  messages: [],
};

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state between tests
    mockPanelOpen = false;
    mockPanelHandle.isCollapsed.mockReturnValue(false);
  });

  it("Test 1: renders ResizablePanelGroup with two ResizablePanel children", () => {
    render(<ChatPage session={session} />);

    const group = screen.getByTestId("resizable-panel-group");
    expect(group).toBeDefined();

    const panels = screen.getAllByTestId("resizable-panel");
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });

  it("Test 2: ArtifactsPanel is always mounted inside the second panel", () => {
    render(<ChatPage session={session} />);

    // ArtifactsPanel must be present in the DOM (never conditionally rendered)
    const artifactsPanel = screen.getByTestId("artifacts-panel");
    expect(artifactsPanel).toBeDefined();
  });

  it("Test 3: pressing ] key calls togglePanel on the store when no input is focused", () => {
    render(<ChatPage session={session} />);

    // Ensure no editable element is focused
    (document.activeElement as HTMLElement)?.blur?.();

    fireEvent.keyDown(document, { key: "]" });

    const { togglePanel } = useChatStore.getState();
    expect(togglePanel).toHaveBeenCalledTimes(1);
  });

  it("Test 4: pressing ] key does NOT call togglePanel when a textarea is focused", () => {
    render(<ChatPage session={session} />);

    // Focus a textarea to simulate chat input
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    fireEvent.keyDown(document, { key: "]" });

    const { togglePanel } = useChatStore.getState();
    expect(togglePanel).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it("Test 5: pressing j, k, a, r keys are handled (preventDefault) when no input is focused", () => {
    render(<ChatPage session={session} />);

    // Ensure no editable element is focused
    (document.activeElement as HTMLElement)?.blur?.();

    const jEvent = new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true });
    const kEvent = new KeyboardEvent("keydown", { key: "k", bubbles: true, cancelable: true });
    const aEvent = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    const rEvent = new KeyboardEvent("keydown", { key: "r", bubbles: true, cancelable: true });

    const jSpy = vi.spyOn(jEvent, "preventDefault");
    const kSpy = vi.spyOn(kEvent, "preventDefault");
    const aSpy = vi.spyOn(aEvent, "preventDefault");
    const rSpy = vi.spyOn(rEvent, "preventDefault");

    document.dispatchEvent(jEvent);
    document.dispatchEvent(kEvent);
    document.dispatchEvent(aEvent);
    document.dispatchEvent(rEvent);

    expect(jSpy).toHaveBeenCalled();
    expect(kSpy).toHaveBeenCalled();
    expect(aSpy).toHaveBeenCalled();
    expect(rSpy).toHaveBeenCalled();
  });

  it("Test 6: pressing a key does NOT fire handler when textarea is focused (REVW-05)", () => {
    render(<ChatPage session={session} />);

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    const aEvent = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(aEvent, "preventDefault");

    document.dispatchEvent(aEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it("Test 7: panelOpen transitioning to false triggers imperative collapse on the panel ref", () => {
    // Start with panel open
    mockPanelOpen = true;
    mockPanelHandle.isCollapsed.mockReturnValue(false);

    const { rerender } = render(<ChatPage session={session} />);

    // Simulate store toggling panelOpen to false (e.g., ] key pressed)
    mockPanelOpen = false;

    // Re-render so the useEffect re-runs with the new panelOpen value
    act(() => {
      rerender(<ChatPage session={session} />);
    });

    expect(mockPanelHandle.collapse).toHaveBeenCalledTimes(1);
    expect(mockPanelHandle.expand).not.toHaveBeenCalled();
  });

  it("Test 8: panelOpen transitioning to true triggers imperative expand on the panel ref", () => {
    // Start with panel collapsed
    mockPanelOpen = false;
    mockPanelHandle.isCollapsed.mockReturnValue(true);

    const { rerender } = render(<ChatPage session={session} />);

    // Simulate store toggling panelOpen to true (e.g., ] key pressed to re-open)
    mockPanelOpen = true;

    // Re-render so the useEffect re-runs with the new panelOpen value
    act(() => {
      rerender(<ChatPage session={session} />);
    });

    expect(mockPanelHandle.expand).toHaveBeenCalledTimes(1);
    expect(mockPanelHandle.collapse).not.toHaveBeenCalled();
  });
});
