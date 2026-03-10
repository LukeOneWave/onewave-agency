# Phase 5: Dashboard and Polish - Research

**Researched:** 2026-03-09
**Domain:** Dashboard UI, data aggregation, charting (React/Next.js)
**Confidence:** HIGH

## Summary

Phase 5 replaces the current placeholder dashboard (which shows only agent count, session count, and recent chats) with a full-featured dashboard displaying aggregate stats, a chronological activity feed, and an agent utilization chart. The existing data model already captures everything needed: `Message` has `inputTokens`/`outputTokens`, `ChatSession` and `Mission` have timestamps and agent relations, and `Deliverable` has status tracking. No schema changes are required.

The charting requirement (DASH-03) needs a visualization library. Recharts is the standard choice for React apps -- it is declarative, component-based, lightweight (SVG-based with minimal D3 dependencies), and works seamlessly with server-side data passed as props to client components. The stats and activity feed are pure Prisma aggregation queries served from a new dashboard service.

**Primary recommendation:** Create a `dashboardService` with three focused query methods, add Recharts for the utilization chart, and rebuild `page.tsx` as a server component that passes data to lightweight client chart components.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard shows stats (active sessions, agents used, tokens consumed) | Prisma aggregation queries on ChatSession, Message, Agent. Token data already stored in `inputTokens`/`outputTokens` on Message model. |
| DASH-02 | Dashboard shows recent activity feed | Chronological union of ChatSession creation, Mission creation, and Deliverable status changes. All models have `createdAt`/`updatedAt` timestamps. |
| DASH-03 | Dashboard shows agent utilization chart | Prisma groupBy on ChatSession.agentId + MissionLane.agentId, visualized with Recharts BarChart or horizontal bar. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15 | Agent utilization chart (DASH-03) | De facto React charting library; declarative, component-based, SVG rendering, works with SSR |

### Already Installed (no additions needed)
| Library | Purpose | Relevance |
|---------|---------|-----------|
| Prisma 7 | Data aggregation queries | groupBy, count, sum for stats |
| lucide-react | Stat card icons | Activity, Users, Zap, BarChart3 icons |
| shadcn/ui (card) | Stat card containers | Already have card.tsx |
| Tailwind CSS 4 | Layout and styling | Grid layouts, responsive spacing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | chart.js + react-chartjs-2 | More powerful but heavier; canvas-based so no SSR; overkill for one bar chart |
| Recharts | @nivo/bar | Beautiful defaults but larger bundle; more opinionated theming |
| Recharts | Native SVG | Zero dependencies but must hand-roll axes, labels, tooltips, responsiveness |
| Recharts | shadcn/ui charts | shadcn charts ARE Recharts under the hood; using Recharts directly is simpler |

**Installation:**
```bash
npm install recharts
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── page.tsx                    # Server component: fetches data, renders dashboard
├── components/
│   └── dashboard/
│       ├── StatCards.tsx            # Server component: 3 stat cards in a grid
│       ├── ActivityFeed.tsx         # Server component: chronological event list
│       └── UtilizationChart.tsx     # Client component ("use client"): Recharts bar chart
└── lib/
    └── services/
        └── dashboard.ts            # Prisma queries for all dashboard data
```

### Pattern 1: Server-First with Client Chart Island
**What:** The dashboard page is a Next.js server component that fetches all data via Prisma, passes serialized data as props to a single client component (the chart).
**When to use:** When only one section needs interactivity (tooltips on chart).
**Example:**
```typescript
// src/app/page.tsx (server component)
import { dashboardService } from "@/lib/services/dashboard";
import { StatCards } from "@/components/dashboard/StatCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { UtilizationChart } from "@/components/dashboard/UtilizationChart";

export default async function DashboardPage() {
  const [stats, activities, utilization] = await Promise.all([
    dashboardService.getStats(),
    dashboardService.getRecentActivity(20),
    dashboardService.getAgentUtilization(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <StatCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ActivityFeed activities={activities} />
        <UtilizationChart data={utilization} />
      </div>
    </div>
  );
}
```

### Pattern 2: Dashboard Service with Aggregation Queries
**What:** A dedicated service module with Prisma queries that aggregate across models.
**When to use:** Any dashboard-style data needs.
**Example:**
```typescript
// src/lib/services/dashboard.ts
import { prisma } from "@/lib/prisma";

export const dashboardService = {
  async getStats() {
    const [activeSessions, agentsUsed, tokenData] = await Promise.all([
      prisma.chatSession.count(),
      prisma.chatSession.groupBy({ by: ["agentId"] }).then(r => r.length),
      prisma.message.aggregate({
        _sum: { inputTokens: true, outputTokens: true },
      }),
    ]);

    return {
      activeSessions,
      agentsUsed,
      tokensConsumed:
        (tokenData._sum.inputTokens ?? 0) + (tokenData._sum.outputTokens ?? 0),
    };
  },

  async getAgentUtilization() {
    // Count sessions per agent, include agent name
    const results = await prisma.chatSession.groupBy({
      by: ["agentId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Fetch agent names for the top agents
    const agentIds = results.map(r => r.agentId);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, color: true },
    });

    const agentMap = new Map(agents.map(a => [a.id, a]));
    return results.map(r => ({
      name: agentMap.get(r.agentId)?.name ?? "Unknown",
      color: agentMap.get(r.agentId)?.color ?? "#888",
      sessions: r._count.id,
    }));
  },
};
```

### Pattern 3: Activity Feed as Unified Timeline
**What:** Query recent records from multiple tables, merge and sort chronologically.
**When to use:** Cross-entity activity feeds.
**Example:**
```typescript
async getRecentActivity(limit = 20) {
  const [sessions, missions, deliverables] = await Promise.all([
    prisma.chatSession.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { agent: { select: { name: true } } },
    }),
    prisma.mission.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { lanes: { include: { agent: { select: { name: true } } } } },
    }),
    prisma.deliverable.findMany({
      where: { status: { not: "pending" } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        message: {
          include: {
            session: { include: { agent: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  // Map to unified ActivityItem type, merge, sort by date, take top N
  const items = [
    ...sessions.map(s => ({
      type: "chat" as const,
      description: `Started chat with ${s.agent.name}`,
      timestamp: s.createdAt,
    })),
    ...missions.map(m => ({
      type: "mission" as const,
      description: `Launched mission with ${m.lanes.length} agents`,
      timestamp: m.createdAt,
    })),
    ...deliverables.map(d => ({
      type: "deliverable" as const,
      description: `${d.status === "approved" ? "Approved" : "Revised"} deliverable from ${d.message.session.agent.name}`,
      timestamp: d.updatedAt,
    })),
  ];

  return items
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}
```

### Anti-Patterns to Avoid
- **Fetching all messages to count tokens client-side:** Use Prisma `aggregate` with `_sum` -- the DB does the work
- **Making the entire dashboard a client component:** Only the chart needs "use client"; stats and feed are pure server renders
- **Separate API routes for each stat:** This is a server-rendered page; call Prisma directly from the server component or service, no need for fetch calls

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar chart with axes/tooltips | Custom SVG bar chart | Recharts BarChart | Axes, labels, tooltips, responsive containers, dark mode compat |
| Relative time display | Custom "X minutes ago" | `Intl.RelativeTimeFormat` or simple helper | Edge cases with timezones, pluralization |
| Token number formatting | Manual string formatting | `Intl.NumberFormat` with compact notation | Handles thousands/millions, locale-aware |

**Key insight:** The dashboard is mostly data aggregation (Prisma) and layout (Tailwind grid). The only non-trivial UI component is the chart, which Recharts handles completely.

## Common Pitfalls

### Pitfall 1: Null Token Values
**What goes wrong:** `inputTokens` and `outputTokens` are nullable `Int?` in the schema. Prisma `_sum` returns null when all values are null, not 0.
**Why it happens:** Messages from the user role never have token counts; only assistant messages do.
**How to avoid:** Always coalesce: `(tokenData._sum.inputTokens ?? 0) + (tokenData._sum.outputTokens ?? 0)`
**Warning signs:** Dashboard shows "null" or "NaN" for token count.

### Pitfall 2: Recharts in Server Components
**What goes wrong:** Recharts uses React hooks internally and fails with "useState is not defined" errors.
**Why it happens:** Recharts components are client-only; Next.js server components cannot use them.
**How to avoid:** Create a dedicated `UtilizationChart.tsx` with `"use client"` directive. Pass data as serializable props (plain objects, no Date instances).
**Warning signs:** Build/hydration errors mentioning hooks.

### Pitfall 3: Empty State When No Data
**What goes wrong:** Chart renders empty or breaks when there are zero sessions.
**Why it happens:** New installations have no chat/mission data.
**How to avoid:** Check data length and show meaningful empty states: "Start chatting with agents to see utilization data."
**Warning signs:** Blank chart area, broken axis labels.

### Pitfall 4: Date Serialization Across Server/Client Boundary
**What goes wrong:** Dates from Prisma are Date objects that can't cross the server-client boundary.
**Why it happens:** React Server Components serialize props as JSON; Date becomes a string.
**How to avoid:** Convert dates to ISO strings in the service or use `.toISOString()` before passing to client components.
**Warning signs:** Hydration mismatch errors, "[object Object]" in timestamps.

### Pitfall 5: N+1 Queries in Activity Feed
**What goes wrong:** Activity feed queries become slow with many include/join levels.
**Why it happens:** The unified timeline needs data from multiple related models.
**How to avoid:** Use separate parallel queries with Promise.all rather than deeply nested includes. Take only top N from each source before merging.
**Warning signs:** Dashboard page loads slowly as data grows.

## Code Examples

### Recharts Bar Chart with Dark Mode Support
```typescript
// src/components/dashboard/UtilizationChart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AgentUtilization {
  name: string;
  color: string;
  sessions: number;
}

export function UtilizationChart({ data }: { data: AgentUtilization[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p>No agent usage data yet.</p>
        <p className="text-sm">Start chatting to see utilization.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Agent Utilization</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={80} />
          <Tooltip />
          <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Stat Card Pattern (matching existing UI style)
```typescript
// Uses existing card styling pattern from current page.tsx
import { Activity, Users, Zap } from "lucide-react";

interface DashboardStats {
  activeSessions: number;
  agentsUsed: number;
  tokensConsumed: number;
}

export function StatCards({ stats }: { stats: DashboardStats }) {
  const formatter = new Intl.NumberFormat("en", { notation: "compact" });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="flex items-center gap-4 rounded-lg border p-6">
        <Activity className="h-8 w-8 text-primary" />
        <div>
          <p className="text-2xl font-bold">{stats.activeSessions}</p>
          <p className="text-sm text-muted-foreground">Active Sessions</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-lg border p-6">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <p className="text-2xl font-bold">{stats.agentsUsed}</p>
          <p className="text-sm text-muted-foreground">Agents Used</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-lg border p-6">
        <Zap className="h-8 w-8 text-primary" />
        <div>
          <p className="text-2xl font-bold">{formatter.format(stats.tokensConsumed)}</p>
          <p className="text-sm text-muted-foreground">Tokens Consumed</p>
        </div>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chart.js with imperative API | Recharts declarative components | Established ~2020 | React-native feel, no refs/effects needed |
| Client-side data fetching for dashboards | Next.js server components with direct DB access | Next.js 13+ (2023) | No loading spinners, instant render, zero client JS for static data |
| Custom aggregation in JS | Prisma groupBy + aggregate | Prisma 2.20+ (2021) | DB-level aggregation, much faster |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Stats queries return correct counts/sums | unit | `npx vitest run src/lib/services/__tests__/dashboard.test.ts -t "getStats" -x` | No - Wave 0 |
| DASH-02 | Activity feed merges and sorts events | unit | `npx vitest run src/lib/services/__tests__/dashboard.test.ts -t "getRecentActivity" -x` | No - Wave 0 |
| DASH-03 | Utilization query returns agent session counts | unit | `npx vitest run src/lib/services/__tests__/dashboard.test.ts -t "getAgentUtilization" -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/services/__tests__/dashboard.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/services/__tests__/dashboard.test.ts` -- covers DASH-01, DASH-02, DASH-03
- [ ] Prisma mock setup (reuse pattern from existing service tests)

## Open Questions

1. **Token granularity: input vs output breakdown?**
   - What we know: Schema stores `inputTokens` and `outputTokens` separately on each Message
   - What's unclear: Whether DASH-01 "tokens consumed" means total or should show input/output split
   - Recommendation: Show total as the headline stat; could show input/output breakdown in a tooltip or secondary display. Keep it simple for v1.

2. **Activity feed: how far back?**
   - What we know: DASH-02 says "recent activity feed" -- no specific timeframe
   - What's unclear: Should it be last N items or last N days?
   - Recommendation: Last 20 items, most recent first. Simple, predictable, no empty states from quiet periods.

## Sources

### Primary (HIGH confidence)
- Project codebase: Prisma schema, existing services, current page.tsx -- direct inspection
- [Recharts GitHub](https://github.com/recharts/recharts) -- component API, usage patterns
- [Recharts official site](https://recharts.github.io/) -- examples, BarChart docs

### Secondary (MEDIUM confidence)
- [Syncfusion React chart comparison 2026](https://www.syncfusion.com/blogs/post/top-5-react-chart-libraries) -- ecosystem landscape

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts is well-established, only one new dependency needed
- Architecture: HIGH - Pattern follows existing codebase conventions (server components + services)
- Pitfalls: HIGH - Based on direct schema inspection and known Next.js/Prisma behaviors

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable domain, no fast-moving dependencies)
