import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { taskService } from "@/lib/services/task";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockTask = {
  id: "task-1",
  projectId: "project-1",
  title: "Test Task",
  description: null,
  status: "todo",
  assignedAgentId: null,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("taskService - create", () => {
  it("creates task with order = 0 when no existing tasks in column", async () => {
    vi.mocked(prisma.task.aggregate).mockResolvedValue({ _max: { order: null } } as never);
    vi.mocked(prisma.task.create).mockResolvedValue(mockTask as never);

    const result = await taskService.create({
      projectId: "project-1",
      title: "Test Task",
    });

    expect(prisma.task.aggregate).toHaveBeenCalledWith({
      where: { projectId: "project-1", status: "todo" },
      _max: { order: true },
    });
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Test Task",
          projectId: "project-1",
          order: 0,
        }),
      })
    );
    expect(result).toEqual(mockTask);
  });

  it("creates task with order = max(order) + 1 when tasks exist in column", async () => {
    vi.mocked(prisma.task.aggregate).mockResolvedValue({ _max: { order: 2 } } as never);
    const taskWithOrder3 = { ...mockTask, order: 3 };
    vi.mocked(prisma.task.create).mockResolvedValue(taskWithOrder3 as never);

    await taskService.create({
      projectId: "project-1",
      title: "Test Task",
    });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          order: 3,
        }),
      })
    );
  });

  it("creates task with description and assignedAgentId when provided", async () => {
    vi.mocked(prisma.task.aggregate).mockResolvedValue({ _max: { order: null } } as never);
    const taskWithAgent = { ...mockTask, description: "Desc", assignedAgentId: "agent-1" };
    vi.mocked(prisma.task.create).mockResolvedValue(taskWithAgent as never);

    await taskService.create({
      projectId: "project-1",
      title: "Test Task",
      description: "Desc",
      assignedAgentId: "agent-1",
    });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Desc",
          assignedAgentId: "agent-1",
        }),
      })
    );
  });
});

describe("taskService - updateStatus", () => {
  it("updates both status and order fields", async () => {
    const updatedTask = { ...mockTask, status: "in_progress", order: 1 };
    vi.mocked(prisma.task.update).mockResolvedValue(updatedTask as never);

    const result = await taskService.updateStatus("task-1", {
      status: "in_progress",
      order: 1,
    });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: {
        status: "in_progress",
        order: 1,
      },
    });
    expect(result).toEqual(updatedTask);
  });
});

describe("taskService - delete", () => {
  it("deletes a task by id", async () => {
    vi.mocked(prisma.task.delete).mockResolvedValue(mockTask as never);

    await taskService.delete("task-1");

    expect(prisma.task.delete).toHaveBeenCalledWith({
      where: { id: "task-1" },
    });
  });
});
