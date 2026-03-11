import { prisma } from "@/lib/prisma";
import { chatService } from "@/lib/services/chat";

export const orchestrationService = {
  async createMission(
    agentIds: string[],
    brief: string,
    model: string = "claude-sonnet-4-6"
  ) {
    if (agentIds.length === 0) {
      throw new Error("At least one agent is required");
    }

    // Create a ChatSession for each agent
    const sessions = await Promise.all(
      agentIds.map((agentId) => chatService.createSession(agentId, model))
    );

    // Create Mission with nested MissionLane records
    const mission = await prisma.mission.create({
      data: {
        brief,
        model,
        lanes: {
          create: agentIds.map((agentId, i) => ({
            agentId,
            sessionId: sessions[i].id,
          })),
        },
      },
      include: {
        lanes: {
          include: {
            agent: {
              select: {
                name: true,
                division: true,
                color: true,
                slug: true,
                systemPrompt: true,
              },
            },
            session: true,
          },
        },
      },
    });

    return mission;
  },

  async getMission(id: string) {
    return prisma.mission.findUnique({
      where: { id },
      include: {
        lanes: {
          include: {
            agent: {
              select: {
                name: true,
                division: true,
                color: true,
                slug: true,
                systemPrompt: true,
              },
            },
            session: true,
          },
        },
      },
    });
  },

  async updateMissionStatus(id: string, status: string) {
    return prisma.mission.update({
      where: { id },
      data: { status },
    });
  },

  async updateLaneStatus(id: string, status: string) {
    return prisma.missionLane.update({
      where: { id },
      data: { status },
    });
  },

  async getMissionDeliverables(missionId: string) {
    return prisma.deliverable.findMany({
      where: {
        message: { session: { missionLane: { missionId } } },
      },
      include: {
        versions: { orderBy: { version: "asc" } },
        message: {
          include: {
            session: {
              include: {
                missionLane: {
                  include: { agent: { select: { name: true, color: true, division: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
