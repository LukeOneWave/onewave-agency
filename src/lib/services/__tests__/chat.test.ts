import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { chatService } from "@/lib/services/chat";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("chatService", () => {
  describe("createSession", () => {
    it("creates a session with agentId and default model", async () => {
      const mockSession = {
        id: "session-1",
        agentId: "agent-1",
        model: "claude-sonnet-4-6",
        agent: { id: "agent-1", name: "Test Agent" },
      };
      vi.mocked(prisma.chatSession.create).mockResolvedValue(mockSession as never);

      const result = await chatService.createSession("agent-1", "claude-sonnet-4-6");

      expect(prisma.chatSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentId: "agent-1",
            model: "claude-sonnet-4-6",
          }),
        })
      );
      expect(result).toEqual(mockSession);
    });

    it("creates a session with specified model for CHAT-04", async () => {
      vi.mocked(prisma.chatSession.create).mockResolvedValue({
        id: "session-2",
        agentId: "agent-1",
        model: "claude-opus-4-6",
        agent: { id: "agent-1", name: "Test Agent" },
      } as never);

      await chatService.createSession("agent-1", "claude-opus-4-6");

      expect(prisma.chatSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            model: "claude-opus-4-6",
          }),
        })
      );
    });
  });

  describe("getSession", () => {
    it("returns session with agent and messages included", async () => {
      const mockSession = {
        id: "session-1",
        agentId: "agent-1",
        agent: { id: "agent-1", name: "Test Agent" },
        messages: [],
      };
      vi.mocked(prisma.chatSession.findUnique).mockResolvedValue(mockSession as never);

      const result = await chatService.getSession("session-1");

      expect(prisma.chatSession.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "session-1" },
          include: expect.objectContaining({
            agent: true,
          }),
        })
      );
      expect(result).toEqual(mockSession);
    });
  });

  describe("addMessage", () => {
    it("creates a message with role and content", async () => {
      const mockMessage = {
        id: "msg-1",
        sessionId: "session-1",
        role: "user",
        content: "Hello",
      };
      vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as never);

      const result = await chatService.addMessage("session-1", "user", "Hello");

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: "session-1",
            role: "user",
            content: "Hello",
          }),
        })
      );
      expect(result).toEqual(mockMessage);
    });

    it("stores token counts when provided", async () => {
      vi.mocked(prisma.message.create).mockResolvedValue({
        id: "msg-2",
        sessionId: "session-1",
        role: "assistant",
        content: "Hi there",
        inputTokens: 10,
        outputTokens: 20,
      } as never);

      await chatService.addMessage("session-1", "assistant", "Hi there", {
        input: 10,
        output: 20,
      });

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputTokens: 10,
            outputTokens: 20,
          }),
        })
      );
    });
  });

  describe("getSessionMessages", () => {
    it("returns messages ordered by createdAt asc", async () => {
      const mockMessages = [
        { id: "msg-1", content: "Hello", createdAt: new Date("2026-01-01") },
        { id: "msg-2", content: "Hi", createdAt: new Date("2026-01-02") },
      ];
      vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages as never);

      const result = await chatService.getSessionMessages("session-1");

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: "session-1" },
          orderBy: { createdAt: "asc" },
        })
      );
      expect(result).toEqual(mockMessages);
    });
  });

  describe("getRecentSessions", () => {
    it("returns sessions ordered by updatedAt desc", async () => {
      const older = new Date("2026-01-01");
      const newer = new Date("2026-02-01");
      const mockSessions = [
        {
          id: "session-2",
          agentId: "agent-1",
          updatedAt: newer,
          agent: { name: "Agent B", division: "ops", slug: "agent-b", color: "#0000ff", isCustom: false },
          _count: { messages: 3 },
          messages: [],
        },
        {
          id: "session-1",
          agentId: "agent-1",
          updatedAt: older,
          agent: { name: "Agent A", division: "sales", slug: "agent-a", color: "#ff0000", isCustom: false },
          _count: { messages: 1 },
          messages: [{ content: "Hello from user" }],
        },
      ];
      vi.mocked(prisma.chatSession.findMany).mockResolvedValue(mockSessions as never);

      const result = await chatService.getRecentSessions();

      expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: "desc" },
        })
      );
      expect(result[0].updatedAt).toEqual(newer);
      expect(result[1].updatedAt).toEqual(older);
    });

    it("includes agent color and isCustom fields", async () => {
      const mockSessions = [
        {
          id: "session-1",
          agentId: "agent-1",
          updatedAt: new Date(),
          agent: { name: "Custom Agent", division: "ops", slug: "custom-agent", color: "#123456", isCustom: true },
          _count: { messages: 5 },
          messages: [{ content: "My first question to this custom agent" }],
        },
      ];
      vi.mocked(prisma.chatSession.findMany).mockResolvedValue(mockSessions as never);

      const result = await chatService.getRecentSessions();

      expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            agent: expect.objectContaining({
              select: expect.objectContaining({
                color: true,
                isCustom: true,
              }),
            }),
          }),
        })
      );
      expect(result[0].agent.color).toBe("#123456");
      expect(result[0].agent.isCustom).toBe(true);
    });

    it("includes first user message as preview", async () => {
      const mockSessions = [
        {
          id: "session-1",
          agentId: "agent-1",
          updatedAt: new Date(),
          agent: { name: "Agent", division: "sales", slug: "agent", color: "#fff", isCustom: false },
          _count: { messages: 2 },
          messages: [{ content: "This is my first message to the agent" }],
        },
      ];
      vi.mocked(prisma.chatSession.findMany).mockResolvedValue(mockSessions as never);

      const result = await chatService.getRecentSessions();

      expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            messages: expect.objectContaining({
              take: 1,
              where: { role: "user" },
            }),
          }),
        })
      );
      expect(result[0].messages[0].content).toBe("This is my first message to the agent");
    });

    it("returns sessions with no messages (empty preview)", async () => {
      const mockSessions = [
        {
          id: "session-1",
          agentId: "agent-1",
          updatedAt: new Date(),
          agent: { name: "Agent", division: "sales", slug: "agent", color: "#fff", isCustom: false },
          _count: { messages: 0 },
          messages: [],
        },
      ];
      vi.mocked(prisma.chatSession.findMany).mockResolvedValue(mockSessions as never);

      const result = await chatService.getRecentSessions();

      expect(result[0].messages).toHaveLength(0);
    });

    it("respects custom limit parameter", async () => {
      vi.mocked(prisma.chatSession.findMany).mockResolvedValue([] as never);

      await chatService.getRecentSessions(5);

      expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });
});
