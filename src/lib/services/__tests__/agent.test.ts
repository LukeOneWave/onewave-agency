import { describe, it, expect } from "vitest";
import { agentService } from "@/lib/services/agent";

describe("agentService", () => {
  describe("getAll", () => {
    it("returns all seeded agents (count >= 50)", async () => {
      const agents = await agentService.getAll();
      expect(agents.length).toBeGreaterThanOrEqual(50);
    });

    it("filters agents by division", async () => {
      const agents = await agentService.getAll({ division: "engineering" });
      expect(agents.length).toBeGreaterThan(0);
      agents.forEach((agent) => {
        expect(agent.division).toBe("engineering");
      });
    });

    it("filters agents by name substring", async () => {
      const agents = await agentService.getAll({ search: "code" });
      expect(agents.length).toBeGreaterThan(0);
      agents.forEach((agent) => {
        const matchesName = agent.name.toLowerCase().includes("code");
        const matchesDesc = agent.description.toLowerCase().includes("code");
        expect(matchesName || matchesDesc).toBe(true);
      });
    });

    it("filters agents by description substring", async () => {
      const allAgents = await agentService.getAll();
      // Find a word that appears in a description but maybe not name
      const target = allAgents[0];
      const searchWord = target.description.split(" ")[0].toLowerCase();
      const filtered = await agentService.getAll({ search: searchWord });
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  describe("getBySlug", () => {
    it("returns a single agent with full data", async () => {
      const allAgents = await agentService.getAll();
      const slug = allAgents[0].slug;
      const agent = await agentService.getBySlug(slug);
      expect(agent).not.toBeNull();
      expect(agent!.slug).toBe(slug);
      expect(agent!.systemPrompt).toBeDefined();
      expect(agent!.rawMarkdown).toBeDefined();
    });

    it("returns null for non-existent slug", async () => {
      const agent = await agentService.getBySlug("non-existent-slug-xyz");
      expect(agent).toBeNull();
    });
  });

  describe("getDivisions", () => {
    it("returns all divisions", async () => {
      const divisions = await agentService.getDivisions();
      expect(divisions.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("getCount", () => {
    it("returns total agent count matching getAll length", async () => {
      const count = await agentService.getCount();
      const agents = await agentService.getAll();
      expect(count).toBe(agents.length);
    });
  });
});
