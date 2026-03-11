# Deferred Items

## Pre-existing build issue: `src/types/project.ts` import path

**Discovered during:** 09-02 Task 2 verification
**Issue:** `src/types/project.ts` imports from `"../../generated/prisma/client"` which TypeScript cannot resolve, causing `next build` to fail.
**Origin:** Last changed in commit for Phase 08 (test task 08-01)
**Scope:** Pre-existing issue, out of scope for plan 09-02
**Fix:** Update import path or regenerate Prisma client to expose types at the expected path. Path `../../generated/prisma/client` from `src/types/` resolves to `generated/prisma/client` which should exist but TS cannot find it — may need `npx prisma generate` to regenerate types index.
