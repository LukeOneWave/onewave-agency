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
};
