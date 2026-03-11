# Phase 10: Power User UX - Research

**Researched:** 2026-03-11
**Domain:** Command palette (Cmd+K), cross-entity search, keyboard-driven navigation, Next.js App Router
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | User can search across agents, projects, and sessions via Cmd+K | cmdk library provides the command palette UI; API route aggregates Prisma `contains` queries across Agent, Project, and ChatSession models; `useRouter` from `next/navigation` handles navigation on selection |
</phase_requirements>

---

## Summary

Phase 10 adds a global Cmd+K command palette that lets users search agents, projects, and past sessions from anywhere in the app and navigate directly to a selected entity. The implementation has three parts: (1) a search API route that fans out Prisma `contains` queries across three models, (2) a client-side `CommandPalette` component built on the `cmdk` library, and (3) a global keyboard listener mounted once in `AppShell` that toggles the palette open.

The project already uses React 19.2.3 and Next.js 16.1.6. The `cmdk` library (current stable: 1.1.1) declares full React 19 compatibility per the shadcn/ui upgrade tracker, so installation is straightforward with no overrides required. The project is single-user/local, so SQLite `LIKE` via Prisma `contains` is sufficient — no full-text search engine is needed (explicitly out of scope in REQUIREMENTS.md).

**Primary recommendation:** Install `cmdk`, build a `/api/search` route that runs three parallel Prisma `findMany` with `contains` filters, and mount the palette as a client component in `AppShell` with a `useEffect` keyboard listener.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cmdk | ^1.1.1 | Headless command palette UI: fuzzy search, keyboard navigation, accessible | Used by Linear, Raycast; full React 19 support confirmed |
| Next.js `useRouter` | already installed | Client-side navigation on item selection | App Router pattern, already in use throughout the project |
| Zustand | already installed | Palette open/close state (optional — `useState` in AppShell also acceptable) | Already in project; avoids prop drilling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | already installed | Result type icons (Users, FolderKanban, MessageSquare) | Match icons already used in Sidebar |
| Tailwind CSS | already installed | Styling the palette dialog | Project standard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cmdk | kbar | kbar provides actions+navigation; cmdk is simpler for pure search-and-navigate use case |
| cmdk | shadcn Command (wraps cmdk) | shadcn Command is a styled wrapper; cmdk direct gives more control and avoids shadcn CLI dependency |
| `/api/search` route | Client-side filter of pre-fetched data | Pre-fetch works but wastes bandwidth; API route scales better and follows project pattern |

**Installation:**
```bash
npm install cmdk
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── layout/
│       ├── AppShell.tsx          # Mount <CommandPalette /> here, add keyboard listener
│       ├── CommandPalette.tsx    # New: cmdk-powered overlay component
│       └── Sidebar.tsx           # Unchanged
├── app/
│   └── api/
│       └── search/
│           └── route.ts          # New: GET /api/search?q=... returns {agents, projects, sessions}
└── lib/
    └── services/
        └── search.ts             # New: searchService.query(q) — parallel Prisma findMany
```

### Pattern 1: Global Keyboard Listener in AppShell

**What:** Mount a single `useEffect` in `AppShell` that listens for `Cmd+K` / `Ctrl+K`, preventing the default browser behavior (which opens the address bar in some browsers), and toggling a state variable that controls whether `CommandPalette` is rendered.

**When to use:** AppShell is the single layout component that wraps every page — it is the correct location for a global listener. Avoids duplicate listeners from per-page mounting.

**Example:**
```typescript
// Source: cmdk official docs + standard React keydown pattern
"use client";

import { useState, useEffect } from "react";
import { CommandPalette } from "./CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
```

### Pattern 2: CommandPalette Component with cmdk

**What:** A client component that renders `Command.Dialog` from cmdk. On each keystroke in the input, it debounces and hits `/api/search?q=<query>`, then renders three `Command.Group` sections (Agents, Projects, Sessions). Selecting an item calls `router.push(url)` and closes the palette.

**When to use:** Whenever search results come from an API rather than a static list.

**Example:**
```typescript
// Source: cmdk GitHub README + Next.js App Router docs
"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Users, FolderKanban, MessageSquare } from "lucide-react";

interface SearchResult {
  agents: Array<{ id: string; name: string; slug: string; division: string }>;
  projects: Array<{ id: string; name: string }>;
  sessions: Array<{ id: string; title: string | null; agentName: string }>;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data);
    setLoading(false);
  }, []);

  function navigate(url: string) {
    router.push(url);
    onOpenChange(false);
    setQuery("");
    setResults(null);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Global search"
    >
      <Command.Input
        value={query}
        onValueChange={(v) => { setQuery(v); search(v); }}
        placeholder="Search agents, projects, sessions..."
      />
      <Command.List>
        {loading && <Command.Loading>Searching...</Command.Loading>}
        {!loading && query && !results?.agents.length && !results?.projects.length && !results?.sessions.length && (
          <Command.Empty>No results found for "{query}"</Command.Empty>
        )}
        {results?.agents.length ? (
          <Command.Group heading="Agents">
            {results.agents.map((a) => (
              <Command.Item key={a.id} onSelect={() => navigate(`/agents/${a.slug}`)}>
                <Users className="mr-2 h-4 w-4" />
                {a.name}
                <span className="ml-auto text-xs text-muted-foreground">{a.division}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        {results?.projects.length ? (
          <Command.Group heading="Projects">
            {results.projects.map((p) => (
              <Command.Item key={p.id} onSelect={() => navigate(`/projects/${p.id}`)}>
                <FolderKanban className="mr-2 h-4 w-4" />
                {p.name}
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        {results?.sessions.length ? (
          <Command.Group heading="Sessions">
            {results.sessions.map((s) => (
              <Command.Item key={s.id} onSelect={() => navigate(`/chat/${s.id}`)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {s.title ?? "Untitled session"}
                <span className="ml-auto text-xs text-muted-foreground">{s.agentName}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
      </Command.List>
    </Command.Dialog>
  );
}
```

### Pattern 3: Search API Route

**What:** A GET `/api/search` route handler that extracts `q` from `searchParams`, runs three `prisma.findMany` in parallel via `Promise.all`, and returns a typed JSON payload.

**When to use:** Entity-only search at single-user scale — SQLite `contains` (LIKE) is sufficient per REQUIREMENTS.md decision.

**Example:**
```typescript
// Source: Prisma filtering docs + Next.js App Router route handler pattern
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ agents: [], projects: [], sessions: [] });

  const [agents, projects, sessions] = await Promise.all([
    prisma.agent.findMany({
      where: { OR: [{ name: { contains: q } }, { description: { contains: q } }, { division: { contains: q } }] },
      select: { id: true, name: true, slug: true, division: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.chatSession.findMany({
      where: { OR: [{ title: { contains: q } }, { agent: { name: { contains: q } } }] },
      select: { id: true, title: true, agent: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    agents,
    projects,
    sessions: sessions.map((s) => ({ ...s, agentName: s.agent.name })),
  });
}
```

### Anti-Patterns to Avoid

- **Mounting the keyboard listener inside individual page components:** Results in duplicate or missing listeners depending on which page is rendered. Mount once in AppShell.
- **Blocking the main input event with cmdk's built-in filter on async results:** cmdk's built-in `filter` function runs on `Command.Item` children — when using async results, disable it by setting `shouldFilter={false}` on `<Command>`. Filtering is done server-side via the API.
- **Navigating without closing the palette:** Always call `onOpenChange(false)` before or after `router.push()` to avoid a ghost overlay.
- **No debounce on the API call:** Every keystroke fires a request. Debounce at 200-300ms or use a simple `setTimeout`/`clearTimeout` pattern to avoid hammering SQLite on fast typists.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard navigation in results list | Custom arrow-key handler | cmdk | cmdk handles arrow keys, Enter, Escape, Home/End, and wrapping automatically with full ARIA |
| Fuzzy matching / result scoring | Custom string distance algorithm | cmdk's built-in filter (for static lists) or server-side LIKE (for async) | cmdk's filter is battle-tested; SQLite LIKE is sufficient per requirements |
| Dialog/overlay with focus trap | Custom modal | `Command.Dialog` from cmdk | Focus trap, scroll lock, Escape handling, and portal rendering are all included |
| Type-ahead input accessibility | Custom combobox ARIA | cmdk | cmdk is built to the combobox ARIA pattern out of the box |

**Key insight:** cmdk is specifically designed for this exact use case. The entire palette — keyboard nav, filtering, ARIA, Escape to close — is solved by the library. The only custom code needed is the keyboard listener to open it and the API route to supply results.

---

## Common Pitfalls

### Pitfall 1: cmdk's Built-In Filter Conflicts with Async Results

**What goes wrong:** `Command` renders items and immediately filters them by the input value using its internal filter. When results come from an API (already filtered), the built-in filter runs again and may hide matching items if the item's text content doesn't exactly match the internal scoring function.

**Why it happens:** cmdk's filter is designed for static command lists, not server-filtered async results.

**How to avoid:** Set `shouldFilter={false}` on the root `<Command>` component when using async search. All filtering is delegated to the API.

**Warning signs:** Search results that disappear while typing, or results that only show for exact substring matches.

### Pitfall 2: Cmd+K Intercepted by Browser

**What goes wrong:** In some browsers (Firefox, Safari), `Cmd+K` / `Ctrl+K` opens the address bar or location focus. If `e.preventDefault()` is not called before toggling state, the browser action fires anyway.

**Why it happens:** The browser handles the keydown event before React state updates propagate.

**How to avoid:** Always call `e.preventDefault()` inside the keydown handler before any state mutation.

### Pitfall 3: AppShell Already Imports as Client Component

**What goes wrong:** AppShell is already `"use client"` — this is correct. However, if `CommandPalette` imports server-only modules (e.g., Prisma), the build fails with a "server-only module imported in client component" error.

**Why it happens:** Next.js enforces server/client boundaries at the import level.

**How to avoid:** `CommandPalette` must be a pure client component (`"use client"`). All data fetching happens via `fetch("/api/search")`, never via direct Prisma/service imports.

### Pitfall 4: Session Title is Nullable

**What goes wrong:** `ChatSession.title` is `String?` in the Prisma schema (can be null). Displaying `session.title` directly causes `null` to render as the literal string "null" in some JSX contexts.

**Why it happens:** JavaScript coerces null to "null" in template literals.

**How to avoid:** Always use `session.title ?? "Untitled session"` in the Command.Item label. The existing `getRecentSessions` service already handles this pattern.

### Pitfall 5: Next.js 15+ Async `params` Pattern Not Needed Here

**What goes wrong:** The search route is a GET with `searchParams`, not a dynamic `[param]` route. Teams sometimes try to await `params` on a non-dynamic route, causing type errors.

**Why it happens:** Confusion with the Phase 08 decision that all dynamic route params must be awaited as `Promise<{id: string}>`.

**How to avoid:** The search route uses `req.nextUrl.searchParams.get("q")` — no async params needed. Only applies to `[slug]` and `[id]` routes.

---

## Code Examples

### Debounce Pattern for Search Input
```typescript
// Source: Standard React pattern — useCallback + setTimeout
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleInput(value: string) {
  setQuery(value);
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => search(value), 250);
}
```

### Reset State When Palette Closes
```typescript
// Source: cmdk docs — onOpenChange is called on Escape or overlay click
<Command.Dialog
  open={open}
  onOpenChange={(isOpen) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setQuery("");
      setResults(null);
    }
  }}
>
```

### Prisma `contains` Filter (Case-Insensitive in SQLite)
```typescript
// Source: Prisma filtering docs
// SQLite's LIKE is case-insensitive for ASCII by default.
// Prisma `contains` maps to LIKE '%value%'
where: { name: { contains: q } }  // becomes: WHERE name LIKE '%q%'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom combobox from scratch | cmdk (headless, composable) | ~2022 | Accessibility and keyboard nav handled by library |
| Radix Dialog + custom filter | `Command.Dialog` from cmdk | ~2022 | All-in-one: portal, focus trap, filter, ARIA |
| kbar (action registry model) | cmdk (pure search model) | Preference-based | kbar better for command registries; cmdk better for search-navigate |

**Deprecated/outdated:**
- Headless UI Command (Tailwind Labs): Still works but cmdk has broader ecosystem adoption and React 19 support confirmed.

---

## Open Questions

1. **Debounce vs. immediate fetch**
   - What we know: 250ms debounce is the conventional sweet spot for search inputs.
   - What's unclear: Whether the local SQLite response is fast enough to skip debounce entirely (likely yes at local scale, but debounce is still good practice).
   - Recommendation: Use 250ms debounce; simplest to implement and prevents unnecessary work.

2. **Minimum query length**
   - What we know: Short queries (1 char) can return many results; the API uses `take: 5` per entity type.
   - What's unclear: Whether a 1-character minimum feels right to users or whether 2 characters is better.
   - Recommendation: Allow 1+ characters — the `take: 5` limit per type keeps results manageable.

3. **Keyboard trigger for Cmd+K while an input is focused**
   - What we know: `document.addEventListener` captures the event from all elements including focused inputs.
   - What's unclear: Whether this should be suppressed when the user is typing in a chat textarea (false trigger risk).
   - Recommendation: Do not suppress — Cmd+K is a system-level shortcut convention, and users expect it to work anywhere. The palette's Escape key dismisses it immediately.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + jsdom |
| Config file | `/Users/luke/onewave-agency/vitest.config.ts` |
| Quick run command | `npm test -- --reporter=verbose src/lib/services/__tests__/search.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | `searchService.query("x")` returns agents, projects, sessions from DB | unit (mocked Prisma) | `npm test -- src/lib/services/__tests__/search.test.ts` | Wave 0 |
| UX-01 | Empty query returns empty arrays | unit | same | Wave 0 |
| UX-01 | Agent slug used for navigation URL construction | unit | same | Wave 0 |
| UX-01 | API route GET /api/search?q=x returns 200 with correct shape | integration (manual smoke) | `npm run dev` then `curl "http://localhost:3000/api/search?q=test"` | manual |
| UX-01 | Cmd+K opens palette (keyboard listener) | manual | Open app, press Cmd+K | manual |
| UX-01 | Selecting result navigates to correct URL | manual | Open palette, select item, verify URL | manual |

### Sampling Rate
- **Per task commit:** `npm test -- src/lib/services/__tests__/search.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/services/__tests__/search.test.ts` — covers UX-01 service layer (mocked Prisma pattern matching agent-crud.test.ts)
- [ ] `src/lib/services/search.ts` — the service itself (created during implementation, not pre-existing)

---

## Sources

### Primary (HIGH confidence)
- [cmdk GitHub README (pacocoursey/cmdk)](https://github.com/pacocoursey/cmdk) — API components, keyboard shortcut pattern, `shouldFilter` prop
- [shadcn/ui React 19 upgrade tracker](https://ui.shadcn.com/docs/react-19) — confirmed cmdk React 19 compatibility (no overrides needed)
- Prisma schema at `/Users/luke/onewave-agency/prisma/schema.prisma` — Agent, ChatSession, Project model fields confirmed
- Project codebase — AppShell, Sidebar, Header patterns; existing service layer conventions; route URL patterns (`/agents/[slug]`, `/projects/[id]`, `/chat/[sessionId]`)

### Secondary (MEDIUM confidence)
- [Boost Your React App with cmdk](https://knowledge.buka.sh/boost-your-react-app-with-a-sleek-command-palette-using-cmdk/) — practical implementation patterns verified against cmdk README
- [Next.js useRouter App Router docs](https://nextjs.org/docs/app/api-reference/functions/use-router) — `router.push()` navigation pattern
- [Prisma filtering docs](https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting) — `contains` filter behavior

### Tertiary (LOW confidence)
- WebSearch results on kbar — considered but not chosen; no deep verification of kbar React 19 compatibility

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — cmdk React 19 support confirmed by shadcn official docs; library API verified from GitHub README
- Architecture: HIGH — patterns derived directly from existing project conventions (AppShell, service layer, API route structure)
- Pitfalls: HIGH for pitfalls 1-4 (verified from cmdk docs and project schema); MEDIUM for pitfall 5 (derived from project Phase 08 decision log)

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (cmdk is stable; React 19 support is now declared; Next.js App Router patterns are stable)
