import { prisma } from "@/lib/prisma";
import type { UpdateTaskStatusInput } from "@/lib/validations/task";

export interface CreateTaskData {
  projectId: string;
  title: string;
  description?: string;
  assignedAgentId?: string;
}

export const taskService = {
  async create(data: CreateTaskData) {
    const aggregate = await prisma.task.aggregate({
      where: { projectId: data.projectId, status: "todo" },
      _max: { order: true },
    });

    const maxOrder = aggregate._max.order;
    const order = maxOrder !== null ? maxOrder + 1 : 0;

    return prisma.task.create({
      data: {
        title: data.title,
        projectId: data.projectId,
        order,
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.assignedAgentId !== undefined ? { assignedAgentId: data.assignedAgentId } : {}),
      },
    });
  },

  async updateStatus(id: string, data: UpdateTaskStatusInput) {
    return prisma.task.update({
      where: { id },
      data: {
        status: data.status,
        order: data.order,
      },
    });
  },

  async delete(id: string) {
    return prisma.task.delete({ where: { id } });
  },
};
