# Phase 1: Foundation and Agent Catalog - Research

**Researched:** 2026-03-09
**Domain:** Next.js 15 scaffolding, Prisma 7/SQLite, agent markdown parsing, CRUD UI with shadcn/ui
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield scaffolding phase -- the project has no existing code, package.json, or src/ directory. The work involves creating a Next.js 15 App Router application with Prisma 7 + SQLite for persistence, seeding 61 agent markdown files from the `msitarzewski/agency-agents` GitHub repo, building an agent browsing/filtering UI, agent detail pages, a settings page for API key management, and the navigation shell (sidebar, header, dark mode).

The most critical finding is that **Prisma 7 has breaking changes** from Prisma 6: it now requires explicit driver adapters (no more built-in database drivers), the generator output path is mandatory (no longer generates into node_modules), and the provider string changed from `prisma-client-js` to `prisma-client`. The STACK.md research correctly identifies Prisma 7 but the code examples use Prisma 6 patterns -- the planner must use the updated Prisma 7 adapter pattern documented below.

The agent markdown files have a simple frontmatter format (3-4 fields: `name`, `description`, `color`, and optionally `tools`) with the full system prompt as the markdown body. There are 61 agent files across 10 division directories (design, engineering, marketing, product, project-management, spatial-computing, specialized, strategy, support, testing). The strategy directory also contains non-agent files (EXECUTIVE-BRIEF.md, QUICKSTART.md, coordination/, playbooks/, runbooks/) that must be filtered out during seeding.

**Primary recommendation:** Scaffold with `create-next-app`, set up Prisma 7 with the better-sqlite3 adapter pattern, build a robust seed script with gray-matter + Zod validation, then build the UI layer with shadcn/ui components.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FNDN-01 | User can configure Anthropic API key in settings | Settings page pattern with encrypted/server-side storage; API key validation via test call; persistence in SQLite settings table |
| FNDN-02 | App persists data in local SQLite database | Prisma 7 + better-sqlite3 adapter with singleton pattern; WAL mode; schema for agents + settings |
| FNDN-03 | All 61 agents are seeded from agency-agents repo on first run | gray-matter parser + Zod validation; clone/fetch from GitHub; division directory traversal; filter non-agent files |
| AGNT-01 | User can browse all 61 agents in a grid view | shadcn/ui Card components; grid layout with agent name, description, division color badge |
| AGNT-02 | User can filter agents by division using tabs | shadcn/ui Tabs component; 10 divisions + "All" tab; URL-synced state |
| AGNT-03 | User can search agents by name or description | shadcn/ui Input with search; client-side filtering (61 agents is small enough); debounced |
| AGNT-04 | User can view agent detail page with full personality, process, and metrics | Dynamic route `/agents/[slug]`; render full system prompt as markdown; show frontmatter metadata |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest) | App framework with App Router | Stable production release, Turbopack stable, React 19 included |
| TypeScript | 5.x | Type safety | Ships with create-next-app |
| React | 19.x | UI library | Ships with Next.js 15 |
| Prisma | 7.x | ORM with type-safe client | Schema-first, auto-generated types, migrations |
| `@prisma/adapter-better-sqlite3` | 7.x | SQLite driver adapter | Required in Prisma 7 (no built-in drivers); synchronous native bindings |
| `better-sqlite3` | latest | Native SQLite bindings | Underlying driver for the Prisma adapter |
| Tailwind CSS | 4.x | Utility-first CSS | Ships with create-next-app --tailwind; CSS-first config in v4 |
| shadcn/ui | latest CLI | Component library (source code) | Radix primitives, Tailwind-native, dark mode built in |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `gray-matter` | latest | Parse YAML frontmatter from agent markdown files | Seed script only |
| `zod` | latest | Schema validation for agent data | Seed script validation + API route input validation |
| `next-themes` | latest | Dark/light mode switching | SSR-safe theme provider, works with shadcn/ui |
| `lucide-react` | latest | Icons | Ships with shadcn/ui, tree-shakeable |
| `zustand` | 5.x | Client state (sidebar collapse, search state) | Minimal state needs in Phase 1 |
| `sonner` | latest | Toast notifications | Feedback on settings save, seed completion |

### Phase 1 Does NOT Need

| Library | Why Not Yet |
|---------|------------|
| `ai` / `@ai-sdk/anthropic` | No chat in Phase 1 |
| `react-markdown` / `rehype-highlight` | Only needed for chat rendering (Phase 2); agent detail page can render stored markdown with a simple markdown renderer or even pre-render |
| `recharts` | Dashboard charts are Phase 5 |
| `@dnd-kit/*` | Kanban is Phase 4 |
| `date-fns` | No timestamps to format yet |

**Note on react-markdown:** Phase 1 does need to render agent system prompts on detail pages. Use `react-markdown` + `remark-gfm` for this. Install it now rather than adding it later.

**Installation:**
```bash
# Create Next.js project
npx create-next-app@latest onewave-agency --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Database
npm install @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3
npm install -D prisma @types/better-sqlite3

# Agent parsing
npm install gray-matter zod

# UI utilities
npm install next-themes zustand sonner lucide-react

# Markdown rendering (for agent detail pages)
npm install react-markdown remark-gfm

# shadcn/ui init + components
npx shadcn@latest init
npx shadcn@latest add button card tabs input badge separator scroll-area tooltip sheet avatar dropdown-menu

# Prisma init
npx prisma init --datasource-provider sqlite
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    layout.tsx                # Root layout with ThemeProvider, sidebar, header
    page.tsx                  # Redirect to /agents or simple landing
    agents/
      page.tsx                # Agent grid with division tabs + search
      [slug]/
        page.tsx              # Agent detail page
    settings/
      page.tsx                # API key management
    api/
      agents/
        route.ts              # GET agents (with filters)
      settings/
        route.ts              # GET/PUT API key + preferences
      seed/
        route.ts              # POST trigger seed (or use CLI script)
  components/
    layout/
      Sidebar.tsx             # Navigation sidebar (collapsible)
      Header.tsx              # Breadcrumbs, search, theme toggle
      AppShell.tsx            # Sidebar + header + main content wrapper
    agents/
      AgentCard.tsx           # Grid card component
      AgentGrid.tsx           # Grid layout with filtering
      DivisionTabs.tsx        # Division filter tabs
      AgentSearch.tsx         # Search input
      AgentDetail.tsx         # Full agent detail view
    settings/
      ApiKeyForm.tsx          # API key input + validation
    ui/                       # shadcn/ui generated components
  lib/
    prisma.ts                 # Prisma singleton with better-sqlite3 adapter
    services/
      agent.ts                # AgentService: CRUD, search, filter
      settings.ts             # SettingsService: API key management
  store/
    app.ts                    # Zustand store: sidebar state, theme
  types/
    agent.ts                  # Agent TypeScript interfaces
prisma/
  schema.prisma               # Database schema
  seed.ts                     # Seed script: parse agents, insert to DB
  migrations/                 # Generated migrations
agents/                       # Cloned agent markdown files (gitignored or committed)
```

### Pattern 1: Prisma 7 Singleton with better-sqlite3 Adapter
**What:** Prisma 7 requires explicit driver adapters and a custom output path.
**When to use:** Every file that needs database access.
**Example:**
```typescript
// src/lib/prisma.ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### Pattern 2: Agent Seed Script with gray-matter + Zod
**What:** Parse 61 agent markdown files, validate with Zod, upsert into SQLite.
**When to use:** First run, or when agents need re-seeding.
**Example:**
```typescript
// prisma/seed.ts
import matter from "gray-matter";
import { z } from "zod";
import fs from "fs";
import path from "path";

const AgentFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  color: z.string(),
  tools: z.string().optional(),
});

const DIVISIONS = [
  "design", "engineering", "marketing", "product",
  "project-management", "spatial-computing", "specialized",
  "strategy", "support", "testing"
];

// Filter: only .md files that match agent naming convention
// Skip: EXECUTIVE-BRIEF.md, QUICKSTART.md, directories (playbooks/, runbooks/, coordination/)
function isAgentFile(filename: string, division: string): boolean {
  if (!filename.endsWith(".md")) return false;
  const nonAgentFiles = ["EXECUTIVE-BRIEF.md", "QUICKSTART.md"];
  if (nonAgentFiles.includes(filename)) return false;
  return true;
}

async function seed() {
  const agentsDir = path.join(process.cwd(), "agents");
  let seeded = 0;
  let errors = 0;

  for (const division of DIVISIONS) {
    const divDir = path.join(agentsDir, division);
    if (!fs.existsSync(divDir)) continue;

    const files = fs.readdirSync(divDir).filter(f => isAgentFile(f, division));

    for (const file of files) {
      const raw = fs.readFileSync(path.join(divDir, file), "utf-8");
      const { data, content } = matter(raw);

      const parsed = AgentFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        console.warn(`WARN: ${division}/${file} - invalid frontmatter:`, parsed.error.issues);
        errors++;
        continue;
      }

      const slug = file.replace(".md", "");
      await prisma.agent.upsert({
        where: { slug },
        update: { ...parsed.data, division, systemPrompt: content, rawMarkdown: raw },
        create: { slug, ...parsed.data, division, systemPrompt: content, rawMarkdown: raw },
      });
      seeded++;
    }
  }

  console.log(`Seeded ${seeded} agents (${errors} warnings)`);
}
```

### Pattern 3: Service Layer for Agent Operations
**What:** All business logic in `lib/services/`, API routes stay thin.
**When to use:** Every data operation.
**Example:**
```typescript
// src/lib/services/agent.ts
import { prisma } from "@/lib/prisma";

export const agentService = {
  async getAll(filters?: { division?: string; search?: string }) {
    return prisma.agent.findMany({
      where: {
        ...(filters?.division && { division: filters.division }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search } },
            { description: { contains: filters.search } },
          ],
        }),
      },
      orderBy: [{ division: "asc" }, { name: "asc" }],
    });
  },

  async getBySlug(slug: string) {
    return prisma.agent.findUnique({ where: { slug } });
  },

  async getDivisions() {
    const results = await prisma.agent.groupBy({ by: ["division"] });
    return results.map(r => r.division);
  },
};
```

### Pattern 4: Dark Mode with next-themes + shadcn/ui
**What:** SSR-safe dark mode with class-based switching.
**When to use:** Root layout setup.
**Example:**
```typescript
// src/components/providers/ThemeProvider.tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Pattern 5: Settings with Encrypted API Key Storage
**What:** Store API key server-side only, never expose to client.
**When to use:** Settings page.
**Example:**
```typescript
// API key stored in Settings table in SQLite
// Server action validates key by making a test call
// Client only knows if key is "configured" (boolean), never sees the key value
// Consider: simple encryption at rest or just rely on local-only access model

// src/lib/services/settings.ts
export const settingsService = {
  async getApiKey(): Promise<string | null> {
    const setting = await prisma.setting.findUnique({ where: { key: "anthropic_api_key" } });
    return setting?.value ?? null;
  },

  async setApiKey(apiKey: string): Promise<void> {
    await prisma.setting.upsert({
      where: { key: "anthropic_api_key" },
      update: { value: apiKey },
      create: { key: "anthropic_api_key", value: apiKey },
    });
  },

  async hasApiKey(): Promise<boolean> {
    const setting = await prisma.setting.findUnique({ where: { key: "anthropic_api_key" } });
    return !!setting?.value;
  },
};
```

### Anti-Patterns to Avoid
- **Importing Prisma Client from `@prisma/client`:** In Prisma 7, import from the custom output path (`../../generated/prisma/client`). Using the old import path will fail.
- **Skipping the singleton pattern:** Every HMR reload creates a new Prisma instance without it. You will see "too many clients" errors within minutes of development.
- **Exposing the API key to the client:** All Claude API calls go through server-side API routes. The settings page sends the key to a server action, never stores it in client state.
- **Hard-coding division names:** Extract divisions dynamically from the database or agent files. The repo has 10 divisions, not the 9 originally documented in PROJECT.md.
- **Ignoring non-agent files in strategy/:** The strategy directory contains EXECUTIVE-BRIEF.md, QUICKSTART.md, and subdirectories (coordination/, playbooks/, runbooks/) that are NOT agent files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | Custom regex parser | `gray-matter` | Handles edge cases (multiline values, special characters, empty frontmatter) |
| Data validation | Manual if/else checks | `zod` schemas | Type inference, composable, clear error messages |
| Dark/light mode | Custom CSS variable toggling | `next-themes` + shadcn/ui | SSR-safe, avoids flash of wrong theme, system preference detection |
| Component primitives | Custom buttons/inputs/tabs | `shadcn/ui` | Accessible (Radix), styled (Tailwind), copy-pasted into project for full ownership |
| Navigation sidebar | Custom drawer from scratch | shadcn/ui `Sheet` + custom layout | Mobile-friendly collapse, animation built in |
| Toast notifications | Custom alert div | `sonner` (via shadcn/ui) | Stacking, auto-dismiss, action buttons |

## Common Pitfalls

### Pitfall 1: Prisma 7 Breaking Changes (Generator + Adapter)
**What goes wrong:** Using Prisma 6 patterns (importing from `@prisma/client`, no adapter, no explicit output path) causes build failures.
**Why it happens:** Most tutorials and AI training data reference Prisma 5/6 patterns. Prisma 7 is recent (2026).
**How to avoid:** Use `provider = "prisma-client"` (not `prisma-client-js`), set `output = "../generated/prisma"`, install `@prisma/adapter-better-sqlite3`, and instantiate with `new PrismaClient({ adapter })`.
**Warning signs:** "Cannot find module '@prisma/client'" errors, "No driver adapter provided" errors.

### Pitfall 2: Prisma Client HMR Duplication
**What goes wrong:** Each hot-reload creates a new Prisma client instance, exhausting connections.
**Why it happens:** Next.js re-executes modules on every code change in dev mode.
**How to avoid:** Store client on `globalThis` in development mode (singleton pattern shown above).
**Warning signs:** "Too many clients" errors after a few code saves.

### Pitfall 3: Agent Seed Script Silently Skipping Files
**What goes wrong:** The seed script processes most agents but silently skips some due to frontmatter variations or non-agent files in the directory.
**Why it happens:** The strategy directory has non-agent files. Some agents may have `tools` field that others don't.
**How to avoid:** Use Zod with `.optional()` for variable fields. Filter out known non-agent files. Log warnings for skipped files. Verify count after seeding (expect exactly 61 agents if filtering is correct; actual count may be ~63 based on repo listing).
**Warning signs:** Agent count in DB doesn't match expected count. Missing agents from certain divisions.

### Pitfall 4: Division Count Mismatch
**What goes wrong:** PROJECT.md says 9 divisions, but the repo actually has 10 directories (design, engineering, marketing, product, project-management, spatial-computing, specialized, strategy, support, testing).
**Why it happens:** Strategy was likely counted differently or added later.
**How to avoid:** Extract divisions dynamically from the data, don't hard-code a list of 9.
**Warning signs:** Missing agents from the strategy division.

### Pitfall 5: API Key Leaking to Client
**What goes wrong:** The API key appears in browser network tab or React state.
**Why it happens:** Calling Anthropic directly from client code, or returning the key in a GET response.
**How to avoid:** Settings API returns `{ hasKey: boolean, maskedKey: "sk-...xxxx" }` -- never the full key. All Claude calls go through server API routes.
**Warning signs:** API key visible in browser DevTools Network tab.

### Pitfall 6: Tailwind v4 Configuration Confusion
**What goes wrong:** Trying to create `tailwind.config.js` or `tailwind.config.ts` which is the v3 pattern.
**Why it happens:** Most tutorials reference Tailwind v3. v4 uses CSS-first configuration in `globals.css`.
**How to avoid:** Use `@import "tailwindcss"` in globals.css. Configure theme via `@theme` directive inline. shadcn/ui init handles this automatically.
**Warning signs:** Config file exists but changes have no effect; CSS variables not applying.

## Code Examples

### Agent Database Schema (Prisma 7)
```prisma
// prisma/schema.prisma
// Source: Prisma 7 SQLite quickstart + project requirements
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Agent {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  division    String
  description String
  color       String
  tools       String?          // Comma-separated tool names from frontmatter
  systemPrompt String          // Full markdown body (the agent's personality/instructions)
  rawMarkdown  String          // Original file content for reference
  isCustom    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Future relations (added in later phases)
  // sessions    Session[]
  // tasks       Task[]
}

model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Agent Card Component
```typescript
// src/components/agents/AgentCard.tsx
// Source: shadcn/ui Card + Badge patterns
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const divisionColors: Record<string, string> = {
  engineering: "bg-blue-500/10 text-blue-500",
  design: "bg-purple-500/10 text-purple-500",
  marketing: "bg-green-500/10 text-green-500",
  product: "bg-amber-500/10 text-amber-500",
  testing: "bg-red-500/10 text-red-500",
  "project-management": "bg-cyan-500/10 text-cyan-500",
  support: "bg-orange-500/10 text-orange-500",
  "spatial-computing": "bg-indigo-500/10 text-indigo-500",
  specialized: "bg-pink-500/10 text-pink-500",
  strategy: "bg-teal-500/10 text-teal-500",
};

interface AgentCardProps {
  agent: {
    slug: string;
    name: string;
    description: string;
    division: string;
    color: string;
  };
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.slug}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <Badge variant="secondary" className={divisionColors[agent.division] || ""}>
              {agent.division}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {agent.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Collapsible Sidebar Layout
```typescript
// src/components/layout/Sidebar.tsx
"use client";
import { useAppStore } from "@/store/app";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Settings, LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const pathname = usePathname();

  return (
    <aside className={cn(
      "flex h-screen flex-col border-r bg-card transition-all",
      sidebarCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-14 items-center justify-between px-4 border-b">
        {!sidebarCollapsed && <span className="font-semibold">OneWave AI</span>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === item.href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma 6: import from `@prisma/client`, built-in drivers | Prisma 7: explicit adapter, custom output path, `prisma-client` provider | Prisma 7 (2026) | Must use adapter pattern; old imports fail |
| Tailwind v3: `tailwind.config.js` | Tailwind v4: CSS-first config in `globals.css` via `@theme` | Tailwind v4 (2025) | No config file needed; `@import "tailwindcss"` in CSS |
| shadcn/ui v3: forwardRef pattern | shadcn/ui v4: no forwardRef, data-slot attributes, React 19 compatible | shadcn/ui 2025-2026 | Components use simpler patterns |
| Next.js 14 defaults | Next.js 15: Turbopack stable, React 19, improved caching | Next.js 15 (2025) | Faster dev server; some cache behavior changes |

**Deprecated/outdated:**
- `prisma-client-js` generator provider -- replaced by `prisma-client` in Prisma 7
- `tailwind.config.js` / `tailwind.config.ts` -- replaced by CSS-first config in Tailwind v4
- `@prisma/client` import path -- replaced by custom output path in Prisma 7

## Agent File Format (Verified)

The 61 agent files from `msitarzewski/agency-agents` follow this format:

```markdown
---
name: Agent Name
description: Multi-line description of the agent
color: cyan
tools: WebFetch, WebSearch, Read, Write, Edit    # OPTIONAL - not all agents have this
---

# Full system prompt content follows as markdown body
## Identity & Memory
...
## Core Mission
...
## Technical Deliverables
...
```

**Frontmatter fields:**
- `name` (required): Display name
- `description` (required): Agent description/expertise
- `color` (required): Theme color (cyan, purple, green, etc.)
- `tools` (optional): Comma-separated list of tools the agent can use

**Division directories with agent counts (verified from GitHub API):**
| Division | Directory | Agent Count |
|----------|-----------|-------------|
| Design | `design/` | 8 |
| Engineering | `engineering/` | 11 |
| Marketing | `marketing/` | 11 |
| Product | `product/` | 4 |
| Project Management | `project-management/` | 5 |
| Spatial Computing | `spatial-computing/` | 6 |
| Specialized | `specialized/` | 9 |
| Strategy | `strategy/` | 1 (nexus-strategy.md only; others are docs) |
| Support | `support/` | 6 |
| Testing | `testing/` | 8 |

**Non-agent files to filter out in strategy/:** EXECUTIVE-BRIEF.md, QUICKSTART.md, `coordination/`, `playbooks/`, `runbooks/`

**Total agent count:** ~69 files but several in strategy/ are not agents. The actual seeded count will depend on filtering logic. The project spec says 61; verification during seeding is essential.

## Open Questions

1. **Exact agent count after filtering**
   - What we know: The repo says 61 agents, but file listing shows more .md files (some are docs, not agents)
   - What's unclear: Whether all .md files in division directories (except known non-agent files) are agents
   - Recommendation: Seed all valid .md files, log the count, compare to 61. If different, adjust filter.

2. **Agent file acquisition strategy**
   - What we know: PROJECT.md says "clones/copies the 61 agent markdown files into agents/ directory"
   - What's unclear: Clone the full repo at build time? Bundle files? Download via GitHub API?
   - Recommendation: Include a setup script that clones the repo into an `agents/` directory, or use `degit` for a clean copy without .git. The seed script then reads from local `agents/` directory.

3. **API key validation approach**
   - What we know: Need to verify the key works before saving
   - What's unclear: Exact API call to validate (models.list? messages.create with minimal tokens?)
   - Recommendation: Make a minimal `messages.create` call with Haiku (cheapest model) to validate. If it returns 401, the key is invalid.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended for Next.js 15 projects) |
| Config file | `vitest.config.ts` -- needs creation in Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDN-01 | API key save/retrieve/validate | unit | `npx vitest run src/lib/services/__tests__/settings.test.ts -t "api key"` | -- Wave 0 |
| FNDN-02 | Prisma client connects, schema works | integration | `npx vitest run src/lib/__tests__/prisma.test.ts` | -- Wave 0 |
| FNDN-03 | Seed script parses all agents correctly | unit | `npx vitest run prisma/__tests__/seed.test.ts` | -- Wave 0 |
| AGNT-01 | Agent grid renders all agents | unit | `npx vitest run src/components/agents/__tests__/AgentGrid.test.tsx` | -- Wave 0 |
| AGNT-02 | Division tab filtering works | unit | `npx vitest run src/components/agents/__tests__/DivisionTabs.test.tsx` | -- Wave 0 |
| AGNT-03 | Search filters by name/description | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "search"` | -- Wave 0 |
| AGNT-04 | Agent detail page loads correct data | integration | `npx vitest run src/app/agents/__tests__/[slug].test.tsx` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- framework configuration
- [ ] `@vitejs/plugin-react` + `vitest` + `@testing-library/react` -- dependencies
- [ ] `prisma/__tests__/seed.test.ts` -- covers FNDN-03
- [ ] `src/lib/services/__tests__/agent.test.ts` -- covers AGNT-03
- [ ] `src/lib/services/__tests__/settings.test.ts` -- covers FNDN-01
- [ ] `src/lib/__tests__/prisma.test.ts` -- covers FNDN-02

## Sources

### Primary (HIGH confidence)
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) -- adapter requirement, generator changes, breaking changes
- [Prisma SQLite Quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite) -- Prisma 7 setup pattern with better-sqlite3
- [Next.js Installation Docs](https://nextjs.org/docs/app/getting-started/installation) -- create-next-app flags
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) -- init + component setup
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4) -- CSS-first configuration
- [shadcn/ui Dark Mode (Next.js)](https://ui.shadcn.com/docs/dark-mode/next) -- next-themes integration
- [GitHub: msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) -- agent file format, directory structure (verified via API)
- [gray-matter npm](https://www.npmjs.com/package/gray-matter) -- YAML frontmatter parsing

### Secondary (MEDIUM confidence)
- [Prisma Next.js Guide](https://www.prisma.io/nextjs) -- singleton pattern (verified for Prisma 7)
- Agent frontmatter format -- verified by fetching 3 raw agent files from GitHub (frontend-developer, ui-designer, growth-hacker)

### Tertiary (LOW confidence)
- Exact agent count (61 vs actual file count) -- needs verification during implementation
- better-sqlite3 adapter performance claims -- directionally correct but unverified benchmarks

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against current official docs; Prisma 7 breaking changes identified and documented
- Architecture: HIGH -- standard Next.js App Router patterns; service layer is well-established
- Pitfalls: HIGH -- Prisma 7 breaking changes verified; agent file format verified from source
- Agent file format: HIGH -- verified by fetching actual files from GitHub

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable stack, 30 days)
