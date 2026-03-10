import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatSession: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    message: {
      aggregate: vi.fn(),
    },
    deliverable: {
      findMany: vi.fn(),
    },
    mission: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { dashboardService } from "@/lib/services/dashboard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dashboardService", () => {
  describe("getStats", () => {
    it("returns activeSessions count, agentsUsed count, and tokensConsumed sum", async () => {
      vi.mocked(prisma.chatSession.count).mockResolvedValue(5 as never);
      vi.mocked(prisma.chatSession.groupBy).mockResolvedValue([
        { agentId: "a1" },
        { agentId: "a2" },
        { agentId: "a3" },
      ] as never);
      vi.mocked(prisma.message.aggregate).mockResolvedValue({
        _sum: { inputTokens: 1000, outputTokens: 2000 },
      } as never);

      const stats = await dashboardService.getStats();

      expect(stats).toEqual({
        activeSessions: 5,
        agentsUsed: 3,
        tokensConsumed: 3000,
      });
    });

    it("returns zeros when no data exists", async () => {
      vi.mocked(prisma.chatSession.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.chatSession.groupBy).mockResolvedValue([] as never);
      vi.mocked(prisma.message.aggregate).mockResolvedValue({
        _sum: { inputTokens: null, outputTokens: null },
      } as never);

      const stats = await dashboardService.getStats();

      expect(stats).toEqual({
        activeSessions: 0,
        agentsUsed: 0,
        tokensConsumed: 0,
      });
    });

    it("handles partial null tokens (only inputTokens null)", async () => {
      vi.mocked(prisma.chatSession.count).mockResolvedValue(1 as never);
      vi.mocked(prisma.chatSession.groupBy).mockResolvedValue([
        { agentId: "a1" },
      ] as never);
      vi.mocked(prisma.message.aggregate).mockResolvedValue({
        _sum: { inputTokens: null, outputTokens: 500 },
      } as never);

      const stats = await dashboardService.getStats();

      expect(stats.tokensConsumed).toBe(500);
    });
  });

  describe("getRecentActivity", () => {
    it("merges chat sessions, missions, and deliverables into sorted timeline", async () => {
      // Chat sessions
      vi.mocked(prisma.chatSession.groupBy).mockResolvedValue([] as never); // for getStats mock compatibility

      const mockChatSessions = [
        {
          id: "s1",
          createdAt: new Date("2026-03-01T10:00:00Z"),
          agent: { name: "Design Lead" },
        },
      ];

      const mockMissions = [
        {
          id: "m1",
          createdAt: new Date("2026-03-01T12:00:00Z"),
          lanes: [{ id: "l1" }, { id: "l2" }],
        },
      ];

      const mockDeliverables = [
        {
          id: "d1",
          status: "approved",
          updatedAt: new Date("2026-03-01T11:00:00Z"),
          message: {
            session: {
              agent: { name: "UX Writer" },
            },
          },
        },
      ];

      // We need to mock the prisma calls used by getRecentActivity
      // The implementation will use chatSession.findMany, mission.findMany, deliverable.findMany
      const chatSessionFindMany = vi.fn().mockResolvedValue(mockChatSessions);
      (prisma.chatSession as any).findMany = chatSessionFindMany;

      vi.mocked(prisma.mission.findMany).mockResolvedValue(mockMissions as never);
      vi.mocked(prisma.deliverable.findMany).mockResolvedValue(mockDeliverables as never);

      const activity = await dashboardService.getRecentActivity();

      expect(activity).toHaveLength(3);
      // Sorted by timestamp descending: mission (12:00), deliverable (11:00), chat (10:00)
      expect(activity[0]).toEqual({
        type: "mission",
        description: "Launched mission with 2 agents",
        timestamp: "2026-03-01T12:00:00.000Z",
      });
      expect(activity[1]).toEqual({
        type: "deliverable",
        description: "Approved deliverable from UX Writer",
        timestamp: "2026-03-01T11:00:00.000Z",
      });
      expect(activity[2]).toEqual({
        type: "chat",
        description: "Started chat with Design Lead",
        timestamp: "2026-03-01T10:00:00.000Z",
      });
    });

    it("uses custom limit parameter", async () => {
      const chatSessionFindMany = vi.fn().mockResolvedValue([]);
      (prisma.chatSession as any).findMany = chatSessionFindMany;
      vi.mocked(prisma.mission.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.deliverable.findMany).mockResolvedValue([] as never);

      await dashboardService.getRecentActivity(5);

      const activity = await dashboardService.getRecentActivity(5);
      expect(activity).toEqual([]);
    });

    it("excludes deliverables with pending status", async () => {
      const chatSessionFindMany = vi.fn().mockResolvedValue([]);
      (prisma.chatSession as any).findMany = chatSessionFindMany;
      vi.mocked(prisma.mission.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.deliverable.findMany).mockResolvedValue([] as never);

      const activity = await dashboardService.getRecentActivity();

      // Deliverable findMany should filter out pending
      expect(prisma.deliverable.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { not: "pending" } },
        })
      );
    });

    it("shows 'Revised deliverable' for revised status", async () => {
      const chatSessionFindMany = vi.fn().mockResolvedValue([]);
      (prisma.chatSession as any).findMany = chatSessionFindMany;
      vi.mocked(prisma.mission.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.deliverable.findMany).mockResolvedValue([
        {
          id: "d1",
          status: "revised",
          updatedAt: new Date("2026-03-01T11:00:00Z"),
          message: {
            session: {
              agent: { name: "Copywriter" },
            },
          },
        },
      ] as never);

      const activity = await dashboardService.getRecentActivity();

      expect(activity[0]).toEqual({
        type: "deliverable",
        description: "Revised deliverable from Copywriter",
        timestamp: "2026-03-01T11:00:00.000Z",
      });
    });
  });

  describe("getAgentUtilization", () => {
    it("returns top 10 agents by session count with names and colors", async () => {
      vi.mocked(prisma.chatSession.groupBy).mockResolvedValue([
        { agentId: "a1", _count: { _all: 10 } },
        { agentId: "a2", _count: { _all: 5 } },
      ] as never);

      const agentFindMany = vi.fn().mockResolvedValue([
        { id: "a1", name: "Design Lead", color: "#FF0000" },
        { id: "a2", name: "UX Writer", color: "#00FF00" },
      ]);
      (prisma as any).agent = { findMany: agentFindMany };

      const utilization = await dashboardService.getAgentUtilization();

      expect(utilization).toEqual([
        { name: "Design Lead", color: "#FF0000", sessions: 10 },
        { name: "UX Writer", color: "#00FF00", sessions: 5 },
      ]);
    });

    it("returns empty array when no sessions exist", async () => {
      vi.mocked(prisma.chatSession.groupBy).mockResolvedValue([] as never);

      const utilization = await dashboardService.getAgentUtilization();

      expect(utilization).toEqual([]);
    });

    it("limits results to top 10", async () => {
      vi.mocked(prisma.chatSession.groupBy).mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          agentId: `a${i}`,
          _count: { _all: 100 - i },
        })) as never
      );

      const agentFindMany = vi.fn().mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `a${i}`,
          name: `Agent ${i}`,
          color: `#${i}${i}${i}`,
        }))
      );
      (prisma as any).agent = { findMany: agentFindMany };

      const utilization = await dashboardService.getAgentUtilization();

      expect(utilization).toHaveLength(10);
      expect(prisma.chatSession.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });
});
