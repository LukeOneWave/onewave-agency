# Phase 6: Infrastructure + Quick Wins - Research

**Researched:** 2026-03-10
**Domain:** Prisma schema migration, dark/light theme toggle, review queue widget, loading skeletons
**Confidence:** HIGH

## Summary

Phase 6 is the first v2.0 phase, bridging the shipped v1.0 app to the new feature set. It covers four distinct deliverables: (1) a dark/light mode toggle with persistent preference, (2) a review queue widget on the dashboard, (3) skeleton loading states on data-fetching pages, and (4) new Prisma models (Project, Task, DeliverableVersion) with safe migrations. The good news is that most of the infrastructure already exists -- next-themes is installed and configured, the Header already has a working theme toggle button, and shadcn/ui provides skeleton and switch components via CLI. The real work is the Prisma migration (adding 3-4 new models without destroying existing data), the review queue query (joining Deliverable -> Message -> ChatSession -> Agent efficiently), and systematically adding skeleton placeholders to all data-fetching pages.

The theme toggle (UX-02) is effectively already done -- the Header component already imports `useTheme` from next-themes and renders a Sun/Moon toggle button. The preference persists via next-themes' built-in localStorage handling. The only gap is verifying that all UI components render correctly in both themes (the CSS already has both `:root` and `.dark` variable definitions with a surfer-themed color palette).

The highest-risk item is the Prisma migration. All new foreign keys on existing tables MUST be optional to avoid SQLite's inability to add NOT NULL columns to populated tables. The migration should be generated with `--create-only`, reviewed manually, and tested against a backup of `dev.db` before applying.

**Primary recommendation:** Start with the Prisma migration (highest risk), then review queue widget (most visible), then skeletons (systematic), and verify theme toggle last (already working, just needs confirmation).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-02 | User can toggle between dark and light mode via a visible UI control, and the preference persists across page reloads | Already implemented in Header.tsx with next-themes useTheme hook, Sun/Moon button, localStorage persistence. Needs verification only. |
| REVW-01 | User can see a review queue widget on the dashboard showing pending deliverables | New ReviewQueue server component, new dashboardService.getPendingReview() method with nested Prisma include, added to Dashboard page grid |
| UX-04 | App has loading skeletons on data-fetching pages | Install shadcn skeleton component, create skeleton variants for each page layout (dashboard, agents, chat, orchestration), wrap server component data fetches |
</phase_requirements>

## Standard Stack

### Core (No New npm Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-themes | 0.4.6 | Dark/light mode toggle | Already installed and configured with ThemeProvider, attribute="class", defaultTheme="dark", enableSystem |
| Prisma | 7.4.2 | Schema migration for new models | Existing ORM, standard migration workflow |
| Zustand | 5.0.11 | No new stores needed for Phase 6 | Existing state management -- review queue is server-rendered, no client state needed |

### shadcn/ui Components to Add

| Component | Command | Purpose |
|-----------|---------|---------|
| skeleton | `npx shadcn add skeleton` | Loading placeholder component for UX-04 |
| switch | `npx shadcn add switch` | Optional: could replace ghost button with a toggle switch for theme (current button approach is fine too) |

### Already Installed (Relevant to Phase 6)

| Component | Status |
|-----------|--------|
| button | Installed -- used for theme toggle |
| card | Installed -- used for review queue items |
| badge | Installed -- used for deliverable status badges |
| avatar | Installed -- used for agent avatars in review queue |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn skeleton | CSS shimmer animation | Custom code, less consistent with existing component library |
| next-themes localStorage | Zustand persist for theme | Anti-pattern -- next-themes' blocking script prevents FOUC, Zustand would cause flash |
| Server component review queue | Client-side fetch + Zustand | Anti-pattern -- established pattern is server fetch, pass as props |

**Installation:**
```bash
# shadcn/ui components (copies source code, no npm deps)
npx shadcn add skeleton switch
```

## Architecture Patterns

### Recommended Approach for Each Requirement

#### UX-02: Theme Toggle (Already Done)

The Header component at `src/components/layout/Header.tsx` already implements a complete theme toggle:
- Imports `useTheme` from `next-themes`
- Renders Sun/Moon button with `onClick={() => setTheme(theme === "dark" ? "light" : "dark")}`
- Handles hydration with `mounted` state to avoid SSR mismatch
- Persistence is automatic via next-themes localStorage

**Action needed:** Verify light mode rendering across all pages. The CSS in `globals.css` defines both `:root` (light) and `.dark` variable sets.

#### REVW-01: Review Queue Widget

```
DashboardPage (server component, src/app/page.tsx)
    |
    v
dashboardService.getPendingReview() -- NEW method
    |
    v
ReviewQueue component (server component, renders card list)
    |
    v
Each item shows: agent name, agent color, session title, deliverable preview, time ago
```

**Data flow:** Single Prisma query with nested includes to avoid N+1 (Pitfall 10):

```typescript
// src/lib/services/dashboard.ts -- add getPendingReview method
async getPendingReview(limit: number = 10) {
  return prisma.deliverable.findMany({
    where: { status: "pending" },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      message: {
        select: {
          content: true,
          session: {
            select: {
              id: true,
              title: true,
              agent: {
                select: { name: true, slug: true, color: true },
              },
            },
          },
        },
      },
    },
  });
}
```

**Component placement:** Add to Dashboard page grid alongside existing ActivityFeed and UtilizationChart:

```typescript
// src/app/page.tsx -- modified
const [stats, activities, utilization, pendingReview] = await Promise.all([
  dashboardService.getStats(),
  dashboardService.getRecentActivity(20),
  dashboardService.getAgentUtilization(),
  dashboardService.getPendingReview(5),
]);
// Render ReviewQueue in the grid
```

#### UX-04: Loading Skeletons

Pattern: Create page-specific skeleton components that mirror the layout of the actual content. Use Suspense boundaries in server components to show skeletons while data loads.

```typescript
// src/components/dashboard/DashboardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-48" /> {/* Title */}
        <Skeleton className="h-5 w-64 mt-1" /> {/* Subtitle */}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
```

**Pages needing skeletons:**
1. Dashboard (`/`) -- stat cards + activity feed + chart
2. Agents (`/agents`) -- agent grid cards
3. Chat (`/chat`) -- session list
4. Orchestration (`/orchestration`) -- mission list
5. Agent detail (`/agents/[slug]`) -- agent info + sessions

**Implementation pattern:** Use Next.js `loading.tsx` convention (App Router built-in):

```
src/app/
  loading.tsx          # Dashboard skeleton
  agents/
    loading.tsx        # Agent grid skeleton
  chat/
    loading.tsx        # Chat session list skeleton
  orchestration/
    loading.tsx        # Mission list skeleton
  agents/[slug]/
    loading.tsx        # Agent detail skeleton
```

#### Schema Migration (Infrastructure Foundation)

New models for future phases, added now to establish the foundation:

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tasks       Task[]
}

model Task {
  id              String       @id @default(cuid())
  projectId       String
  project         Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title           String
  description     String?
  status          String       @default("todo")
  assignedAgentId String?
  assignedAgent   Agent?       @relation(fields: [assignedAgentId], references: [id])
  order           Int          @default(0)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model DeliverableVersion {
  id            String      @id @default(cuid())
  deliverableId String
  deliverable   Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  version       Int
  content       String
  createdAt     DateTime    @default(now())

  @@unique([deliverableId, version])
}
```

**Modified existing models (relations only, all optional):**

```prisma
// Agent: add optional tasks relation
model Agent {
  // ... existing fields unchanged ...
  tasks Task[]  // NEW relation (no schema column change, just Prisma relation)
}

// Deliverable: add content field + versions relation
model Deliverable {
  // ... existing fields unchanged ...
  content  String?                // NEW: nullable for safe migration
  versions DeliverableVersion[]   // NEW relation
}
```

### Anti-Patterns to Avoid

- **Do NOT store theme in Zustand or database:** next-themes handles localStorage + blocking script to prevent FOUC. Adding another storage layer creates race conditions.
- **Do NOT fetch review queue client-side:** The dashboard is a server component. Follow the established pattern of fetching in server component, passing as props.
- **Do NOT add required columns to existing tables:** All new fields on Agent and Deliverable must be optional (`String?`) or have defaults.
- **Do NOT create loading.tsx files that don't match the actual page layout:** Skeleton components should mirror the real layout dimensions to prevent layout shift when content loads.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence | Custom localStorage + useEffect | next-themes (already configured) | Handles FOUC prevention with blocking script, SSR compatibility, system preference detection |
| Loading placeholders | Custom shimmer CSS animations | shadcn Skeleton component | Consistent with design system, handles dark/light mode automatically |
| N+1 query for review queue | Loop over deliverables fetching relations | Single Prisma findMany with nested include | Performance -- one DB roundtrip vs N+1 |
| Page loading states | Custom Suspense boundaries | Next.js loading.tsx convention | Framework-native, zero config, automatic Suspense wrapping |

## Common Pitfalls

### Pitfall 1: SQLite Migration Data Loss
**What goes wrong:** Adding required foreign keys or NOT NULL columns to existing populated tables causes Prisma to suggest `migrate reset`, wiping all 61 seeded agents and chat history.
**Why it happens:** SQLite cannot add NOT NULL columns without defaults to tables that already have rows.
**How to avoid:**
- All new columns on existing tables MUST be optional or have defaults
- Run `npx prisma migrate dev --create-only` first, review generated SQL
- Back up `prisma/dev.db` before applying: `cp prisma/dev.db prisma/dev.db.backup`
- Test migration on a copy first
**Warning signs:** Prisma CLI prompting "We need to reset the database"

### Pitfall 2: Review Queue N+1 Queries
**What goes wrong:** Fetching pending deliverables then looping to get agent names creates cascading DB queries.
**Why it happens:** Deliverable -> Message -> ChatSession -> Agent is 4 levels deep. Without explicit eager loading, each level triggers a separate query.
**How to avoid:** Single `prisma.deliverable.findMany()` with nested `include` joining through Message -> Session -> Agent in one query.
**Warning signs:** Dashboard taking >200ms to load, multiple sequential DB queries in logs.

### Pitfall 3: Theme Toggle FOUC
**What goes wrong:** Flash of wrong theme on page load (white flash in dark mode).
**Why it happens:** Theme stored in JS state renders after hydration, CSS renders before.
**How to avoid:** Already mitigated -- next-themes injects a blocking `<script>` in `<head>` that sets the theme class before paint. The `disableTransitionOnChange` prop in ThemeProvider also prevents transition flicker during toggle. Do NOT add any custom theme handling that bypasses next-themes.
**Warning signs:** Visible color flash on page reload.

### Pitfall 4: Skeleton Layout Shift
**What goes wrong:** Skeleton placeholders have different dimensions than actual content, causing jarring layout shifts when data loads.
**Why it happens:** Skeleton components created without reference to actual page layout.
**How to avoid:** Each skeleton must match the actual component's container sizes, grid layout, and spacing exactly. Use the same container classes (`container mx-auto max-w-6xl px-4 py-8` for dashboard).
**Warning signs:** Content "jumping" when it replaces the skeleton.

### Pitfall 5: Deliverable.content Backfill Complexity
**What goes wrong:** Adding a `content` field to Deliverable requires backfilling existing deliverables by extracting content from their parent Message using parseDeliverables().
**Why it happens:** Currently deliverable content lives inline in Message.content, extracted at render time. The new DeliverableVersion model needs actual content strings.
**How to avoid:** For Phase 6, add `content` as nullable (`String?`). Do NOT attempt to backfill existing deliverables in this phase -- the backfill is a Phase 9 concern when diff view is built. The field being nullable means existing functionality is unaffected.
**Warning signs:** Scope creep -- trying to build the versioning workflow when only the schema is needed.

## Code Examples

### Theme Toggle (Already Implemented)
```typescript
// Source: src/components/layout/Header.tsx (existing code)
// Already works -- no changes needed
const { theme, setTheme } = useTheme();
// ...
<Button
  variant="ghost"
  size="icon"
  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
  aria-label="Toggle theme"
>
  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
</Button>
```

### Review Queue Widget
```typescript
// Source: pattern from existing dashboardService + Prisma docs
// src/components/dashboard/ReviewQueue.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface PendingDeliverable {
  id: string;
  createdAt: Date;
  message: {
    content: string;
    session: {
      id: string;
      title: string | null;
      agent: { name: string; slug: string; color: string };
    };
  };
}

export function ReviewQueue({ items }: { items: PendingDeliverable[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Review Queue</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No pending deliverables.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Review Queue
          <Badge variant="secondary">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/chat/${item.message.session.id}`}
            className="block rounded-lg border p-3 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.message.session.agent.color }}
              />
              <span className="text-sm font-medium">
                {item.message.session.agent.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {item.message.session.title || "Untitled session"}
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Next.js loading.tsx Skeleton Pattern
```typescript
// Source: Next.js App Router docs + shadcn skeleton
// src/app/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
```

### Safe Prisma Migration Flow
```bash
# 1. Back up existing database
cp prisma/dev.db prisma/dev.db.backup

# 2. Generate migration SQL without applying
npx prisma migrate dev --create-only --name add_v2_models

# 3. Review the generated SQL in prisma/migrations/TIMESTAMP_add_v2_models/migration.sql
# Verify: NO "NOT NULL" on columns added to existing tables
# Verify: New tables can have NOT NULL (they start empty)

# 4. Apply after review
npx prisma migrate dev

# 5. Generate updated client
npx prisma generate
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom CSS shimmer animations | shadcn Skeleton component | shadcn v4 (2026) | Consistent, theme-aware, zero custom CSS |
| Manual Suspense boundaries | Next.js loading.tsx convention | Next.js 13+ App Router | Framework handles Suspense wrapping automatically |
| Custom theme storage | next-themes with class strategy | Established pattern | FOUC prevention built-in, system preference support |
| Manual loading states per component | loading.tsx per route segment | Next.js 13+ | Automatic, consistent, no per-component boilerplate |

## Open Questions

1. **Review queue: how much content to preview?**
   - What we know: Deliverable content lives in Message.content, extracted via parseDeliverables(). Each message can have multiple deliverables.
   - What's unclear: Should the review queue show a text preview of the deliverable content, or just agent name + session title?
   - Recommendation: Show agent name + session title + time ago. Content preview adds complexity (parsing) for minimal value in a queue view. Users click through to the chat to review.

2. **Should DeliverableVersion content backfill happen in Phase 6?**
   - What we know: The Deliverable.content field will be nullable. Existing deliverables have content only in Message.content.
   - What's unclear: When to trigger the first content snapshot.
   - Recommendation: Do NOT backfill in Phase 6. Add the schema with nullable content. Backfill and versioning logic belongs in Phase 9 (Advanced Review) when diff view is built.

3. **Do we need a Comment model in Phase 6?**
   - What we know: Comment model is defined in architecture research for inline commenting (Phase 9 feature).
   - What's unclear: Whether to add it now or later.
   - Recommendation: Skip Comment model in Phase 6. Only add models needed by Phase 6-8 features. Comment is Phase 9. Adding unused models creates migration noise.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + jsdom + @testing-library/react |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-02 | Theme toggle persists preference | manual-only | Manual: click toggle, reload, verify theme persists | N/A -- next-themes handles persistence internally |
| REVW-01 | Review queue shows pending deliverables | unit | `npx vitest run src/lib/services/__tests__/dashboard.test.ts -t "getPendingReview" -x` | No -- Wave 0 |
| REVW-01 | Review queue renders with items | unit | `npx vitest run src/components/dashboard/__tests__/ReviewQueue.test.tsx -x` | No -- Wave 0 |
| UX-04 | Skeleton components render without error | unit | `npx vitest run src/components/__tests__/skeletons.test.tsx -x` | No -- Wave 0 |
| INFRA | Prisma migration runs without data loss | smoke | `npx prisma migrate dev && npx prisma db pull --print` | No -- manual verification |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/services/__tests__/dashboard.test.ts` -- add test for `getPendingReview()` method (file exists, add test case)
- [ ] `src/components/dashboard/__tests__/ReviewQueue.test.tsx` -- covers REVW-01 component rendering
- [ ] `src/components/__tests__/skeletons.test.tsx` -- covers UX-04 skeleton rendering
- [ ] shadcn skeleton component: `npx shadcn add skeleton`

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `src/components/layout/Header.tsx` -- theme toggle already implemented
- Direct codebase analysis: `src/components/providers/ThemeProvider.tsx` -- next-themes configured
- Direct codebase analysis: `src/app/globals.css` -- both light and dark CSS variables defined
- Direct codebase analysis: `prisma/schema.prisma` -- current 7 models, Agent.isCustom present
- Direct codebase analysis: `src/lib/services/dashboard.ts` -- existing dashboard service pattern
- Direct codebase analysis: `src/app/page.tsx` -- dashboard server component pattern
- Direct codebase analysis: `src/lib/deliverable-parser.ts` -- parseDeliverables regex extraction
- Prisma migration docs -- SQLite NOT NULL constraint behavior

### Secondary (MEDIUM confidence)
- shadcn/ui skeleton component docs -- component API and usage
- Next.js App Router loading.tsx convention -- framework-native loading states

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, no new npm deps needed
- Architecture: HIGH -- extends established patterns exactly (server fetch + client render, dashboardService, Prisma include queries)
- Pitfalls: HIGH -- verified against actual schema and existing code patterns
- Theme toggle: HIGH -- already implemented, verified in Header.tsx source code

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no fast-moving dependencies)
