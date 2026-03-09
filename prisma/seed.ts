import matter from "gray-matter";
import { z } from "zod/v4";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

const AgentFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  color: z.string(),
  tools: z.string().optional(),
});

const DIVISIONS = [
  "design",
  "engineering",
  "marketing",
  "product",
  "project-management",
  "spatial-computing",
  "specialized",
  "strategy",
  "support",
  "testing",
];

const NON_AGENT_FILES = new Set(["EXECUTIVE-BRIEF.md", "QUICKSTART.md"]);

function isAgentFile(filename: string): boolean {
  if (!filename.endsWith(".md")) return false;
  if (NON_AGENT_FILES.has(filename)) return false;
  return true;
}

async function seed() {
  const agentsDir = path.join(process.cwd(), "agents");
  let seeded = 0;
  let warnings = 0;

  for (const division of DIVISIONS) {
    const divDir = path.join(agentsDir, division);
    if (!fs.existsSync(divDir)) {
      console.warn(`WARN: Division directory not found: ${division}`);
      continue;
    }

    const entries = fs.readdirSync(divDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && isAgentFile(e.name))
      .map((e) => e.name);

    for (const file of files) {
      const raw = fs.readFileSync(path.join(divDir, file), "utf-8");
      const { data, content } = matter(raw);

      const parsed = AgentFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        console.warn(
          `WARN: ${division}/${file} - invalid frontmatter:`,
          parsed.error.issues
        );
        warnings++;
        continue;
      }

      const slug = file.replace(".md", "");
      await prisma.agent.upsert({
        where: { slug },
        update: {
          name: parsed.data.name,
          division,
          description: parsed.data.description,
          color: parsed.data.color,
          tools: parsed.data.tools ?? null,
          systemPrompt: content,
          rawMarkdown: raw,
        },
        create: {
          slug,
          name: parsed.data.name,
          division,
          description: parsed.data.description,
          color: parsed.data.color,
          tools: parsed.data.tools ?? null,
          systemPrompt: content,
          rawMarkdown: raw,
        },
      });
      seeded++;
    }
  }

  console.log(`Seeded ${seeded} agents (${warnings} warnings)`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
