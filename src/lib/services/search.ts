import { prisma } from "@/lib/prisma";

export interface SearchResults {
  agents: Array<{ id: string; name: string; slug: string; division: string }>;
  projects: Array<{ id: string; name: string }>;
  sessions: Array<{ id: string; title: string | null; agentName: string }>;
}

async function query(q: string): Promise<SearchResults> {
  if (!q || !q.trim()) {
    return { agents: [], projects: [], sessions: [] };
  }

  const [agents, projects, rawSessions] = await Promise.all([
    prisma.agent.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { division: { contains: q } },
        ],
      },
      select: { id: true, name: true, slug: true, division: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.chatSession.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { agent: { name: { contains: q } } },
        ],
      },
      select: {
        id: true,
        title: true,
        agent: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const sessions = rawSessions.map((s) => ({
    id: s.id,
    title: s.title,
    agentName: s.agent.name,
  }));

  return { agents, projects, sessions };
}

export const searchService = { query };
