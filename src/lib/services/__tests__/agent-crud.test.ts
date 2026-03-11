import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { agentService } from "@/lib/services/agent";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockCustomAgent = {
  id: "agent-custom-1",
  name: "My Custom Agent",
  slug: "my-custom-agent",
  division: "engineering",
  description: "A custom agent for testing",
  color: "#6366f1",
  tools: null,
  systemPrompt: "## Role\nTest role\n\n## Personality\nTest personality\n\n## Process\nTest process",
  rawMarkdown: "---\nname: My Custom Agent\n---\n\n## Role\nTest role",
  isCustom: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  sessions: [],
  _count: { sessions: 0 },
};

const mockSeededAgent = {
  ...mockCustomAgent,
  id: "agent-seeded-1",
  slug: "seeded-agent",
  isCustom: false,
};

describe("agentService - create", () => {
  it("creates a custom agent with valid input and sets isCustom=true", async () => {
    vi.mocked(prisma.agent.findMany).mockResolvedValue([]);
    vi.mocked(prisma.agent.create).mockResolvedValue(mockCustomAgent as never);

    const input = {
      name: "My Custom Agent",
      division: "engineering",
      description: "A custom agent for testing",
      role: "Test role",
      personality: "Test personality",
      process: "Test process",
      color: "#6366f1",
    };

    const result = await agentService.create(input);

    expect(prisma.agent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "My Custom Agent",
          slug: "my-custom-agent",
          isCustom: true,
        }),
      })
    );
    expect(result).toEqual(mockCustomAgent);
  });

  it("generates slug from name (lowercase, spaces to hyphens)", async () => {
    vi.mocked(prisma.agent.findMany).mockResolvedValue([]);
    vi.mocked(prisma.agent.create).mockResolvedValue({ ...mockCustomAgent, name: "Hello World Agent" } as never);

    await agentService.create({
      name: "Hello World Agent",
      division: "engineering",
      description: "desc",
      role: "role",
      personality: "personality",
      process: "process",
    });

    expect(prisma.agent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "hello-world-agent",
        }),
      })
    );
  });

  it("appends -2 suffix when slug already exists", async () => {
    vi.mocked(prisma.agent.findMany)
      .mockResolvedValueOnce([{ slug: "my-agent" }] as never)
      .mockResolvedValueOnce([]);
    vi.mocked(prisma.agent.create).mockResolvedValue({ ...mockCustomAgent, slug: "my-agent-2" } as never);

    await agentService.create({
      name: "My Agent",
      division: "engineering",
      description: "desc",
      role: "role",
      personality: "personality",
      process: "process",
    });

    expect(prisma.agent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "my-agent-2",
        }),
      })
    );
  });

  it("appends -3 suffix when -2 also exists", async () => {
    vi.mocked(prisma.agent.findMany)
      .mockResolvedValueOnce([{ slug: "my-agent" }] as never)
      .mockResolvedValueOnce([{ slug: "my-agent-2" }] as never)
      .mockResolvedValueOnce([]);
    vi.mocked(prisma.agent.create).mockResolvedValue({ ...mockCustomAgent, slug: "my-agent-3" } as never);

    await agentService.create({
      name: "My Agent",
      division: "engineering",
      description: "desc",
      role: "role",
      personality: "personality",
      process: "process",
    });

    expect(prisma.agent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "my-agent-3",
        }),
      })
    );
  });

  it("composes systemPrompt with Role, Personality, Process sections", async () => {
    vi.mocked(prisma.agent.findMany).mockResolvedValue([]);
    vi.mocked(prisma.agent.create).mockResolvedValue(mockCustomAgent as never);

    await agentService.create({
      name: "My Custom Agent",
      division: "engineering",
      description: "A custom agent for testing",
      role: "Be helpful",
      personality: "Friendly and concise",
      process: "Step by step",
    });

    const createCall = vi.mocked(prisma.agent.create).mock.calls[0][0];
    const systemPrompt = (createCall as { data: { systemPrompt: string } }).data.systemPrompt;
    expect(systemPrompt).toContain("## Role");
    expect(systemPrompt).toContain("Be helpful");
    expect(systemPrompt).toContain("## Personality");
    expect(systemPrompt).toContain("Friendly and concise");
    expect(systemPrompt).toContain("## Process");
    expect(systemPrompt).toContain("Step by step");
  });
});

describe("agentService - update", () => {
  it("updates a custom agent and returns updated agent", async () => {
    const updatedAgent = { ...mockCustomAgent, description: "Updated description" };
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockCustomAgent as never);
    vi.mocked(prisma.agent.update).mockResolvedValue(updatedAgent as never);

    const result = await agentService.update("agent-custom-1", {
      description: "Updated description",
    });

    expect(prisma.agent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "agent-custom-1" },
      })
    );
    expect(result).toEqual(updatedAgent);
  });

  it("throws error when agent has isCustom=false", async () => {
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockSeededAgent as never);

    await expect(
      agentService.update("agent-seeded-1", { description: "Updated" })
    ).rejects.toThrow(/not custom|cannot edit|seeded/i);
  });

  it("throws error when agent is not found", async () => {
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);

    await expect(
      agentService.update("nonexistent-id", { description: "Updated" })
    ).rejects.toThrow(/not found/i);
  });

  it("recomposes systemPrompt when role/personality/process are updated", async () => {
    const agentWithPromptData = {
      ...mockCustomAgent,
      systemPrompt: "## Role\nOld role\n\n## Personality\nOld personality\n\n## Process\nOld process",
      rawMarkdown: "---\nname: My Custom Agent\n---\n\n## Role\nOld role",
    };
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(agentWithPromptData as never);
    vi.mocked(prisma.agent.update).mockResolvedValue(mockCustomAgent as never);

    await agentService.update("agent-custom-1", {
      role: "New role",
    });

    const updateCall = vi.mocked(prisma.agent.update).mock.calls[0][0];
    const systemPrompt = (updateCall as { data: { systemPrompt: string } }).data.systemPrompt;
    expect(systemPrompt).toContain("New role");
  });
});

describe("agentService - delete", () => {
  it("deletes a custom agent with no sessions", async () => {
    const agentWithCount = { ...mockCustomAgent, _count: { sessions: 0 } };
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(agentWithCount as never);
    vi.mocked(prisma.agent.delete).mockResolvedValue(agentWithCount as never);

    await agentService.delete("agent-custom-1");

    expect(prisma.agent.delete).toHaveBeenCalledWith({ where: { id: "agent-custom-1" } });
  });

  it("throws error when agent has isCustom=false", async () => {
    const seededWithCount = { ...mockSeededAgent, _count: { sessions: 0 } };
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(seededWithCount as never);

    await expect(agentService.delete("agent-seeded-1")).rejects.toThrow(
      /not custom|cannot delete|seeded/i
    );
  });

  it("throws error with session count when agent has existing chat sessions", async () => {
    const agentWithSessions = { ...mockCustomAgent, _count: { sessions: 3 } };
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(agentWithSessions as never);

    await expect(agentService.delete("agent-custom-1")).rejects.toThrow(/3/);
  });

  it("throws not found error when agent does not exist", async () => {
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);

    await expect(agentService.delete("nonexistent-id")).rejects.toThrow(/not found/i);
  });
});

describe("agentService - getForClone", () => {
  it("returns form-ready data with name suffixed with (Copy)", async () => {
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockCustomAgent as never);

    const result = await agentService.getForClone("my-custom-agent");

    expect(result).toBeTruthy();
    expect(result!.name).toBe("My Custom Agent (Copy)");
  });

  it("returns null when slug not found", async () => {
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);

    const result = await agentService.getForClone("non-existent-slug");

    expect(result).toBeNull();
  });

  it("includes form fields: division, description, color", async () => {
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockCustomAgent as never);

    const result = await agentService.getForClone("my-custom-agent");

    expect(result).toMatchObject({
      division: "engineering",
      description: "A custom agent for testing",
      color: "#6366f1",
    });
  });
});
