import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock setup so vi.mock factories can reference them
const { mockStreamFn, MockAnthropic } = vi.hoisted(() => {
  const mockStreamFn = vi.fn();
  // Must use function (not arrow) so it works with `new`
  const MockAnthropic = vi.fn(function () {
    return {
      messages: {
        stream: mockStreamFn,
      },
    };
  });
  return { mockStreamFn, MockAnthropic };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: MockAnthropic,
}));

vi.mock("@/lib/services/settings", () => ({
  settingsService: {
    getApiKey: vi.fn(),
  },
}));

vi.mock("@/lib/services/agent", () => ({
  agentService: {
    getBySlug: vi.fn(),
  },
}));

vi.mock("@/lib/services/chat", () => ({
  chatService: {
    addMessage: vi.fn(),
  },
}));

import { POST } from "../route";
import { settingsService } from "@/lib/services/settings";
import { agentService } from "@/lib/services/agent";

beforeEach(() => {
  vi.clearAllMocks();
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMockStream(
  textChunks: string[],
  options?: { error?: Error }
) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  const stream = {
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(cb);

      if (event === "text" && !options?.error) {
        queueMicrotask(() => {
          for (const chunk of textChunks) {
            handlers["text"]?.forEach((h) => h(chunk));
          }
          queueMicrotask(() => {
            handlers["end"]?.forEach((h) => h());
          });
        });
      }

      if (event === "error" && options?.error) {
        queueMicrotask(() => {
          handlers["error"]?.forEach((h) => h(options.error));
        });
      }

      return stream;
    },

    async finalMessage() {
      return {
        usage: { input_tokens: 10, output_tokens: 20 },
      };
    },
  };

  return stream;
}

const defaultBody = {
  sessionId: "session-1",
  agentSlug: "test-agent",
  messages: [{ role: "user", content: "Hello" }],
  model: "claude-sonnet-4-6",
};

const mockAgent = {
  id: "agent-1",
  slug: "test-agent",
  name: "Test Agent",
  systemPrompt: "You are a test agent.",
};

describe("POST /api/chat", () => {
  it("returns 401 when API key is not configured", async () => {
    vi.mocked(settingsService.getApiKey).mockResolvedValue(null);

    const response = await POST(createRequest(defaultBody) as never);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("API key not configured");
  });

  it("returns 404 when agent is not found", async () => {
    vi.mocked(settingsService.getApiKey).mockResolvedValue("sk-test-key");
    vi.mocked(agentService.getBySlug).mockResolvedValue(null);

    const response = await POST(createRequest(defaultBody) as never);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe("Agent not found");
  });

  it("streams SSE text events from Claude API", async () => {
    vi.mocked(settingsService.getApiKey).mockResolvedValue("sk-test-key");
    vi.mocked(agentService.getBySlug).mockResolvedValue(mockAgent as never);
    mockStreamFn.mockReturnValue(createMockStream(["Hello", " world"]));

    const response = await POST(createRequest(defaultBody) as never);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value);
    }

    expect(fullText).toContain("data:");
    expect(fullText).toContain('"type":"text"');
  });

  it("sends done event with usage after stream completes", async () => {
    vi.mocked(settingsService.getApiKey).mockResolvedValue("sk-test-key");
    vi.mocked(agentService.getBySlug).mockResolvedValue(mockAgent as never);
    mockStreamFn.mockReturnValue(createMockStream(["Hello"]));

    const response = await POST(createRequest(defaultBody) as never);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value);
    }

    expect(fullText).toContain('"type":"done"');
    expect(fullText).toContain('"usage"');
  });

  it("sends error event on stream failure", async () => {
    vi.mocked(settingsService.getApiKey).mockResolvedValue("sk-test-key");
    vi.mocked(agentService.getBySlug).mockResolvedValue(mockAgent as never);
    mockStreamFn.mockReturnValue(
      createMockStream([], { error: new Error("API rate limited") })
    );

    const response = await POST(createRequest(defaultBody) as never);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value);
    }

    expect(fullText).toContain('"type":"error"');
  });
});
