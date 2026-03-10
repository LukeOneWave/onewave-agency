import { create } from "zustand";
import type { OrchSSEEvent, LaneState } from "@/types/orchestration";

interface OrchestrationState {
  missionId: string | null;
  brief: string;
  model: string;
  lanes: Record<string, LaneState>;
  missionStatus: "idle" | "creating" | "streaming" | "done" | "error";
  error: string | null;
  _abortController: AbortController | null;

  // Actions
  createMission: (
    agentIds: string[],
    brief: string,
    model: string,
    agents: Array<{ id: string; name: string; division: string; color: string }>
  ) => Promise<void>;
  connectStream: (missionId: string) => Promise<void>;
  handleSSEEvent: (event: OrchSSEEvent) => void;
  stopMission: () => void;
  reset: () => void;
}

const initialState = {
  missionId: null,
  brief: "",
  model: "claude-sonnet-4-6",
  lanes: {} as Record<string, LaneState>,
  missionStatus: "idle" as const,
  error: null,
  _abortController: null,
};

export const useOrchestrationStore = create<OrchestrationState>()((set, get) => ({
  ...initialState,

  createMission: async (agentIds, brief, model, agents) => {
    // Initialize lanes from agents
    const lanes: Record<string, LaneState> = {};
    for (const agent of agents) {
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

    set({
      brief,
      model,
      lanes,
      missionStatus: "creating",
      error: null,
    });

    try {
      const response = await fetch("/api/orchestration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIds, brief, model }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        set({
          error: errorData?.error ?? `Request failed with status ${response.status}`,
          missionStatus: "error",
        });
        return;
      }

      const { missionId } = await response.json();
      set({ missionId, missionStatus: "idle" });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create mission",
        missionStatus: "error",
      });
    }
  },

  connectStream: async (missionId) => {
    const abortController = new AbortController();
    set({ _abortController: abortController });

    try {
      const response = await fetch(`/api/orchestration/${missionId}/stream`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        set({
          error: errorData?.error ?? `Stream failed with status ${response.status}`,
          missionStatus: "error",
          _abortController: null,
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        set({ error: "No response body", missionStatus: "error", _abortController: null });
        return;
      }

      set({ missionStatus: "streaming" });

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Extract complete SSE data segments
        const segments = buffer.split("\n\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const dataLine = segment.trim();
          if (!dataLine.startsWith("data: ")) continue;

          try {
            const event: OrchSSEEvent = JSON.parse(dataLine.slice(6));
            get().handleSSEEvent(event);
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Ensure streaming is stopped if loop exits without mission_done
      if (get().missionStatus === "streaming") {
        set({ missionStatus: "done", _abortController: null });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      set({
        error: error instanceof Error ? error.message : "Stream connection failed",
        missionStatus: "error",
        _abortController: null,
      });
    }
  },

  handleSSEEvent: (event) => {
    switch (event.type) {
      case "text": {
        set((state) => {
          const lane = state.lanes[event.agentId];
          if (!lane) return state;
          return {
            lanes: {
              ...state.lanes,
              [event.agentId]: {
                ...lane,
                content: lane.content + event.text,
                status: lane.status === "pending" ? "streaming" : lane.status,
              },
            },
          };
        });
        break;
      }
      case "agent_done": {
        set((state) => {
          const lane = state.lanes[event.agentId];
          if (!lane) return state;
          return {
            lanes: {
              ...state.lanes,
              [event.agentId]: {
                ...lane,
                status: "done",
                messageId: event.messageId,
              },
            },
          };
        });
        break;
      }
      case "error": {
        set((state) => {
          const lane = state.lanes[event.agentId];
          if (!lane) return state;
          return {
            lanes: {
              ...state.lanes,
              [event.agentId]: {
                ...lane,
                status: "error",
                error: event.message,
              },
            },
          };
        });
        break;
      }
      case "mission_done": {
        set({ missionStatus: "done", _abortController: null });
        break;
      }
    }
  },

  stopMission: () => {
    const state = get();
    state._abortController?.abort();
    set({ missionStatus: "done", _abortController: null });
  },

  reset: () => {
    const state = get();
    state._abortController?.abort();
    set({ ...initialState });
  },
}));
