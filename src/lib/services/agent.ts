import { prisma } from "@/lib/prisma";
import type { AgentCreateInput, AgentUpdateInput } from "@/types/agent";

export interface AgentFilters {
  division?: string;
  search?: string;
}

// --- Helpers ---

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const existing = await prisma.agent.findMany({
    where: { slug: baseSlug },
    select: { slug: true },
  });

  if (existing.length === 0) {
    return baseSlug;
  }

  let counter = 2;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    const conflict = await prisma.agent.findMany({
      where: { slug: candidate },
      select: { slug: true },
    });
    if (conflict.length === 0) {
      return candidate;
    }
    counter++;
  }
}

function buildSystemPrompt({
  role,
  personality,
  process,
}: {
  role: string;
  personality: string;
  process: string;
}): string {
  return `## Role\n${role}\n\n## Personality\n${personality}\n\n## Process\n${process}`;
}

function buildRawMarkdown({
  name,
  description,
  color,
  tools,
  role,
  personality,
  process,
}: {
  name: string;
  description: string;
  color: string;
  tools?: string;
  role: string;
  personality: string;
  process: string;
}): string {
  const frontmatter = [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    `color: ${color}`,
    tools ? `tools: ${tools}` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const body = buildSystemPrompt({ role, personality, process });
  return `${frontmatter}\n\n${body}`;
}

// --- Service ---

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

  async create(data: AgentCreateInput) {
    const baseSlug = generateSlug(data.name);
    const slug = await ensureUniqueSlug(baseSlug);

    const systemPrompt = buildSystemPrompt({
      role: data.role,
      personality: data.personality,
      process: data.process,
    });

    const rawMarkdown = buildRawMarkdown({
      name: data.name,
      description: data.description,
      color: data.color ?? "#6366f1",
      tools: data.tools,
      role: data.role,
      personality: data.personality,
      process: data.process,
    });

    return prisma.agent.create({
      data: {
        name: data.name,
        slug,
        division: data.division,
        description: data.description,
        color: data.color ?? "#6366f1",
        tools: data.tools ?? null,
        systemPrompt,
        rawMarkdown,
        isCustom: true,
      },
    });
  },

  async update(id: string, data: AgentUpdateInput) {
    const existing = await prisma.agent.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Agent not found: ${id}`);
    }

    if (!existing.isCustom) {
      throw new Error(`Cannot edit seeded agent: ${id}`);
    }

    // Parse existing systemPrompt to extract role/personality/process sections
    const existingRole = extractSection(existing.systemPrompt, "Role");
    const existingPersonality = extractSection(existing.systemPrompt, "Personality");
    const existingProcess = extractSection(existing.systemPrompt, "Process");

    const mergedRole = data.role ?? existingRole;
    const mergedPersonality = data.personality ?? existingPersonality;
    const mergedProcess = data.process ?? existingProcess;

    const systemPrompt = buildSystemPrompt({
      role: mergedRole,
      personality: mergedPersonality,
      process: mergedProcess,
    });

    const rawMarkdown = buildRawMarkdown({
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      color: data.color ?? existing.color,
      tools: data.tools ?? existing.tools ?? undefined,
      role: mergedRole,
      personality: mergedPersonality,
      process: mergedProcess,
    });

    const updateData: Record<string, unknown> = {
      systemPrompt,
      rawMarkdown,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.division !== undefined) updateData.division = data.division;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.tools !== undefined) updateData.tools = data.tools;

    return prisma.agent.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    const existing = await prisma.agent.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true } } },
    });

    if (!existing) {
      throw new Error(`Agent not found: ${id}`);
    }

    if (!existing.isCustom) {
      throw new Error(`Cannot delete seeded agent: ${id}`);
    }

    const sessionCount = existing._count.sessions;
    if (sessionCount > 0) {
      throw new Error(
        `Cannot delete agent with ${sessionCount} existing session${sessionCount === 1 ? "" : "s"}`
      );
    }

    return prisma.agent.delete({ where: { id } });
  },

  async getForClone(slug: string) {
    const agent = await prisma.agent.findUnique({ where: { slug } });

    if (!agent) {
      return null;
    }

    return {
      name: `${agent.name} (Copy)`,
      division: agent.division,
      description: agent.description,
      color: agent.color,
      tools: agent.tools ?? undefined,
      role: extractSection(agent.systemPrompt, "Role"),
      personality: extractSection(agent.systemPrompt, "Personality"),
      process: extractSection(agent.systemPrompt, "Process"),
    };
  },
};

// Helper to extract a section from systemPrompt markdown
function extractSection(systemPrompt: string, section: string): string {
  const regex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = systemPrompt.match(regex);
  return match ? match[1].trim() : "";
}
