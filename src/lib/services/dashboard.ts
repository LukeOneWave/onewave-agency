import { prisma } from "@/lib/prisma";

export interface DashboardStats {
  activeSessions: number;
  agentsUsed: number;
  tokensConsumed: number;
}

export interface ActivityItem {
  type: "chat" | "mission" | "deliverable";
  description: string;
  timestamp: string;
}

export interface AgentUtilization {
  name: string;
  color: string;
  sessions: number;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [activeSessions, agentGroups, tokenAgg] = await Promise.all([
      prisma.chatSession.count(),
      prisma.chatSession.groupBy({ by: ["agentId"] }),
      prisma.message.aggregate({
        _sum: { inputTokens: true, outputTokens: true },
      }),
    ]);

    return {
      activeSessions,
      agentsUsed: agentGroups.length,
      tokensConsumed:
        (tokenAgg._sum.inputTokens ?? 0) + (tokenAgg._sum.outputTokens ?? 0),
    };
  },

  async getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
    const [chatSessions, missions, deliverables] = await Promise.all([
      prisma.chatSession.findMany({
        orderBy: { createdAt: "desc" },
        include: { agent: { select: { name: true } } },
      }),
      prisma.mission.findMany({
        orderBy: { createdAt: "desc" },
        include: { lanes: true },
      }),
      prisma.deliverable.findMany({
        where: { status: { not: "pending" } },
        orderBy: { updatedAt: "desc" },
        include: {
          message: {
            include: {
              session: {
                include: { agent: { select: { name: true } } },
              },
            },
          },
        },
      }),
    ]);

    const items: ActivityItem[] = [];

    for (const session of chatSessions) {
      items.push({
        type: "chat",
        description: `Started chat with ${session.agent.name}`,
        timestamp: session.createdAt.toISOString(),
      });
    }

    for (const mission of missions) {
      items.push({
        type: "mission",
        description: `Launched mission with ${mission.lanes.length} agents`,
        timestamp: mission.createdAt.toISOString(),
      });
    }

    for (const deliverable of deliverables) {
      const agentName = deliverable.message.session.agent.name;
      const action =
        deliverable.status === "approved" ? "Approved" : "Revised";
      items.push({
        type: "deliverable",
        description: `${action} deliverable from ${agentName}`,
        timestamp: deliverable.updatedAt.toISOString(),
      });
    }

    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return items.slice(0, limit);
  },

  async getAgentUtilization(): Promise<AgentUtilization[]> {
    const groups = await prisma.chatSession.groupBy({
      by: ["agentId"],
      _count: { _all: true },
      orderBy: { _count: { agentId: "desc" } },
      take: 10,
    });

    if (groups.length === 0) return [];

    const agentIds = groups.map((g) => g.agentId);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, color: true },
    });

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    return groups.map((g) => {
      const agent = agentMap.get(g.agentId)!;
      return {
        name: agent.name,
        color: agent.color,
        sessions: g._count._all,
      };
    });
  },
};
