import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Agents Loader", () => {
  it("agents have valid slug format", async () => {
    const agents = await prisma.agent.findMany({ select: { slug: true } });
    for (const agent of agents) {
      expect(agent.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("no duplicate slugs exist", async () => {
    const agents = await prisma.agent.findMany({ select: { slug: true } });
    const slugs = agents.map((a) => a.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("agent systemPrompt contains content", async () => {
    const agents = await prisma.agent.findMany({
      select: { systemPrompt: true },
      take: 5,
    });
    for (const agent of agents) {
      expect(agent.systemPrompt.length).toBeGreaterThan(50);
    }
  });

  it("non-agent files are excluded", async () => {
    const executiveBrief = await prisma.agent.findUnique({
      where: { slug: "EXECUTIVE-BRIEF" },
    });
    const quickstart = await prisma.agent.findUnique({
      where: { slug: "QUICKSTART" },
    });
    expect(executiveBrief).toBeNull();
    expect(quickstart).toBeNull();
  });
});
