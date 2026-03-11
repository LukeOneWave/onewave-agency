import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    mission: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    missionLane: {
      update: vi.fn(),
    },
    deliverable: {
      findMany: vi.fn(),
    },
  },
}));

// Mock chatService
vi.mock("@/lib/services/chat", () => ({
  chatService: {
    createSession: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { chatService } from "@/lib/services/chat";
import { orchestrationService } from "@/lib/services/orchestration";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockPrisma = prisma as any;
const mockChatService = vi.mocked(chatService);

describe("orchestrationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createMission", () => {
    it("creates a Mission with N MissionLanes, each with a ChatSession", async () => {
      const agentIds = ["agent-1", "agent-2"];
      const brief = "Build a landing page";

      // Mock chatService.createSession returns
      mockChatService.createSession
        .mockResolvedValueOnce({
          id: "session-1",
          agentId: "agent-1",
          model: "claude-sonnet-4-6",
          title: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          agent: {
            id: "agent-1",
            name: "Designer",
            slug: "designer",
            division: "Design",
            description: "A designer",
            color: "#ff0000",
            tools: null,
            systemPrompt: "You are a designer",
            rawMarkdown: "",
            isCustom: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .mockResolvedValueOnce({
          id: "session-2",
          agentId: "agent-2",
          model: "claude-sonnet-4-6",
          title: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          agent: {
            id: "agent-2",
            name: "Developer",
            slug: "developer",
            division: "Engineering",
            description: "A developer",
            color: "#00ff00",
            tools: null,
            systemPrompt: "You are a developer",
            rawMarkdown: "",
            isCustom: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

      const mockMission = {
        id: "mission-1",
        brief,
        model: "claude-sonnet-4-6",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        lanes: [
          {
            id: "lane-1",
            missionId: "mission-1",
            agentId: "agent-1",
            sessionId: "session-1",
            status: "pending",
            createdAt: new Date(),
          },
          {
            id: "lane-2",
            missionId: "mission-1",
            agentId: "agent-2",
            sessionId: "session-2",
            status: "pending",
            createdAt: new Date(),
          },
        ],
      };

      mockPrisma.mission.create.mockResolvedValue(mockMission as never);

      const result = await orchestrationService.createMission(agentIds, brief);

      // Should create sessions for each agent
      expect(mockChatService.createSession).toHaveBeenCalledTimes(2);
      expect(mockChatService.createSession).toHaveBeenCalledWith(
        "agent-1",
        "claude-sonnet-4-6"
      );
      expect(mockChatService.createSession).toHaveBeenCalledWith(
        "agent-2",
        "claude-sonnet-4-6"
      );

      // Should create mission with nested lanes
      expect(mockPrisma.mission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            brief,
            model: "claude-sonnet-4-6",
            lanes: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  agentId: "agent-1",
                  sessionId: "session-1",
                }),
                expect.objectContaining({
                  agentId: "agent-2",
                  sessionId: "session-2",
                }),
              ]),
            },
          }),
        })
      );

      expect(result).toEqual(mockMission);
    });

    it("throws when agentIds is empty", async () => {
      await expect(
        orchestrationService.createMission([], "some brief")
      ).rejects.toThrow("At least one agent is required");
    });

    it("uses custom model when provided", async () => {
      const agentIds = ["agent-1"];

      mockChatService.createSession.mockResolvedValueOnce({
        id: "session-1",
        agentId: "agent-1",
        model: "claude-opus-4-6",
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        agent: {
          id: "agent-1",
          name: "Designer",
          slug: "designer",
          division: "Design",
          description: "A designer",
          color: "#ff0000",
          tools: null,
          systemPrompt: "You are a designer",
          rawMarkdown: "",
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      mockPrisma.mission.create.mockResolvedValue({
        id: "mission-1",
        brief: "test",
        model: "claude-opus-4-6",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        lanes: [],
      } as never);

      await orchestrationService.createMission(
        agentIds,
        "test",
        "claude-opus-4-6"
      );

      expect(mockChatService.createSession).toHaveBeenCalledWith(
        "agent-1",
        "claude-opus-4-6"
      );
    });
  });

  describe("getMission", () => {
    it("returns mission with lanes including agent details", async () => {
      const mockMission = {
        id: "mission-1",
        brief: "Build something",
        model: "claude-sonnet-4-6",
        status: "done",
        createdAt: new Date(),
        updatedAt: new Date(),
        lanes: [
          {
            id: "lane-1",
            missionId: "mission-1",
            agentId: "agent-1",
            sessionId: "session-1",
            status: "done",
            createdAt: new Date(),
            agent: {
              name: "Designer",
              division: "Design",
              color: "#ff0000",
              slug: "designer",
              systemPrompt: "You are a designer",
            },
            session: { id: "session-1" },
          },
        ],
      };

      mockPrisma.mission.findUnique.mockResolvedValue(mockMission as never);

      const result = await orchestrationService.getMission("mission-1");

      expect(mockPrisma.mission.findUnique).toHaveBeenCalledWith({
        where: { id: "mission-1" },
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

      expect(result).toEqual(mockMission);
    });

    it("returns null for invalid id", async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(null as never);

      const result = await orchestrationService.getMission("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("updateMissionStatus", () => {
    it("updates the mission status field", async () => {
      mockPrisma.mission.update.mockResolvedValue({
        id: "mission-1",
        status: "streaming",
      } as never);

      await orchestrationService.updateMissionStatus("mission-1", "streaming");

      expect(mockPrisma.mission.update).toHaveBeenCalledWith({
        where: { id: "mission-1" },
        data: { status: "streaming" },
      });
    });
  });

  describe("updateLaneStatus", () => {
    it("updates a lane's status field", async () => {
      mockPrisma.missionLane.update.mockResolvedValue({
        id: "lane-1",
        status: "done",
      } as never);

      await orchestrationService.updateLaneStatus("lane-1", "done");

      expect(mockPrisma.missionLane.update).toHaveBeenCalledWith({
        where: { id: "lane-1" },
        data: { status: "done" },
      });
    });
  });

  describe("getMissionDeliverables", () => {
    it("returns deliverables traversing mission > lane > session > message chain", async () => {
      const mockDeliverables = [
        {
          id: "deliv-1",
          messageId: "msg-1",
          index: 0,
          status: "pending",
          feedback: null,
          content: "Deliverable content",
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          versions: [],
          message: {
            id: "msg-1",
            sessionId: "session-1",
            role: "assistant",
            content: "message content",
            inputTokens: null,
            outputTokens: null,
            createdAt: new Date(),
            session: {
              id: "session-1",
              agentId: "agent-1",
              model: "claude-sonnet-4-6",
              title: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              missionLane: {
                id: "lane-1",
                missionId: "mission-1",
                agentId: "agent-1",
                sessionId: "session-1",
                status: "done",
                createdAt: new Date(),
                agent: {
                  name: "Designer",
                  color: "#ff0000",
                  division: "Design",
                },
              },
            },
          },
        },
      ];

      mockPrisma.deliverable.findMany.mockResolvedValue(mockDeliverables as never);

      const result = await orchestrationService.getMissionDeliverables("mission-1");

      expect(mockPrisma.deliverable.findMany).toHaveBeenCalledWith({
        where: {
          message: { session: { missionLane: { missionId: "mission-1" } } },
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

      expect(result).toEqual(mockDeliverables);
    });

    it("returns empty array when mission has no deliverables", async () => {
      mockPrisma.deliverable.findMany.mockResolvedValue([]);

      const result = await orchestrationService.getMissionDeliverables("mission-empty");

      expect(result).toEqual([]);
    });
  });
});
