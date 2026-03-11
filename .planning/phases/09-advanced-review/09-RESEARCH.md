# Phase 9: Advanced Review - Research

**Researched:** 2026-03-11
**Domain:** Diff comparison, inline editing, deliverable Kanban, project deliverables tab
**Confidence:** HIGH

## Summary

Phase 9 adds four interconnected features that deepen the review workflow: (1) side-by-side diff view between deliverable versions, (2) click-to-edit inline editing of deliverable content, (3) a deliverables tab on the project detail page, and (4) an orchestration review board (Kanban organized by deliverable review status). All four features are purely UI + service layer work — the Prisma schema already has `Deliverable`, `DeliverableVersion`, `Mission`, and `MissionLane` models in place.

The diff view is the most complex feature. The ecosystem standard is `diff` (npm) for computing diffs and `react-diff-viewer-continued` for rendering them. The `DeliverableVersion` model already exists in the schema (`version: Int`, `content: String`, `@@unique([deliverableId, version])`), but the service layer does not yet create versions — version creation needs to be wired in when deliverable content is edited and saved. The inline edit uses a simple textarea (already decided in v2.0 roadmap — rich text editor is out of scope). The orchestration review board reuses the @dnd-kit patterns from Phase 8, but columns map to deliverable statuses (`pending | approved | revised`) rather than task statuses.

The key design decision is the trigger for version creation: a `DeliverableVersion` record should be created whenever the user saves edited content (REVW-03 inline edit). The "current" content lives on `Deliverable.content`; the version history lives in `DeliverableVersion[]`. An API endpoint `POST /api/deliverables/[id]/versions` needs to be added alongside the existing `PATCH` endpoint.

**Primary recommendation:** Use `diff` npm package + `react-diff-viewer-continued` for diff rendering; textarea-based inline edit with a save button; new `deliverableService` methods for version management; reuse `@dnd-kit/core` + `@dnd-kit/sortable` for the orchestration review board.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REVW-02 | User can view a side-by-side diff between deliverable revision versions | `DeliverableVersion` model exists; need `diff` + `react-diff-viewer-continued`; new `GET /api/deliverables/[id]/versions` endpoint; `DiffViewer` component |
| REVW-03 | User can click on deliverable content to enter edit mode, modify in textarea, and save | `Deliverable.content` field exists; inline state toggle in existing `ReviewPanel` or new wrapper; `PATCH /api/deliverables/[id]` updated to accept content; version saved on each edit |
| PROJ-06 | User can view a deliverables tab on a project showing all deliverables with review status | Need to traverse Project > Task > (no direct FK) — deliverables are tied to ChatSession/Message; need a new query path OR a project-scoped deliverable join; most practical: query deliverables by missionId/sessionIds tied to project — but schema has no direct project→deliverable path; see Open Questions |
| PROJ-07 | User can view mission deliverables in a Kanban board organized by review status | Mission > MissionLane > ChatSession > Message > Deliverable path exists; deliverable statuses become columns; @dnd-kit reuse from Phase 8; new route at `/orchestration/[missionId]/review` or tab on existing mission page |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| diff | ^7.0.0 | Line/word/char diff computation | Pure JS, well-maintained, used by most diff renderers |
| react-diff-viewer-continued | ^4.0.0 | React component for side-by-side diff rendering | Active fork of react-diff-viewer (original abandoned), supports dark mode |
| @dnd-kit/core | 6.3.1 | Already installed — drag-and-drop for review Kanban | Same library used for Task Kanban in Phase 8 |
| @dnd-kit/sortable | 10.0.0 | Already installed — sortable items in review Kanban | Same library used for Task Kanban in Phase 8 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Already installed — toast on save/error | Inline edit save feedback |
| lucide-react | 0.577.0 | Already installed — Edit, Check, X icons | Inline edit toggle button |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-diff-viewer-continued | diff2html | diff2html produces HTML strings; needs dangerouslySetInnerHTML or a wrapper; react-diff-viewer-continued is a proper React component |
| react-diff-viewer-continued | monaco-editor diff | Monaco is ~5MB bundle; overkill for read-only diff view in a local app |
| Custom textarea edit | contentEditable | REQUIREMENTS.md explicitly rules out contentEditable — "textarea edit is sufficient" |

**Installation:**
```bash
npm install diff react-diff-viewer-continued
npm install --save-dev @types/diff
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── projects/
│   │   └── [id]/
│   │       └── page.tsx          # Add Tabs: "Board" (existing) + "Deliverables" (new)
│   └── api/
│       └── deliverables/
│           └── [id]/
│               ├── route.ts      # Existing PATCH (update status/feedback) — extend to handle content
│               └── versions/
│                   └── route.ts  # New GET (list versions) + POST (create version)
├── components/
│   ├── projects/
│   │   └── DeliverablesList.tsx  # Deliverables tab content for PROJ-06
│   ├── chat/
│   │   ├── ReviewPanel.tsx       # Extend with inline edit (REVW-03)
│   │   └── DiffViewer.tsx        # New: side-by-side diff (REVW-02)
│   └── orchestration/
│       └── ReviewBoard.tsx       # New: Kanban by deliverable status (PROJ-07)
└── lib/
    └── services/
        └── deliverable.ts        # Extend with: getVersions, createVersion, updateContent
```

### Pattern 1: Deliverable Inline Edit (REVW-03)
**What:** Click-to-edit pattern — content displays as rendered markdown; clicking "Edit" switches to textarea; saving calls PATCH and creates a new version.
**When to use:** Any time the user wants to modify deliverable content.
**Example:**
```typescript
// "use client" — inside ReviewPanel or DeliverableBlock
const [editing, setEditing] = useState(false);
const [draft, setDraft] = useState(content);

async function handleSave() {
  // 1. Update content on Deliverable
  await fetch(`/api/deliverables/${deliverableId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: draft }),
  });
  // 2. Create a DeliverableVersion snapshot
  await fetch(`/api/deliverables/${deliverableId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: draft }),
  });
  setEditing(false);
  toast.success("Saved");
}

return editing ? (
  <div className="space-y-2">
    <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} />
    <div className="flex gap-2">
      <Button size="sm" onClick={handleSave}><Check /> Save</Button>
      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
    </div>
  </div>
) : (
  <div className="relative group">
    {/* existing markdown render */}
    <Button size="sm" variant="ghost" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
            onClick={() => setEditing(true)}><Edit size={14} /> Edit</Button>
  </div>
);
```

### Pattern 2: Side-by-Side Diff View (REVW-02)
**What:** Fetch all `DeliverableVersion[]` records for a deliverable; display a version picker (dropdown or prev/next buttons); render selected pair with `react-diff-viewer-continued`.
**When to use:** When user wants to compare two version snapshots.
**Example:**
```typescript
// Source: react-diff-viewer-continued docs
import ReactDiffViewer from "react-diff-viewer-continued";

<ReactDiffViewer
  oldValue={versions[selectedOld].content}
  newValue={versions[selectedNew].content}
  splitView={true}
  useDarkTheme={isDark}
  leftTitle={`Version ${versions[selectedOld].version}`}
  rightTitle={`Version ${versions[selectedNew].version}`}
/>
```

### Pattern 3: Orchestration Review Board (PROJ-07)
**What:** Kanban board with columns for each deliverable status (`pending | approved | revised`). Cards represent individual deliverables pulled from a mission. Drag between columns updates `Deliverable.status` via PATCH.
**When to use:** On the mission detail page, as a tab or dedicated section.
**Example:**
```typescript
// Reuse Phase 8 KanbanBoard pattern — columns are statuses, cards are deliverables
const REVIEW_STATUSES = ["pending", "approved", "revised"] as const;
type ReviewStatus = typeof REVIEW_STATUSES[number];

// Deliverable card with agent attribution
interface DeliverableCardProps {
  deliverable: DeliverableWithContext; // includes agent name via MissionLane
  status: ReviewStatus;
}
```

### Pattern 4: Deliverable Version Service
```typescript
// src/lib/services/deliverable.ts — add to existing deliverableService

async getVersions(deliverableId: string) {
  return prisma.deliverableVersion.findMany({
    where: { deliverableId },
    orderBy: { version: "asc" },
  });
},

async createVersion(deliverableId: string, content: string) {
  // Get current max version number
  const latest = await prisma.deliverableVersion.findFirst({
    where: { deliverableId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  return prisma.deliverableVersion.create({
    data: { deliverableId, version: nextVersion, content },
  });
},

async updateContent(deliverableId: string, content: string) {
  return prisma.deliverable.update({
    where: { id: deliverableId },
    data: { content },
  });
},
```

### Pattern 5: Project Deliverables Tab (PROJ-06)
**What:** The project detail page (`/projects/[id]`) gains a Tabs component with "Board" (existing Kanban) and "Deliverables" tabs. The deliverables tab needs to query deliverables related to the project.
**Schema path:** Project → (no direct FK to sessions/missions) → deliverables are tied to ChatSessions. There is no direct Project→Deliverable FK in the schema.
**Design decision:** The most pragmatic v2.0 approach is to query ALL deliverables and filter by the project's task agents, OR to add a `projectId` optional FK to `ChatSession` or `Deliverable`. See Open Questions.
**When to use:** As a second tab on `/projects/[id]/page.tsx`.

### Anti-Patterns to Avoid
- **Creating versions on every status change:** Version creation should only happen on content edits (REVW-03), not on approve/revise status changes. Status changes go through the existing PATCH endpoint.
- **Storing diff in the DB:** Compute diffs client-side from stored `DeliverableVersion.content` — no need to store computed diffs.
- **Fetching all versions on initial page load:** Lazy-load versions only when the diff view is opened — avoid adding N+1 queries to the main deliverable display.
- **Using `router.refresh()` after inline save:** For the inline edit, update local state immediately (optimistic) and only call `router.refresh()` if the parent needs to re-render for something else.
- **`"use client"` on the project detail page:** Keep `app/projects/[id]/page.tsx` as a server component. The Tabs wrapper can be client-side (`ProjectDetailTabs.tsx`) while data is passed as props.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text diff computation | Custom string comparison | `diff` npm package | Line/word/char diff with proper LCS algorithm; edge cases around whitespace, unicode |
| Diff rendering | Custom HTML diff view | `react-diff-viewer-continued` | Syntax highlighting in diffs, side-by-side layout, dark mode, copy buttons — 100+ edge cases |
| Review Kanban drag-drop | Custom drag events | @dnd-kit (already installed) | Already proven in Phase 8; accessibility, touch, keyboard support |

**Key insight:** Diff computation looks simple but has many edge cases around line endings, trailing whitespace, and unicode. The `diff` package uses Myers' O(ND) algorithm and has been battle-tested. Custom diff renders will break on markdown tables, code blocks, and mixed-content deliverables.

## Common Pitfalls

### Pitfall 1: DeliverableVersion.content vs Deliverable.content Out of Sync
**What goes wrong:** After inline editing, `Deliverable.content` is updated but no `DeliverableVersion` record is created. The diff view has nothing to compare.
**Why it happens:** Two separate writes (update content + create version) may be done in separate fetch calls; if one fails the other may not.
**How to avoid:** Wrap both operations in a single API call (a new `POST /api/deliverables/[id]/edit` endpoint that does both atomically). Or accept eventual consistency since this is a single-user local app — the simpler two-call approach is acceptable here.

### Pitfall 2: PROJ-06 No Direct Project→Deliverable Path
**What goes wrong:** There is no FK chain from Project to Deliverable in the schema. `Project → Task` exists, but tasks don't link to sessions. Deliverables live under `Message → ChatSession`.
**Why it happens:** The schema was designed with chat-first architecture; project management was added in Phase 8 without linking existing chat artifacts to projects.
**How to avoid:** Two options — (a) add an optional `projectId` to `Deliverable` (schema migration needed), or (b) query all missions and their associated deliverables as a proxy for "project deliverables." Option (b) avoids schema migration but requires project→mission linking. See Open Questions.

### Pitfall 3: react-diff-viewer-continued Dark Mode
**What goes wrong:** The diff viewer renders with a light background regardless of app theme.
**Why it happens:** `react-diff-viewer-continued` requires the `useDarkTheme` prop to be explicitly set; it doesn't read CSS variables.
**How to avoid:** Pass `useDarkTheme={resolvedTheme === "dark"}` using `next-themes`' `useTheme()` hook (already installed as `next-themes`).

### Pitfall 4: Textarea Losing Content on Mode Toggle
**What goes wrong:** User clicks Edit, makes changes, clicks Cancel, then Edit again — the textarea shows original content, not the abandoned edit.
**Why it happens:** `useState(content)` initializes from prop only once. After cancel, `draft` is reset to the original prop.
**How to avoid:** Reset `draft` to `content` explicitly on Cancel: `setDraft(content); setEditing(false)`. This is the correct behavior (cancel = discard changes).

### Pitfall 5: Version Numbers Colliding Under Concurrent Saves
**What goes wrong:** If a user rapidly saves twice, both reads `findFirst` for max version, get version N, and both try to insert version N+1 — one will fail with a unique constraint violation.
**Why it happens:** Non-atomic read-then-write for auto-incrementing version.
**How to avoid:** This is a single-user local app — rapid double-saves are extremely unlikely. Accept the constraint error and handle it at the API layer with a 409 response (or just ignore and re-query). Alternatively, use a DB-level autoincrement but the schema uses an Int field manually. The simplest fix: catch the unique constraint error and retry with version N+2.

## Code Examples

Verified patterns from official sources:

### DeliverableVersion creation (auto-increment version)
```typescript
// src/lib/services/deliverable.ts
async createVersion(deliverableId: string, content: string) {
  const latest = await prisma.deliverableVersion.findFirst({
    where: { deliverableId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return prisma.deliverableVersion.create({
    data: {
      deliverableId,
      version: (latest?.version ?? 0) + 1,
      content,
    },
  });
},
```

### react-diff-viewer-continued with dark mode
```typescript
// Source: github.com/andrewwippler/react-diff-viewer-continued
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useTheme } from "next-themes";

export function DiffViewer({ oldContent, newContent, oldLabel, newLabel }: Props) {
  const { resolvedTheme } = useTheme();
  return (
    <ReactDiffViewer
      oldValue={oldContent}
      newValue={newContent}
      splitView={true}
      compareMethod={DiffMethod.WORDS}
      useDarkTheme={resolvedTheme === "dark"}
      leftTitle={oldLabel}
      rightTitle={newLabel}
      styles={{
        variables: {
          dark: { diffViewerBackground: "hsl(var(--card))" },
          light: { diffViewerBackground: "hsl(var(--card))" },
        },
      }}
    />
  );
}
```

### Tabs pattern for project detail page
```typescript
// app/projects/[id]/page.tsx (server component)
// Pass data to client component for tab switching
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// This should be a "use client" wrapper component since Tabs needs interactivity:
export function ProjectDetailTabs({ tasks, deliverables, projectId, agents }: Props) {
  return (
    <Tabs defaultValue="board">
      <TabsList>
        <TabsTrigger value="board">Board</TabsTrigger>
        <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
      </TabsList>
      <TabsContent value="board">
        <KanbanBoard initialTasks={tasks} projectId={projectId} agents={agents} />
      </TabsContent>
      <TabsContent value="deliverables">
        <DeliverablesList deliverables={deliverables} />
      </TabsContent>
    </Tabs>
  );
}
```

### Mission deliverables query for review board (PROJ-07)
```typescript
// src/lib/services/orchestration.ts — add method
async getMissionDeliverables(missionId: string) {
  return prisma.deliverable.findMany({
    where: {
      message: {
        session: {
          missionLane: { missionId },
        },
      },
    },
    include: {
      versions: { orderBy: { version: "asc" } },
      message: {
        include: {
          session: {
            include: {
              missionLane: {
                include: { agent: { select: { name: true, color: true, division: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-diff-viewer (original) | react-diff-viewer-continued | 2022 (original abandoned) | Use the -continued fork; API is identical, drop-in replacement |
| contentEditable for inline editing | textarea with toggle | Established 2020+ | contentEditable is brittle with markdown; textarea is reliable and sufficient |

**Deprecated/outdated:**
- `react-diff-viewer` (original, not -continued): Last published 2021, no dark mode, use `react-diff-viewer-continued` instead.

## Open Questions

1. **PROJ-06: How to link deliverables to a project**
   - What we know: There is no FK from Project → Deliverable in the schema. The chain would need to be Project → (something) → ChatSession → Message → Deliverable.
   - What's unclear: Should we (a) add an optional `projectId` to `Deliverable` (schema migration), (b) add an optional `projectId` to `ChatSession` (schema migration), or (c) define "project deliverables" as deliverables from missions that are associated with the project (but Mission has no `projectId` either)?
   - Recommendation: Add an optional `projectId` to `Deliverable` (nullable FK, safe migration). This is the cleanest model. When a user initiates a chat/mission from a project context, the deliverables get tagged with that `projectId`. For existing deliverables, the field is null. The deliverables tab filters by `projectId`. This requires one Prisma schema migration and one `db push`.

2. **PROJ-07: Where does the review board live — tab or separate route?**
   - What we know: The orchestration mission page (`/orchestration/[missionId]`) already shows lanes with streaming content and inline review panels.
   - What's unclear: Should the review board be a tab on the existing mission page, or a separate `/orchestration/[missionId]/review` route?
   - Recommendation: Add a "Review Board" tab to the existing mission page. The board is only useful after the mission completes; showing it as a tab alongside the live stream view keeps navigation simple.

3. **Version creation trigger for initial content**
   - What we know: `Deliverable.content` is populated when a deliverable is extracted from a message. `DeliverableVersion` has no records currently (service never creates them).
   - What's unclear: Should the first version (v1 = original agent output) be created retroactively for existing deliverables, or only from this phase forward?
   - Recommendation: Create v1 when the inline edit is first saved (current content becomes v1, edited content becomes v2). No migration needed for historical data. The diff view shows "No previous versions" when only v1 or no versions exist.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + Testing Library |
| Config file | `/Users/luke/onewave-agency/vitest.config.ts` |
| Quick run command | `npm test -- src/lib/services/__tests__/deliverable.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REVW-02 | `deliverableService.getVersions()` returns ordered versions | unit | `npm test -- src/lib/services/__tests__/deliverable.test.ts -t "getVersions"` | ❌ Wave 0 |
| REVW-02 | `deliverableService.createVersion()` auto-increments version number | unit | `npm test -- src/lib/services/__tests__/deliverable.test.ts -t "createVersion"` | ❌ Wave 0 |
| REVW-03 | `deliverableService.updateContent()` updates Deliverable.content | unit | `npm test -- src/lib/services/__tests__/deliverable.test.ts -t "updateContent"` | ❌ Wave 0 |
| PROJ-06 | Deliverables with matching projectId are returned | unit | `npm test -- src/lib/services/__tests__/deliverable.test.ts -t "getByProjectId"` | ❌ Wave 0 |
| PROJ-07 | `getMissionDeliverables()` traverses Mission→Lane→Session→Deliverable | unit | `npm test -- src/lib/services/__tests__/orchestration.test.ts -t "getMissionDeliverables"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- src/lib/services/__tests__/deliverable.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/services/__tests__/deliverable.test.ts` — extend existing or create new file for `getVersions`, `createVersion`, `updateContent`, `getByProjectId` (mock `prisma.deliverableVersion`, `prisma.deliverable`)
- [ ] `src/lib/services/__tests__/orchestration.test.ts` — add test for `getMissionDeliverables` (mock prisma chain)

*(No framework install needed — Vitest already configured)*

## Sources

### Primary (HIGH confidence)
- `/Users/luke/onewave-agency/prisma/schema.prisma` — Deliverable, DeliverableVersion, Mission, MissionLane, Project, Task models confirmed; DeliverableVersion has `version: Int`, `content: String`, `@@unique([deliverableId, version])`
- `/Users/luke/onewave-agency/src/lib/services/deliverable.ts` — Confirmed existing service methods; no version methods present
- `/Users/luke/onewave-agency/src/lib/services/orchestration.ts` — Confirmed getMission() traversal path
- `/Users/luke/onewave-agency/.planning/REQUIREMENTS.md` — "Rich text editor (Tiptap/Slate)" explicitly out of scope; "textarea edit is sufficient"
- `/Users/luke/onewave-agency/package.json` — @dnd-kit installed, next-themes installed, sonner installed; diff and react-diff-viewer-continued NOT yet installed

### Secondary (MEDIUM confidence)
- [github.com/andrewwippler/react-diff-viewer-continued](https://github.com/andrewwippler/react-diff-viewer-continued) — Active fork of original; dark mode via `useDarkTheme` prop; `DiffMethod.WORDS` for word-level diff
- npm `diff` package — Myers' diff algorithm, well-maintained, used by react-diff-viewer-continued internally

### Tertiary (LOW confidence)
- npm version estimates for `diff` (^7.0.0) and `react-diff-viewer-continued` (^4.0.0) — confirm exact current versions via `npm info diff version` and `npm info react-diff-viewer-continued version` before installation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — schema confirmed from codebase; diff library ecosystem is stable; @dnd-kit reuse from Phase 8 is certain
- Architecture: HIGH — follows established patterns from Phases 7 and 8; service/API/component structure matches existing codebase conventions
- Pitfalls: HIGH — schema gap (PROJ-06 no FK) confirmed by direct schema read; other pitfalls verified against codebase patterns
- Open Questions: MEDIUM — PROJ-06 FK design is a new schema decision; version trigger is a new design decision not previously locked

**Research date:** 2026-03-11
**Valid until:** 2026-06-11 (stable stack; diff libraries are mature)
