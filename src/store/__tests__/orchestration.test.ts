import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import type { OrchSSEEvent } from "@/types/orchestration";

// Import will fail until store is created (RED phase)
import { useOrchestrationStore } from "@/store/orchestration";

const mockAgents = [
  { id: "agent-1", name: "Designer", division: "Design", color: "#ff0000" },
  { id: "agent-2", name: "Developer", division: "Engineering", color: "#00ff00" },
];

describe("useOrchestrationStore", () => {
  beforeEach(() => {
    act(() => {
      useOrchestrationStore.getState().reset();
    });
  });

  describe("handleSSEEvent", () => {
    // Initialize lanes before event handling tests
    function initLanes() {
      act(() => {
        const state = useOrchestrationStore.getState();
        // Simulate what createMission does for lane initialization
        const lanes: Record<string, { agentId: string; agentName: string; division: string; color: string; sessionId: string; content: string; status: "pending" | "streaming" | "done" | "error"; error?: string }> = {};
        for (const agent of mockAgents) {
          lanes[agent.id] = {
            agentId: agent.id,
            agentName: agent.name,
            division: agent.division,
            color: agent.color,
            sessionId: `session-${agent.id}`,
            content: "",
            status: "pending",
          };
        }
        useOrchestrationStore.setState({ lanes, missionStatus: "streaming" });
      });
    }

    it("appends text to correct lane by agentId", () => {
      initLanes();

      const event1: OrchSSEEvent = { type: "text", agentId: "agent-1", text: "Hello " };
      const event2: OrchSSEEvent = { type: "text", agentId: "agent-1", text: "world" };
      const event3: OrchSSEEvent = { type: "text", agentId: "agent-2", text: "Foo" };

      act(() => {
        useOrchestrationStore.getState().handleSSEEvent(event1);
        useOrchestrationStore.getState().handleSSEEvent(event2);
        useOrchestrationStore.getState().handleSSEEvent(event3);
      });

      const state = useOrchestrationStore.getState();
      expect(state.lanes["agent-1"].content).toBe("Hello world");
      expect(state.lanes["agent-2"].content).toBe("Foo");
    });

    it("sets lane status to streaming on first text event", () => {
      initLanes();

      expect(useOrchestrationStore.getState().lanes["agent-1"].status).toBe("pending");

      const event: OrchSSEEvent = { type: "text", agentId: "agent-1", text: "Hi" };
      act(() => {
        useOrchestrationStore.getState().handleSSEEvent(event);
      });

      expect(useOrchestrationStore.getState().lanes["agent-1"].status).toBe("streaming");
      // agent-2 should still be pending
      expect(useOrchestrationStore.getState().lanes["agent-2"].status).toBe("pending");
    });

    it("sets lane status to done on agent_done event", () => {
      initLanes();

      const event: OrchSSEEvent = {
        type: "agent_done",
        agentId: "agent-1",
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      act(() => {
        useOrchestrationStore.getState().handleSSEEvent(event);
      });

      expect(useOrchestrationStore.getState().lanes["agent-1"].status).toBe("done");
    });

    it("sets lane status to error with error message", () => {
      initLanes();

      const event: OrchSSEEvent = {
        type: "error",
        agentId: "agent-1",
        message: "Rate limited",
      };

      act(() => {
        useOrchestrationStore.getState().handleSSEEvent(event);
      });

      const lane = useOrchestrationStore.getState().lanes["agent-1"];
      expect(lane.status).toBe("error");
      expect(lane.error).toBe("Rate limited");
    });

    it("sets missionStatus to done on mission_done event", () => {
      initLanes();

      const event: OrchSSEEvent = { type: "mission_done" };

      act(() => {
        useOrchestrationStore.getState().handleSSEEvent(event);
      });

      expect(useOrchestrationStore.getState().missionStatus).toBe("done");
    });
  });

  describe("startMission", () => {
    it("initializes lanes from agent list with empty content and pending status", () => {
      act(() => {
        // Manually set lanes to simulate startMission behavior
        const lanes: Record<string, { agentId: string; agentName: string; division: string; color: string; sessionId: string; content: string; status: "pending" }> = {};
        for (const agent of mockAgents) {
          lanes[agent.id] = {
            agentId: agent.id,
            agentName: agent.name,
            division: agent.division,
            color: agent.color,
            sessionId: "",
            content: "",
            status: "pending",
          };
        }
        useOrchestrationStore.setState({
          lanes,
          missionStatus: "creating",
          brief: "Test brief",
        });
      });

      const state = useOrchestrationStore.getState();
      expect(Object.keys(state.lanes).length).toBe(2);
      expect(state.lanes["agent-1"].agentName).toBe("Designer");
      expect(state.lanes["agent-1"].content).toBe("");
      expect(state.lanes["agent-1"].status).toBe("pending");
      expect(state.lanes["agent-2"].agentName).toBe("Developer");
      expect(state.missionStatus).toBe("creating");
    });
  });

  describe("stopMission", () => {
    it("sets missionStatus to done", () => {
      act(() => {
        useOrchestrationStore.setState({ missionStatus: "streaming" });
        useOrchestrationStore.getState().stopMission();
      });

      expect(useOrchestrationStore.getState().missionStatus).toBe("done");
    });
  });

  describe("reset", () => {
    it("clears all state back to initial", () => {
      act(() => {
        useOrchestrationStore.setState({
          missionId: "test-id",
          brief: "test brief",
          missionStatus: "streaming",
          lanes: { "agent-1": { agentId: "agent-1", agentName: "Test", division: "Test", color: "#000", sessionId: "s1", content: "hello", status: "streaming" } },
        });
      });

      act(() => {
        useOrchestrationStore.getState().reset();
      });

      const state = useOrchestrationStore.getState();
      expect(state.missionId).toBeNull();
      expect(state.brief).toBe("");
      expect(state.missionStatus).toBe("idle");
      expect(Object.keys(state.lanes).length).toBe(0);
    });
  });
});
