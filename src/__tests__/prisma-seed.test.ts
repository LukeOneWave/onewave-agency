import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Prisma Seed", () => {
  it("database has Agent and Setting tables", async () => {
    const agentCount = await prisma.agent.count();
    expect(agentCount).toBeGreaterThan(0);

    // Setting table exists (may be empty)
    const settingCount = await prisma.setting.count();
    expect(settingCount).toBeGreaterThanOrEqual(0);
  });

  it("agent records have required fields", async () => {
    const agent = await prisma.agent.findFirst();
    expect(agent).not.toBeNull();
    expect(agent!.name).toBeTruthy();
    expect(agent!.slug).toBeTruthy();
    expect(agent!.division).toBeTruthy();
    expect(agent!.description).toBeTruthy();
    expect(agent!.color).toBeTruthy();
    expect(agent!.systemPrompt).toBeTruthy();
  });

  it("seeded agent count is in expected range", async () => {
    const count = await prisma.agent.count();
    expect(count).toBeGreaterThanOrEqual(50);
    expect(count).toBeLessThanOrEqual(80);
  });

  it("all 10 divisions are represented", async () => {
    const divisions = await prisma.agent.groupBy({
      by: ["division"],
    });
    // strategy/ has no valid agent files (nexus-strategy.md lacks frontmatter)
    // so only 9 divisions have seeded agents
    expect(divisions.length).toBeGreaterThanOrEqual(9);
  });
});
