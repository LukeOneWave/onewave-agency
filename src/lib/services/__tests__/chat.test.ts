import { describe, it, expect, afterAll } from "vitest";
import { chatService } from "@/lib/services/chat";
import { agentService } from "@/lib/services/agent";
import { prisma } from "@/lib/prisma";

// Track created sessions for cleanup
const createdSessionIds: string[] = [];

afterAll(async () => {
  // Clean up test data
  for (const id of createdSessionIds) {
    await prisma.chatSession.delete({ where: { id } }).catch(() => {});
  }
});

describe("chatService", () => {
  describe("createSession", () => {
    it("creates a session linked to an agent", async () => {
      const agents = await agentService.getAll();
      const agent = agents[0];

      const session = await chatService.createSession(
        agent.id,
        "claude-sonnet-4-6"
      );
      createdSessionIds.push(session.id);

      expect(session.id).toBeDefined();
      expect(session.agentId).toBe(agent.id);
      expect(session.model).toBe("claude-sonnet-4-6");
      expect(session.agent).toBeDefined();
      expect(session.agent.name).toBe(agent.name);
    });
  });

  describe("getSession", () => {
    it("returns session with agent and messages", async () => {
      const agents = await agentService.getAll();
      const created = await chatService.createSession(
        agents[0].id,
        "claude-sonnet-4-6"
      );
      createdSessionIds.push(created.id);

      const session = await chatService.getSession(created.id);
      expect(session).not.toBeNull();
      expect(session!.agent).toBeDefined();
      expect(session!.messages).toEqual([]);
    });

    it("returns null for non-existent session", async () => {
      const session = await chatService.getSession("non-existent-id");
      expect(session).toBeNull();
    });
  });

  describe("addMessage", () => {
    it("adds a message to a session", async () => {
      const agents = await agentService.getAll();
      const session = await chatService.createSession(
        agents[0].id,
        "claude-sonnet-4-6"
      );
      createdSessionIds.push(session.id);

      const message = await chatService.addMessage(
        session.id,
        "user",
        "Hello!"
      );
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello!");
      expect(message.sessionId).toBe(session.id);
    });

    it("adds a message with token counts", async () => {
      const agents = await agentService.getAll();
      const session = await chatService.createSession(
        agents[0].id,
        "claude-sonnet-4-6"
      );
      createdSessionIds.push(session.id);

      const message = await chatService.addMessage(
        session.id,
        "assistant",
        "Hi there!",
        { input: 10, output: 5 }
      );
      expect(message.inputTokens).toBe(10);
      expect(message.outputTokens).toBe(5);
    });
  });

  describe("getSessionMessages", () => {
    it("returns messages in chronological order", async () => {
      const agents = await agentService.getAll();
      const session = await chatService.createSession(
        agents[0].id,
        "claude-sonnet-4-6"
      );
      createdSessionIds.push(session.id);

      await chatService.addMessage(session.id, "user", "First");
      await chatService.addMessage(session.id, "assistant", "Second");
      await chatService.addMessage(session.id, "user", "Third");

      const messages = await chatService.getSessionMessages(session.id);
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe("First");
      expect(messages[1].content).toBe("Second");
      expect(messages[2].content).toBe("Third");
    });
  });

  describe("updateSessionTitle", () => {
    it("updates the session title", async () => {
      const agents = await agentService.getAll();
      const session = await chatService.createSession(
        agents[0].id,
        "claude-sonnet-4-6"
      );
      createdSessionIds.push(session.id);

      await chatService.updateSessionTitle(session.id, "My Chat");
      const updated = await chatService.getSession(session.id);
      expect(updated!.title).toBe("My Chat");
    });
  });
});
