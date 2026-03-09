import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
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
});
