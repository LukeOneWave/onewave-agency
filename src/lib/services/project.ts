import { prisma } from "@/lib/prisma";
import type { CreateProjectInput } from "@/lib/validations/project";

export const projectService = {
  async getAll() {
    return prisma.project.findMany({
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          select: {
            status: true,
            assignedAgent: {
              select: { id: true, name: true, color: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignedAgent: {
              select: { id: true, name: true, color: true, slug: true },
            },
          },
          orderBy: [{ status: "asc" }, { order: "asc" }],
        },
      },
    });
  },

  async create(data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        name: data.name,
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });
  },

  async delete(id: string) {
    return prisma.project.delete({ where: { id } });
  },
};
