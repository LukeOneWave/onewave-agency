# Phase 7: Custom Agents + Session History - Research

**Researched:** 2026-03-10
**Domain:** Agent CRUD management, session history browsing, Next.js 16 + Prisma + Zustand patterns
**Confidence:** HIGH

## Summary

Phase 7 adds two feature areas to the existing OneWave application: (1) a custom agent builder allowing users to create, edit, clone, and delete agents, and (2) a session history browser allowing users to see past chats and resume them. Both features build on well-established patterns already in the codebase.

The existing Agent model already has an `isCustom` boolean field (defaults to `false`), meaning the schema is pre-designed for custom agents. Seeded agents have `isCustom: false` and custom agents will have `isCustom: true`. The session history feature is partially implemented -- the `/chat` page already shows recent sessions with agent info and message counts. It needs enhancement with better filtering, search, and session title display.

**Primary recommendation:** Follow the existing service-layer + API route + server component pattern. Agent CRUD uses Zod validation, the existing `agentService` pattern, and new API routes. Session history extends the existing `/chat` page with improved UX. No new libraries needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGNT-01 | User can create a custom agent with name, division, role, personality, and process instructions | New agent form component, POST `/api/agents` endpoint, `agentService.create()`, Zod validation schema. Agent model already has `isCustom` field. Custom agents need `systemPrompt` built from role/personality/process fields. |
| AGNT-02 | User can edit a custom agent's details after creation | Edit form (reuses create form), PATCH `/api/agents/[id]` endpoint, `agentService.update()`. Must check `isCustom: true` before allowing edit. |
| AGNT-03 | User can clone a seeded or custom agent as starting point | Clone button on agent detail page, pre-fills create form with cloned agent data. POST to same create endpoint with `clonedFromId` for tracing (optional). |
| AGNT-04 | User can delete a custom agent | DELETE `/api/agents/[id]` endpoint with `isCustom` guard. Must handle cascade -- sessions referencing deleted agent need consideration. Use soft delete or restrict if sessions exist. |
| UX-03 | User can browse past chat sessions and resume them | Enhanced `/chat` page with session list showing agent name, session title, message count, date. Click navigates to `/chat/[sessionId]` which already works. |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App router, API routes, server components | Already in use |
| Prisma | 7.4.2 | ORM for SQLite, Agent model CRUD | Already in use |
| Zustand | 5.0.11 | Client state management | Already in use |
| Zod | 4.3.6 | Form/API input validation | Already in use (see seed.ts) |
| Lucide React | 0.577.0 | Icons | Already in use |
| sonner | 2.0.7 | Toast notifications | Already in use |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui components | N/A | Card, Button, Badge, Input, Textarea, Tabs | Form UI for agent builder |
| class-variance-authority | 0.7.1 | Component variants | Styling agent form states |
| tailwind-merge + clsx | latest | Class merging | Component styling |

### No New Libraries Needed
This phase requires zero new dependencies. All UI patterns (forms, lists, cards, modals) can be built with existing shadcn components. The agent CRUD is standard Prisma operations. Session history browsing extends existing `/chat` page patterns.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    agents/
      page.tsx                  # Existing - add "Create Agent" button
      [slug]/
        page.tsx                # Existing - add edit/clone/delete buttons for custom agents
        edit/
          page.tsx              # NEW: Edit agent form page
      new/
        page.tsx                # NEW: Create agent form page
    chat/
      page.tsx                  # MODIFY: Enhanced session history list
    api/
      agents/
        route.ts                # MODIFY: Add POST for agent creation
        [id]/
          route.ts              # NEW: PATCH for edit, DELETE for delete
  components/
    agents/
      AgentForm.tsx             # NEW: Shared create/edit form component
      AgentDetail.tsx           # MODIFY: Add edit/clone/delete actions for custom agents
      AgentCard.tsx             # MODIFY: Show custom badge for custom agents
  lib/
    services/
      agent.ts                  # MODIFY: Add create, update, delete methods
    validations/
      agent.ts                  # NEW: Zod schema for agent form validation
  types/
    agent.ts                    # MODIFY: Add form-related types
```

### Pattern 1: Service Layer CRUD (Existing Pattern)
**What:** All database operations go through service functions in `src/lib/services/`
**When to use:** Every database operation in Phase 7
**Example:**
```typescript
// src/lib/services/agent.ts - extending existing service
export const agentService = {
  // ... existing methods ...

  async create(data: AgentCreateInput) {
    const slug = generateSlug(data.name);
    return prisma.agent.create({
      data: {
        ...data,
        slug,
        isCustom: true,
        systemPrompt: buildSystemPrompt(data),
        rawMarkdown: buildRawMarkdown(data),
      },
    });
  },

  async update(id: string, data: AgentUpdateInput) {
    return prisma.agent.update({
      where: { id, isCustom: true },
      data: {
        ...data,
        systemPrompt: buildSystemPrompt(data),
        rawMarkdown: buildRawMarkdown(data),
      },
    });
  },

  async delete(id: string) {
    return prisma.agent.delete({
      where: { id, isCustom: true },
    });
  },
};
```

### Pattern 2: API Route with Zod Validation (Existing Pattern)
**What:** Next.js API routes validate input with Zod before calling service layer
**When to use:** All new API endpoints
**Example:**
```typescript
// src/app/api/agents/route.ts
import { z } from "zod/v4";

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  division: z.string().min(1),
  description: z.string().min(1).max(500),
  role: z.string().min(1),
  personality: z.string().min(1),
  process: z.string().min(1),
  color: z.string().default("#6366f1"),
  tools: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const agent = await agentService.create(parsed.data);
  return NextResponse.json(agent, { status: 201 });
}
```

### Pattern 3: Server Component Page with Client Form (Existing Pattern)
**What:** Page is a server component that passes data to a client component for interactivity
**When to use:** Agent create/edit pages
**Example:**
```typescript
// src/app/agents/new/page.tsx (server component)
export default function NewAgentPage() {
  return <AgentForm mode="create" />;
}

// src/app/agents/[slug]/edit/page.tsx (server component)
export default async function EditAgentPage({ params }) {
  const { slug } = await params;
  const agent = await agentService.getBySlug(slug);
  if (!agent || !agent.isCustom) notFound();
  return <AgentForm mode="edit" agent={agent} />;
}
```

### Anti-Patterns to Avoid
- **Don't use client-side fetching for agent list:** The agents page is a server component that fetches directly via `agentService.getAll()`. Keep this pattern for the updated agents page.
- **Don't delete seeded agents:** The `isCustom` flag must be checked server-side before allowing delete. Never trust the client.
- **Don't create a separate "custom agents" page:** Custom agents should appear in the same Agent Catalog grid alongside seeded agents, with a visual indicator (badge) showing they are custom.
- **Don't use `generateStaticParams` for custom agents:** The existing agent detail page uses `generateStaticParams`. Custom agents are dynamic, so the page must handle both static (seeded) and dynamic (custom) paths. Use `dynamicParams = true` (which is the Next.js default).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom slug logic with edge cases | Simple `name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')` with uniqueness check | Keep it simple; add `-2`, `-3` suffix on conflict |
| Form validation | Manual field checking | Zod schema (already in project) | Consistent with seed.ts pattern, handles edge cases |
| Toast notifications | Custom alert components | `sonner` toast (already in project) | Already configured in layout.tsx |
| System prompt composition | Free-text-only prompt | Template that structures role/personality/process sections | Ensures consistent agent behavior |

**Key insight:** The biggest risk in this phase is over-engineering the agent builder. The Agent model already has `systemPrompt` and `rawMarkdown` fields. Custom agents need a form that collects structured input (name, role, personality, process) and composes it into a systemPrompt. Keep the form simple -- no WYSIWYG editors, just textareas.

## Common Pitfalls

### Pitfall 1: Slug Collisions Between Seeded and Custom Agents
**What goes wrong:** Custom agent name generates a slug that matches a seeded agent's slug
**Why it happens:** Seeded agent slugs come from markdown filenames; custom agent slugs are derived from user-entered names
**How to avoid:** Check slug uniqueness before creating. On collision, append `-1`, `-2`, etc. The `slug` field has a `@unique` constraint so Prisma will throw on conflict.
**Warning signs:** Prisma P2002 unique constraint violation errors

### Pitfall 2: Deleting Agents with Existing Sessions
**What goes wrong:** Deleting a custom agent that has chat sessions causes foreign key constraint violation
**Why it happens:** ChatSession has a required `agentId` FK to Agent with no cascade delete
**How to avoid:** Two options: (A) Prevent deletion if sessions exist and show a message, or (B) cascade delete sessions when agent is deleted. Option A is safer -- warn the user. The Agent model has `sessions ChatSession[]` but no `onDelete: Cascade`, so deletion will fail if sessions exist.
**Warning signs:** P2003 foreign key constraint error on delete

### Pitfall 3: Missing rawMarkdown for Custom Agents
**What goes wrong:** The agent detail page renders `agent.systemPrompt` via ReactMarkdown. Custom agents also need both `systemPrompt` and `rawMarkdown` populated.
**Why it happens:** Seeded agents get `rawMarkdown` from the full markdown file (including frontmatter). Custom agents need this generated.
**How to avoid:** Build `rawMarkdown` from structured fields using a template: frontmatter (name, description, color, tools) + body (role, personality, process sections). Keep `systemPrompt` as the body-only content for API calls.

### Pitfall 4: Session History Already Partially Exists
**What goes wrong:** Building session history from scratch when `/chat/page.tsx` already shows recent sessions
**Why it happens:** Not reviewing existing code before planning
**How to avoid:** The existing `/chat` page already calls `chatService.getRecentSessions()` and displays sessions with agent name, message count, and date. Enhancement needed: (1) show session title if available, (2) better empty state, (3) potentially add filtering by agent.

### Pitfall 5: Agent Form Fields vs Schema Fields Mismatch
**What goes wrong:** The requirements say "name, division, role, personality, and process" but the Agent schema has different fields: name, division, description, systemPrompt, etc.
**Why it happens:** Requirements describe user-facing form fields, not database columns
**How to avoid:** Map form fields to schema: `name` -> `name`, `division` -> `division`, `role` + `personality` + `process` -> composed into `systemPrompt` and `rawMarkdown`. Add `description` as a separate field (it's used on agent cards). The form should have: name, division (dropdown), description (short), role (textarea), personality (textarea), process (textarea), color (color picker or preset), tools (optional).

## Code Examples

### Agent Create/Edit Form Component
```typescript
// src/components/agents/AgentForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Agent } from "@/types/agent";

interface AgentFormProps {
  mode: "create" | "edit";
  agent?: Agent; // Pre-filled for edit/clone
}

export function AgentForm({ mode, agent }: AgentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Form state with fields...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = mode === "edit" ? `/api/agents/${agent!.id}` : "/api/agents";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save agent");
      const saved = await res.json();
      toast.success(mode === "edit" ? "Agent updated" : "Agent created");
      router.push(`/agents/${saved.slug}`);
      router.refresh(); // Revalidate server components
    } catch {
      toast.error("Failed to save agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### System Prompt Composition
```typescript
// src/lib/services/agent.ts
function buildSystemPrompt(data: {
  role: string;
  personality: string;
  process: string;
}): string {
  return [
    `## Role\n\n${data.role}`,
    `## Personality\n\n${data.personality}`,
    `## Process\n\n${data.process}`,
  ].join("\n\n");
}

function buildRawMarkdown(data: {
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
    `name: "${data.name}"`,
    `description: "${data.description}"`,
    `color: "${data.color}"`,
    data.tools ? `tools: "${data.tools}"` : null,
    "---",
  ].filter(Boolean).join("\n");

  return `${frontmatter}\n\n${buildSystemPrompt(data)}`;
}
```

### Clone Operation
```typescript
// In agent detail page - clone button handler
const handleClone = () => {
  // Navigate to create page with cloneFrom query param
  router.push(`/agents/new?cloneFrom=${agent.slug}`);
};

// In create page - load clone source
const cloneFrom = searchParams.cloneFrom;
let defaultValues = undefined;
if (cloneFrom) {
  const source = await agentService.getBySlug(cloneFrom);
  if (source) {
    defaultValues = {
      name: `${source.name} (Copy)`,
      division: source.division,
      description: source.description,
      // Parse systemPrompt back into role/personality/process
      // or use rawMarkdown parsing
    };
  }
}
```

### Session History Enhancement
```typescript
// src/lib/services/chat.ts - enhanced session listing
async getRecentSessions(limit = 50) {
  return prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      agent: {
        select: {
          name: true,
          division: true,
          slug: true,
          color: true,
          isCustom: true,
        },
      },
      _count: { select: { messages: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { content: true },
      },
    },
  });
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages router API routes | App Router route handlers | Next.js 13+ | Use `route.ts` in `app/api/` |
| `getServerSideProps` | Server components with direct service calls | Next.js 13+ | Agent pages fetch data directly |
| `router.refresh()` after mutations | `revalidatePath`/`revalidateTag` | Next.js 14+ | Both work; `router.refresh()` is simpler for this app's patterns |
| Prisma migrate dev | `db push` (no migration history) | Project decision Phase 6 | Continue using `db push` -- no schema changes needed for Phase 7 |

**No schema changes required:** The Agent model already has `isCustom: Boolean @default(false)`. No new models or fields are needed for Phase 7.

## Open Questions

1. **Structured vs. free-text systemPrompt for custom agents**
   - What we know: Seeded agents have richly structured markdown system prompts with sections. Requirements say "role, personality, and process fields."
   - What's unclear: Should the form have 3 separate textareas that compose into a systemPrompt, or one big textarea?
   - Recommendation: Use 3 separate textareas (role, personality, process) that compose into a structured systemPrompt. This gives better UX guidance and matches the requirements exactly.

2. **Division selection for custom agents**
   - What we know: Seeded agents belong to fixed divisions (design, engineering, marketing, etc.)
   - What's unclear: Should custom agents only pick from existing divisions, or can users create new divisions?
   - Recommendation: Dropdown of existing divisions only (fetched from `agentService.getDivisions()`). Creating new divisions adds complexity with no clear requirement for it.

3. **Agent deletion cascade behavior**
   - What we know: ChatSession has a required FK to Agent with no cascade delete
   - What's unclear: Should we prevent deletion when sessions exist, or cascade?
   - Recommendation: Prevent deletion with a clear error message ("This agent has X chat sessions. Delete those sessions first or archive the agent."). This is safer and more predictable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest.config.ts`) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/services/__tests__/agent.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGNT-01 | Create custom agent via service | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "create"` | Needs new tests |
| AGNT-01 | POST /api/agents validates and creates | unit | `npx vitest run src/app/api/agents/__tests__/route.test.ts` | Needs new file |
| AGNT-02 | Update custom agent via service | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "update"` | Needs new tests |
| AGNT-02 | PATCH /api/agents/[id] validates and updates | unit | `npx vitest run src/app/api/agents/__tests__/route.test.ts` | Needs new file |
| AGNT-03 | Clone agent pre-fills form data | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "clone"` | Needs new tests |
| AGNT-04 | Delete custom agent via service | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "delete"` | Needs new tests |
| AGNT-04 | Cannot delete seeded agent | unit | `npx vitest run src/lib/services/__tests__/agent.test.ts -t "delete seeded"` | Needs new tests |
| UX-03 | Session list returns sessions with agent info | unit | `npx vitest run src/lib/services/__tests__/chat.test.ts -t "getRecentSessions"` | Needs new tests |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/services/__tests__/agent.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Add `create`, `update`, `delete` test cases to `src/lib/services/__tests__/agent.test.ts`
- [ ] Create `src/app/api/agents/__tests__/route.test.ts` for POST/PATCH/DELETE endpoint tests
- [ ] Add `getRecentSessions` test cases to `src/lib/services/__tests__/chat.test.ts`

## Sources

### Primary (HIGH confidence)
- Project source code: `prisma/schema.prisma` -- Agent model with `isCustom` field
- Project source code: `src/lib/services/agent.ts` -- Existing service pattern
- Project source code: `src/lib/services/chat.ts` -- Existing `getRecentSessions` method
- Project source code: `src/app/chat/page.tsx` -- Existing session history UI
- Project source code: `src/app/agents/page.tsx` -- Existing agent catalog pattern
- Project source code: `prisma/seed.ts` -- Zod validation pattern for agent data

### Secondary (MEDIUM confidence)
- Next.js 16 App Router conventions for route handlers and server components
- Prisma query patterns for CRUD operations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, no new deps needed
- Architecture: HIGH - following exact patterns from existing codebase
- Pitfalls: HIGH - identified from direct schema and code analysis (FK constraints, slug conflicts, field mapping)

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no external dependencies to change)
