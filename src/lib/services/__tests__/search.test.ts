import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: {
      findMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    chatSession: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { searchService } from "@/lib/services/search";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockAgents = [
  { id: "agent-1", name: "Design System Agent", slug: "design-system-agent", division: "design" },
  { id: "agent-2", name: "Content Writer", slug: "content-writer", division: "marketing" },
];

const mockProjects = [
  { id: "proj-1", name: "Design Redesign" },
  { id: "proj-2", name: "Brand Guide" },
];

const mockSessions = [
  { id: "sess-1", title: "UI design review", agent: { name: "Design System Agent" } },
  { id: "sess-2", title: "Meeting notes", agent: { name: "Content Writer" } },
];

describe("searchService.query - matching results", () => {
  it("returns matching agents, projects, and sessions for a valid query", async () => {
    vi.mocked(prisma.agent.findMany).mockResolvedValue(mockAgents as never);
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);
    vi.mocked(prisma.chatSession.findMany).mockResolvedValue(mockSessions as never);

    const result = await searchService.query("design");

    expect(result.agents).toEqual(mockAgents);
    expect(result.projects).toEqual(mockProjects);
    expect(result.sessions).toHaveLength(2);
  });
});

describe("searchService.query - empty query", () => {
  it("returns empty arrays for empty string query", async () => {
    const result = await searchService.query("");

    expect(result).toEqual({ agents: [], projects: [], sessions: [] });
    expect(prisma.agent.findMany).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.chatSession.findMany).not.toHaveBeenCalled();
  });
});

describe("searchService.query - whitespace query", () => {
  it("returns empty arrays for whitespace-only query", async () => {
    const result = await searchService.query("   ");

    expect(result).toEqual({ agents: [], projects: [], sessions: [] });
    expect(prisma.agent.findMany).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.chatSession.findMany).not.toHaveBeenCalled();
  });
});

describe("searchService.query - session mapping", () => {
  it("maps agent.name to agentName field in session results", async () => {
    vi.mocked(prisma.agent.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.chatSession.findMany).mockResolvedValue([
      { id: "sess-1", title: "UI design review", agent: { name: "Design System Agent" } },
    ] as never);

    const result = await searchService.query("design");

    expect(result.sessions[0]).toMatchObject({
      id: "sess-1",
      title: "UI design review",
      agentName: "Design System Agent",
    });
    expect(result.sessions[0]).not.toHaveProperty("agent");
  });
});

describe("searchService.query - result limits", () => {
  it("passes take: 5 to all Prisma queries", async () => {
    vi.mocked(prisma.agent.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.chatSession.findMany).mockResolvedValue([] as never);

    await searchService.query("test");

    expect(prisma.agent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
    expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });
});
