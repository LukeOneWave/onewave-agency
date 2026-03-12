import { prisma } from "@/lib/prisma";

export const chatService = {
  async createSession(agentId: string, model: string, projectId?: string) {
    return prisma.chatSession.create({
      data: { agentId, model, ...(projectId ? { projectId } : {}) },
      include: { agent: true },
    });
  },

  async getSession(id: string) {
    return prisma.chatSession.findUnique({
      where: { id },
      include: {
        agent: true,
        project: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  },

  async getSessionMessages(sessionId: string) {
    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
  },

  async addMessage(
    sessionId: string,
    role: string,
    content: string,
    tokens?: { input?: number; output?: number }
  ) {
    return prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        inputTokens: tokens?.input ?? null,
        outputTokens: tokens?.output ?? null,
      },
    });
  },

  async getRecentSessions(limit = 20) {
    return prisma.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        agent: { select: { name: true, division: true, slug: true, color: true, isCustom: true } },
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: "asc" },
          where: { role: "user" },
          select: { content: true },
        },
      },
    });
  },

  async updateSessionTitle(id: string, title: string) {
    return prisma.chatSession.update({
      where: { id },
      data: { title },
    });
  },

  async updateSessionProject(id: string, projectId: string | null) {
    // Update the session
    const session = await prisma.chatSession.update({
      where: { id },
      data: { projectId },
    });

    // Bulk-update all existing deliverables in this session
    await prisma.deliverable.updateMany({
      where: {
        message: { sessionId: id },
      },
      data: { projectId },
    });

    return session;
  },
};
