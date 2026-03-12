# Phase 11: Production Polish - Research

**Researched:** 2026-03-12
**Domain:** UI animations, page transitions, CSS/React animation patterns in Next.js 16 App Router
**Confidence:** HIGH

## Summary

Phase 11 adds the final layer of production polish to the OneWave app: smooth page transitions when navigating between routes, visible hover/press feedback on interactive elements, and entrance animations for lists and cards. The project already has the required animation infrastructure in place — `tw-animate-css` is imported in `globals.css`, and several components already use `animate-in`, `fade-in`, and `slide-in-from-*` classes from that library. The codebase uses Tailwind CSS v4, Next.js 16.1.6, and React 19.2.3.

The key architectural decision is how to handle page transitions. Next.js 16 ships with experimental support for React 19.2's `<ViewTransition>` component via `experimental.viewTransition: true` in `next.config.ts`. This is the native, dependency-free approach. However, it is explicitly marked "not recommended for production" in the official docs as of this writing. The alternative — and the recommended pattern for this app — is CSS-only transitions using a layout-level wrapper that applies `animate-in fade-in slide-in-from-bottom-4` classes from `tw-animate-css` on every page render. This is zero-dependency, zero-bundle-cost, and perfectly aligned with the existing stack.

For hover/press feedback, Tailwind's built-in `hover:`, `active:`, and `transition-*` utilities are the standard. The app already uses `transition-all hover:shadow-md hover:-translate-y-0.5` on AgentCard — the task is to audit remaining interactive elements and apply consistent patterns. For list/card entrance animations, `tw-animate-css` classes applied directly to card and list item wrappers give a staggered fade-in-and-slide-up effect using `delay-[Nms]` utilities.

**Primary recommendation:** Use `tw-animate-css` classes (`animate-in fade-in slide-in-from-bottom-4 duration-300`) applied at the page layout level for transitions, and direct Tailwind `hover:`/`active:`/`transition` classes for interactive element feedback. Do NOT add framer-motion or any external animation library.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-05 | App has smooth page transitions and UI animations | CSS-only via tw-animate-css on layout wrapper + Tailwind hover/active utilities + animate-in on list items |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tw-animate-css | ^1.4.0 | Enter/exit CSS animation utilities for Tailwind v4 | Already installed, already imported in globals.css, already used in dropdowns/sheets |
| Tailwind CSS v4 | ^4 | hover/active/focus/transition utilities | Already in use across all components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React 19.2 `<ViewTransition>` | (built into react 19.2.3) | Native shared-element transitions | Only if enabling experimental.viewTransition; NOT recommended for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tw-animate-css (no extra deps) | framer-motion | Framer adds ~60KB bundle, complex AnimatePresence wiring in App Router, overkill for simple fade/slide |
| tw-animate-css | React ViewTransition API | ViewTransition is marked experimental/not-for-production in Next.js 16 docs |
| Tailwind hover utilities | CSS :hover custom styles | Tailwind utilities are already consistent with project style; no reason to leave the system |

**Installation:** Nothing to install — all required packages are already in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── layout.tsx          # Add page-transition wrapper here (layout-level animate-in)
├── components/
│   └── layout/
│       └── PageTransition.tsx   # Optional: small wrapper component for the animate-in div
├── app/*/page.tsx           # Each page wraps its top-level content in animate-in classes
```

The simplest approach: a thin `<PageTransition>` client component that wraps children in a div with `animate-in fade-in slide-in-from-bottom-4 duration-300`. Place this in `AppShell`'s `<main>` or directly in each `page.tsx`. Because App Router unmounts/remounts `page.tsx` on navigation, the class fires on every route change naturally.

### Pattern 1: Layout-Level Page Transition Wrapper

**What:** A `<PageTransition>` wrapper component applied around `{children}` in AppShell's `<main>`.
**When to use:** For consistent fade-in on every page navigation without modifying each page.
**Example:**
```tsx
// src/components/layout/PageTransition.tsx
"use client";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      {children}
    </div>
  );
}
```

```tsx
// In AppShell.tsx — wrap children:
<main className="flex-1 overflow-y-auto">
  <div className="mx-auto max-w-7xl p-6">
    <PageTransition>{children}</PageTransition>
  </div>
</main>
```

**Why this works:** Next.js App Router remounts the `children` prop on each navigation. The `animate-in` class from `tw-animate-css` triggers the CSS animation on mount. No JS timers, no AnimatePresence, no external deps.

### Pattern 2: Staggered List Entrance Animation

**What:** Apply `animate-in fade-in slide-in-from-bottom-2 duration-300` to each card in a grid, with incremental `delay-[Nms]` on each item.
**When to use:** Agent grid (`AgentGrid.tsx`), project list (`projects/page.tsx`), session list.
**Example:**
```tsx
// In AgentGrid.tsx — add animation classes with stagger
{agents.map((agent, i) => (
  <div
    key={agent.id}
    className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
    style={{ animationDelay: `${i * 40}ms` }}
  >
    <AgentCard agent={agent} />
  </div>
))}
```

Note: `fill-mode-both` (from `tw-animate-css` parameter class) prevents items from flashing before the delay fires.

### Pattern 3: Interactive Element Hover/Press Feedback

**What:** Consistent Tailwind transition utilities on all clickable cards and buttons.
**When to use:** Every card that is a link, every button that performs an action.
**Existing baseline (AgentCard):**
```tsx
// Already uses:
className="transition-all hover:shadow-md hover:-translate-y-0.5"
```
**Standardize across:**
- `ProjectCard.tsx` — currently uses `transition-shadow hover:shadow-md` only; add `hover:-translate-y-0.5 transition-all`
- `TaskCard.tsx` — audit for hover state
- Sidebar nav items — add `transition-colors` if not present
- Buttons — already have `transition-all` in base button variant

**Active/press feedback pattern:**
```tsx
className="transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm"
```

### Anti-Patterns to Avoid

- **Animating layout properties (width/height):** Use `transform: scale()` and `opacity` instead — these are GPU-composited and don't cause reflow.
- **Wrapping Server Components in "use client" for animation:** Use a thin client wrapper around the server component output instead.
- **Using `transition-all` without `duration-*`:** Default duration is 150ms which may feel abrupt. Set `duration-200` or `duration-300` explicitly.
- **Infinite stagger arrays:** Cap stagger delay at ~300ms total (e.g., `min(i * 40, 300)ms`) so items don't take forever to appear on large lists.
- **Forgetting `prefers-reduced-motion`:** Add `motion-safe:` prefix to animation classes so users who opt out of motion don't see jarring effects. Tailwind v4 supports `motion-safe:` and `motion-reduce:` variants natively.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS enter animations | Custom `@keyframes` in globals.css | `tw-animate-css` classes | Already imported, tree-shaken, consistent naming |
| Page transition hook | `useRouter` listener + state machine | `tw-animate-css` on layout wrapper | App Router unmount/remount is the "hook" |
| Stagger timing | JS animation library | `style={{ animationDelay }}` inline style | CSS handles it, zero JS overhead |
| Shared element transitions | Custom clone-and-animate | React `<ViewTransition>` (future) | Wait for stable API; not needed for this phase's requirements |

**Key insight:** The three success criteria (page transitions, hover feedback, list entrance) are all achievable with pure CSS utility classes. No new JavaScript dependencies are needed.

## Common Pitfalls

### Pitfall 1: animate-in Fires Only Once Per Mount
**What goes wrong:** If `PageTransition` component is not remounted on navigation (e.g., it lives too high in the tree and is preserved across route changes), the animation fires once and never again.
**Why it happens:** App Router preserves layouts across navigations. The `children` prop changes but the layout wrapper does not remount.
**How to avoid:** Either (a) apply the `animate-in` class to the `children` wrapper div inside the changing segment, not the persistent layout, or (b) use `key={pathname}` on the `PageTransition` wrapper using `usePathname()` to force remount.
**Example fix:**
```tsx
"use client";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      {children}
    </div>
  );
}
```
**Warning signs:** Animation works on hard refresh but not when clicking nav links.

### Pitfall 2: Stagger Delay Causes Flash Without fill-mode-both
**What goes wrong:** List items with `delay-[80ms]` briefly appear at full opacity before the delay fires because `animation-fill-mode` defaults to `none`.
**Why it happens:** `tw-animate-css` sets `animation-fill-mode: both` via the `fill-mode-both` class; it is not applied automatically.
**How to avoid:** Always include `fill-mode-both` when using `delay-*` with `animate-in`.

### Pitfall 3: transition-all vs transition-[property]
**What goes wrong:** `transition-all` on cards triggers transitions for ALL CSS properties including color and background, which can cause unintended flashes on theme change.
**Why it happens:** `transition-all` is broad.
**How to avoid:** Prefer `transition-[shadow,transform]` for cards, or `transition-colors` for nav items. The existing AgentCard pattern (`transition-all`) is acceptable but should not be mindlessly copied to text-heavy elements.

### Pitfall 4: Server Component Boundary Errors
**What goes wrong:** Adding `"use client"` to a page just to apply an animation class breaks server-side data fetching patterns.
**Why it happens:** Misunderstanding that CSS class application requires client JS.
**How to avoid:** `tw-animate-css` classes are pure CSS — they work on server-rendered HTML. No `"use client"` directive needed. Only `PageTransition.tsx` with `usePathname()` needs to be a client component.

### Pitfall 5: Conflicting animate-in on Nested Components
**What goes wrong:** If both a parent and a child have `animate-in`, the child's animation may be invisible because it starts before the parent is visible.
**Why it happens:** CSS animations run independently.
**How to avoid:** Apply `animate-in` at only one level — either the page wrapper OR the individual list items, not both.

## Code Examples

Verified patterns from tw-animate-css and project stack:

### Page Transition Wrapper (with pathname key)
```tsx
// Source: tw-animate-css README + Next.js usePathname
"use client";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out"
    >
      {children}
    </div>
  );
}
```

### Staggered Grid Cards
```tsx
// Source: tw-animate-css docs + Tailwind inline style pattern
{items.map((item, i) => (
  <div
    key={item.id}
    className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
    style={{ animationDelay: `${Math.min(i * 40, 280)}ms` }}
  >
    <ItemCard item={item} />
  </div>
))}
```

### Card Hover + Press Feedback
```tsx
// Source: existing AgentCard pattern + active scale extension
className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm"
```

### Motion-Safe Wrapper (accessibility)
```tsx
// Source: Tailwind v4 motion-safe variant
className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-300"
```

### tw-animate-css Available Classes (confirmed from package README)
```
animate-in          — triggers enter animation
animate-out         — triggers exit animation
fade-in             — from opacity 0
fade-in-{0-100}     — from specific opacity
slide-in-from-top-{N}
slide-in-from-bottom-{N}
slide-in-from-left-{N}
slide-in-from-right-{N}
zoom-in-{0-100}
duration-{150,200,300,500,...}
delay-{75,100,150,200,...}
fill-mode-both      — prevents flash before delay
ease-{in,out,in-out}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion AnimatePresence for page transitions | CSS `animate-in` class on layout wrapper + `usePathname` key | 2024 (tw-animate-css stable for Tailwind v4) | No bundle cost, simpler mental model |
| tailwindcss-animate (JS plugin) | tw-animate-css (CSS-first) | Tailwind v4 release | Already what this project uses |
| React ViewTransition (experimental) | tw-animate-css CSS approach | React 19.2 — but marked experimental | Use CSS approach until ViewTransition is stable |

**Deprecated/outdated:**
- `tailwindcss-animate`: The JS plugin version for Tailwind v3; this project uses `tw-animate-css` (the v4 CSS-first replacement) — do not reference old plugin docs.

## Open Questions

1. **Stagger on large lists (61 agents)**
   - What we know: 61 agents rendered in AgentGrid with 40ms stagger = 2.4s before last card appears
   - What's unclear: Whether to cap stagger delay or use a smaller interval
   - Recommendation: Cap at `Math.min(i * 30, 240)ms` so the last item appears within ~240ms of the first

2. **Exit animations on page navigation**
   - What we know: App Router navigations unmount instantly; there's no "leaving" phase for CSS exit animations without library help
   - What's unclear: Whether exit animations are desired (not in success criteria)
   - Recommendation: Skip exit animations — the three success criteria only require entrance animations and hover feedback; exit is out of scope for UX-05

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + jsdom |
| Config file | `/Users/luke/onewave-agency/vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-05 | Page transition wrapper renders children | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| UX-05 | PageTransition component applies animate-in class | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |

**Note:** Animation behavior (CSS classes actually animating) is a visual concern not suited to unit tests. The test coverage for UX-05 is intentionally shallow — verify the structural rendering (component renders, class is present) rather than animation timing. Manual verification of the three success criteria is the primary acceptance gate.

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/layout/__tests__/PageTransition.test.tsx` — covers UX-05 rendering

## Sources

### Primary (HIGH confidence)
- tw-animate-css README (`/Users/luke/onewave-agency/node_modules/tw-animate-css/README.md`) — full class reference, confirmed installed and imported
- `globals.css` — confirmed `@import "tw-animate-css"` is present
- `package.json` — confirmed stack versions (Next.js 16.1.6, React 19.2.3, tw-animate-css ^1.4.0)
- [Next.js viewTransition config docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) — confirmed experimental status, not recommended for production

### Secondary (MEDIUM confidence)
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) — confirmed React 19.2 ViewTransition availability, enhanced routing details
- [React ViewTransition reference](https://react.dev/reference/react/ViewTransition) — API details, props, CSS class names

### Tertiary (LOW confidence)
- WebSearch: CSS/Tailwind-only transition patterns for Next.js App Router — corroborates the layout wrapper + pathname key approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tw-animate-css is confirmed installed, imported, and already in use in the project
- Architecture: HIGH — AppShell structure confirmed, `usePathname()` is a stable Next.js hook, pattern is well-established
- Pitfalls: HIGH — animate-in-only-on-mount pitfall is a known App Router gotcha; stagger fill-mode is documented in tw-animate-css

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (stable stack; tw-animate-css and Tailwind v4 not in active churn)
