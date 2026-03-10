import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockStream } from "@/test/mocks/anthropic";

// Shared stream function mock - configure per test
const mockStreamFn = vi.fn();

// Mock dependencies
vi.mock("@/lib/services/orchestration", () => ({
  orchestrationService: {
    getMission: vi.fn(),
    updateMissionStatus: vi.fn().mockResolvedValue(undefined),
    updateLaneStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/services/settings", () => ({
  settingsService: {
    getApiKey: vi.fn(),
  },
}));

vi.mock("@/lib/services/chat", () => ({
  chatService: {
    addMessage: vi.fn().mockResolvedValue({ id: "msg-1", role: "assistant", content: "" }),
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: function MockAnthropic() {
    return {
      messages: {
        stream: mockStreamFn,
      },
    };
  },
}));

import { orchestrationService } from "@/lib/services/orchestration";
import { settingsService } from "@/lib/services/settings";
import { chatService } from "@/lib/services/chat";

const mockOrchService = vi.mocked(orchestrationService);
const mockSettingsService = vi.mocked(settingsService);
const mockChatService = vi.mocked(chatService);

// Helper to create a mock mission with lanes
function createMockMission(
  laneConfigs: Array<{ agentId: string; agentName: string }>
) {
  return {
    id: "mission-1",
    brief: "Build a landing page",
    model: "claude-sonnet-4-6",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    lanes: laneConfigs.map((config, i) => ({
      id: `lane-${i + 1}`,
      missionId: "mission-1",
      agentId: config.agentId,
      sessionId: `session-${i + 1}`,
      status: "pending",
      createdAt: new Date(),
      agent: {
        name: config.agentName,
        division: "Engineering",
        color: "#ff0000",
        slug: config.agentId,
        systemPrompt: `You are ${config.agentName}`,
      },
      session: { id: `session-${i + 1}` },
    })),
  };
}

// Helper to parse SSE events from response
async function parseSSEEvents(
  response: Response
): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  const events: Array<Record<string, unknown>> = [];

  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        // skip malformed
      }
    }
  }

  return events;
}

describe("GET /api/orchestration/[missionId]/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Dynamically import route handler after mocks are set up
  async function getHandler() {
    const mod = await import("../[missionId]/stream/route");
    return mod.GET;
  }

  function createRequest(missionId: string) {
    const request = new Request(
      `http://localhost:3000/api/orchestration/${missionId}/stream`
    );
    return request;
  }

  it("returns 404 for unknown missionId", async () => {
    mockOrchService.getMission.mockResolvedValue(null);

    const GET = await getHandler();
    const request = createRequest("nonexistent");
    const response = await GET(request as never, {
      params: Promise.resolve({ missionId: "nonexistent" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Mission not found");
  });

  it("returns 401 when no API key configured", async () => {
    const mission = createMockMission([
      { agentId: "agent-1", agentName: "Designer" },
    ]);
    mockOrchService.getMission.mockResolvedValue(mission as never);
    mockSettingsService.getApiKey.mockResolvedValue(null);

    const GET = await getHandler();
    const request = createRequest("mission-1");
    const response = await GET(request as never, {
      params: Promise.resolve({ missionId: "mission-1" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("API key not configured");
  });

  it("emits text events tagged with correct agentId for each lane", async () => {
    const mission = createMockMission([
      { agentId: "agent-1", agentName: "Designer" },
      { agentId: "agent-2", agentName: "Developer" },
    ]);
    mockOrchService.getMission.mockResolvedValue(mission as never);
    mockSettingsService.getApiKey.mockResolvedValue("sk-test-key");

    const stream1 = mockStream(["Hello ", "from Designer"]);
    const stream2 = mockStream(["Hello ", "from Developer"]);

    let callCount = 0;
    mockStreamFn.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? stream1 : stream2;
    });

    const GET = await getHandler();
    const request = createRequest("mission-1");
    const response = await GET(request as never, {
      params: Promise.resolve({ missionId: "mission-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/event-stream; charset=utf-8"
    );

    const events = await parseSSEEvents(response);

    // Should have text events for both agents
    const agent1TextEvents = events.filter(
      (e) => e.type === "text" && e.agentId === "agent-1"
    );
    const agent2TextEvents = events.filter(
      (e) => e.type === "text" && e.agentId === "agent-2"
    );

    expect(agent1TextEvents.length).toBe(2);
    expect(agent2TextEvents.length).toBe(2);
    expect(agent1TextEvents[0].text).toBe("Hello ");
    expect(agent1TextEvents[1].text).toBe("from Designer");
    expect(agent2TextEvents[0].text).toBe("Hello ");
    expect(agent2TextEvents[1].text).toBe("from Developer");
  });

  it("emits agent_done with usage after each lane completes", async () => {
    const mission = createMockMission([
      { agentId: "agent-1", agentName: "Designer" },
    ]);
    mockOrchService.getMission.mockResolvedValue(mission as never);
    mockSettingsService.getApiKey.mockResolvedValue("sk-test-key");

    const stream1 = mockStream(["Hello"]);
    mockStreamFn.mockReturnValue(stream1);

    const GET = await getHandler();
    const request = createRequest("mission-1");
    const response = await GET(request as never, {
      params: Promise.resolve({ missionId: "mission-1" }),
    });

    const events = await parseSSEEvents(response);

    const agentDoneEvents = events.filter((e) => e.type === "agent_done");
    expect(agentDoneEvents.length).toBe(1);
    expect(agentDoneEvents[0].agentId).toBe("agent-1");
    expect(agentDoneEvents[0].usage).toEqual({
      input_tokens: 10,
      output_tokens: 20,
    });
  });

  it("emits mission_done after all lanes complete", async () => {
    const mission = createMockMission([
      { agentId: "agent-1", agentName: "Designer" },
      { agentId: "agent-2", agentName: "Developer" },
    ]);
    mockOrchService.getMission.mockResolvedValue(mission as never);
    mockSettingsService.getApiKey.mockResolvedValue("sk-test-key");

    const stream1 = mockStream(["text1"]);
    const stream2 = mockStream(["text2"]);

    let callCount = 0;
    mockStreamFn.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? stream1 : stream2;
    });

    const GET = await getHandler();
    const request = createRequest("mission-1");
    const response = await GET(request as never, {
      params: Promise.resolve({ missionId: "mission-1" }),
    });

    const events = await parseSSEEvents(response);

    const missionDoneEvents = events.filter((e) => e.type === "mission_done");
    expect(missionDoneEvents.length).toBe(1);

    // Verify mission status updated
    expect(mockOrchService.updateMissionStatus).toHaveBeenCalledWith(
      "mission-1",
      "streaming"
    );
  });

  it("handles lane errors without killing other streams", async () => {
    const mission = createMockMission([
      { agentId: "agent-1", agentName: "Designer" },
      { agentId: "agent-2", agentName: "Developer" },
    ]);
    mockOrchService.getMission.mockResolvedValue(mission as never);
    mockSettingsService.getApiKey.mockResolvedValue("sk-test-key");

    // Agent 1 errors, agent 2 succeeds
    const errorStream = mockStream([], { error: new Error("Rate limited") });
    const successStream = mockStream(["Success output"]);

    let callCount = 0;
    mockStreamFn.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? errorStream : successStream;
    });

    const GET = await getHandler();
    const request = createRequest("mission-1");
    const response = await GET(request as never, {
      params: Promise.resolve({ missionId: "mission-1" }),
    });

    const events = await parseSSEEvents(response);

    // Agent 1 should have error event
    const errorEvents = events.filter((e) => e.type === "error");
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].agentId).toBe("agent-1");
    expect(errorEvents[0].message).toBe("Rate limited");

    // Agent 2 should still complete successfully
    const agent2Text = events.filter(
      (e) => e.type === "text" && e.agentId === "agent-2"
    );
    expect(agent2Text.length).toBeGreaterThan(0);

    // Mission should still complete
    const missionDone = events.filter((e) => e.type === "mission_done");
    expect(missionDone.length).toBe(1);

    // Lane status should be updated to error
    expect(mockOrchService.updateLaneStatus).toHaveBeenCalledWith(
      "lane-1",
      "error"
    );
  });

  it("persists messages after lane completion", async () => {
    const mission = createMockMission([
      { agentId: "agent-1", agentName: "Designer" },
    ]);
    mockOrchService.getMission.mockResolvedValue(mission as never);
    mockSettingsService.getApiKey.mockResolvedValue("sk-test-key");

    const stream1 = mockStream(["Hello response"]);
    mockStreamFn.mockReturnValue(stream1);

    const GET = await getHandler();
    const request = createRequest("mission-1");
    const response = await GET(request as never, {
      params: Promise.resolve({ missionId: "mission-1" }),
    });

    await parseSSEEvents(response);

    // Should persist user brief and assistant response
    expect(mockChatService.addMessage).toHaveBeenCalledWith(
      "session-1",
      "user",
      "Build a landing page"
    );
    expect(mockChatService.addMessage).toHaveBeenCalledWith(
      "session-1",
      "assistant",
      "Hello response",
      { input: 10, output: 20 }
    );
  });
});
