import { prisma } from "@/lib/prisma";

export interface AgentFilters {
  division?: string;
  search?: string;
}

export const agentService = {
  async getAll(filters?: AgentFilters) {
    const where: Record<string, unknown> = {};

    if (filters?.division) {
      where.division = filters.division;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return prisma.agent.findMany({
      where,
      orderBy: [{ division: "asc" }, { name: "asc" }],
    });
  },

  async getBySlug(slug: string) {
    return prisma.agent.findUnique({ where: { slug } });
  },

  async getDivisions() {
    const results = await prisma.agent.groupBy({
      by: ["division"],
      orderBy: { division: "asc" },
    });
    return results.map((r) => r.division);
  },

  async getCount() {
    return prisma.agent.count();
  },
};
