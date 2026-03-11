import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { projectService } from "@/lib/services/project";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockProject = {
  id: "project-1",
  name: "Test Project",
  description: "A test project",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProjectWithTasks = {
  ...mockProject,
  tasks: [
    {
      id: "task-1",
      title: "Task One",
      description: null,
      status: "todo",
      order: 0,
      projectId: "project-1",
      assignedAgentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedAgent: null,
    },
  ],
};

describe("projectService - create", () => {
  it("creates and returns a project with name and description", async () => {
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject as never);

    const result = await projectService.create({
      name: "Test Project",
      description: "A test project",
    });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Test Project",
        description: "A test project",
      },
    });
    expect(result).toEqual(mockProject);
  });

  it("creates a project without description", async () => {
    const projectNoDesc = { ...mockProject, description: null };
    vi.mocked(prisma.project.create).mockResolvedValue(projectNoDesc as never);

    const result = await projectService.create({ name: "Test Project" });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: { name: "Test Project" },
    });
    expect(result).toEqual(projectNoDesc);
  });
});

describe("projectService - getAll", () => {
  it("returns projects with task status counts", async () => {
    const projectsWithCounts = [
      {
        ...mockProject,
        _count: { tasks: 2 },
        tasks: [{ status: "todo", assignedAgent: null }],
      },
    ];
    vi.mocked(prisma.project.findMany).mockResolvedValue(projectsWithCounts as never);

    const result = await projectService.getAll();

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: expect.objectContaining({ select: { tasks: true } }),
        }),
        orderBy: { createdAt: "desc" },
      })
    );
    expect(result).toEqual(projectsWithCounts);
  });
});

describe("projectService - getById", () => {
  it("returns project with tasks including assignedAgent", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProjectWithTasks as never);

    const result = await projectService.getById("project-1");

    expect(prisma.project.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "project-1" },
        include: expect.objectContaining({
          tasks: expect.objectContaining({
            include: expect.objectContaining({
              assignedAgent: expect.objectContaining({
                select: expect.objectContaining({
                  id: true,
                  name: true,
                  color: true,
                  slug: true,
                }),
              }),
            }),
          }),
        }),
      })
    );
    expect(result).toEqual(mockProjectWithTasks);
  });

  it("returns null for non-existent project", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const result = await projectService.getById("nonexistent-id");

    expect(result).toBeNull();
  });
});

describe("projectService - delete", () => {
  it("deletes a project by id", async () => {
    vi.mocked(prisma.project.delete).mockResolvedValue(mockProject as never);

    await projectService.delete("project-1");

    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: "project-1" },
    });
  });
});
