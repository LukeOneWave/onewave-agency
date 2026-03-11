import { prisma } from "@/lib/prisma";

export const deliverableService = {
  async getByMessageId(messageId: string) {
    return prisma.deliverable.findMany({
      where: { messageId },
      orderBy: { index: "asc" },
    });
  },

  async getBySessionId(sessionId: string) {
    return prisma.deliverable.findMany({
      where: {
        message: { sessionId },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async upsertStatus(
    messageId: string,
    index: number,
    status: string,
    feedback?: string
  ) {
    return prisma.deliverable.upsert({
      where: {
        messageId_index: { messageId, index },
      },
      update: {
        status,
        ...(feedback !== undefined && { feedback }),
      },
      create: {
        messageId,
        index,
        status,
        feedback: feedback ?? null,
      },
    });
  },

  async getVersions(deliverableId: string) {
    return prisma.deliverableVersion.findMany({
      where: { deliverableId },
      orderBy: { version: "asc" },
    });
  },

  async createVersion(deliverableId: string, content: string) {
    const latest = await prisma.deliverableVersion.findFirst({
      where: { deliverableId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return prisma.deliverableVersion.create({
      data: {
        deliverableId,
        version: (latest?.version ?? 0) + 1,
        content,
      },
    });
  },

  async updateContent(deliverableId: string, content: string) {
    return prisma.deliverable.update({
      where: { id: deliverableId },
      data: { content },
    });
  },

  async getByProjectId(projectId: string) {
    return prisma.deliverable.findMany({
      where: { projectId },
      include: { versions: { orderBy: { version: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
  },
};
