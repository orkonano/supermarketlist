# Plan: prevent excess / duplicate backend calls

**Status:** All layers implemented (PR #42 — Layers 1 & 2; PR #48 — Layers 3a & 3b).

## Background

`PriceComparison.tsx` fired an unbounded stream of `GET/POST /lists/<id>` requests when the
user clicked **Actualizar**. Root cause: `getItemPrices` is a Server Action (every call
auto-revalidates the route), and the effect depended on `itemNames`, whose array identity was
rebuilt on every render. Revalidation → new `items` ref → new `itemNames` → new `fetchPrices`
→ `useEffect` re-fires → another action call → another revalidation → loop.

Fixed in `fix/price-comparison-refetch-loop` by keying `itemNames` on the serialized names
(`JSON.stringify`) so the effect only re-fires when names actually change.

## Defense layers

| Layer | What | Status |
|---|---|---|
| 1 | Component unit test asserting exact call count (Vitest + RTL + happy-dom) | ✅ Done — `app/components/__tests__/PriceComparison.test.tsx` |
| 2 | E2E request-count guard (Playwright) | ✅ Done — `e2e/price-comparison.spec.ts` |
| 3a | Enable the React Compiler (eliminate the unstable-identity class) | ✅ Done — `next.config.ts` + `eslint.config.mjs` (PR #48) |
| 3b | Model price reads as a route handler + SWR (remove revalidation, dedupe) | ✅ Done — `app/api/lists/[listId]/prices/route.ts` + `PriceComparison.tsx` (PR #48) |

Layers 1 and 2 *detect* the bug from both ends (mechanism + network symptom). Layers 3a and 3b
*eliminate* the underlying class so the bug largely cannot recur.

---

## 3a — Enable the React Compiler

### Why

The React Compiler (stable for React 19, supported by Next 16) auto-memoizes components and
their hook dependencies. It keeps derived values' identities stable without manual `useMemo` /
`useCallback`, so an "unstable dependency re-fires the effect" bug like this one largely cannot
occur. It's the single highest-leverage prevention — repo-wide, not per-component.

### Prerequisites / facts

- React `19.2.4`, Next `16.2.4`, `react-dom 19.2.4` — all compatible.
- `next.config.ts` currently wraps config with `withWorkflow(nextConfig)` and sets
  `serverExternalPackages`. The compiler flag must be added to the object *before* `withWorkflow`.
- ESLint already pulls in `eslint-config-next` (which includes the React hooks plugin). Add the
  React Compiler ESLint rule so violations surface in CI.

### Steps

1. **Install the compiler (and ESLint plugin if not transitively present):**
   ```bash
   npm i -D babel-plugin-react-compiler eslint-plugin-react-compiler
   npm install            # refresh lock
   git add package-lock.json
   ```
   > Verify the exact package names/versions against the Next 16 docs at implementation time —
   > the compiler graduated from `experimental` and the package name/flag may have settled.

2. **Turn it on in `next.config.ts`:**
   ```ts
   const nextConfig: NextConfig = {
     reactCompiler: true, // confirm: top-level vs experimental.reactCompiler for Next 16.2
     serverExternalPackages: [ /* unchanged */ ],
   };
   export default withWorkflow(nextConfig);
   ```

3. **Add the lint rule** in `eslint.config.mjs` (a new flat-config block):
   ```js
   import reactCompiler from "eslint-plugin-react-compiler";
   // ...
   { plugins: { "react-compiler": reactCompiler },
     rules: { "react-compiler/react-compiler": "error" } },
   ```

4. **Roll out gradually if the full-repo compile surfaces violations.** The compiler bails out
   of components that break the Rules of React; the ESLint rule flags them. Options:
   - Fix flagged components (preferred), or
   - Scope the compiler to a directory allowlist first, then widen.

### Validation

- `npm run build` succeeds (compiler runs at build).
- `npm test` (234+) and `npx tsc --noEmit` stay green.
- `npm run test:e2e` passes, including `e2e/price-comparison.spec.ts`.
- **Regression proof:** with the compiler on, revert the `itemNames` fix to the naive
  `useMemo(() => items.map(i => i.name), [items])` and confirm the Layer-1 test *still* passes
  (the compiler stabilizes identity). If it does, the class is genuinely eliminated. Re-apply
  the explicit fix afterward — defense in depth, and it documents intent.

### Risks

- The compiler can change render-timing assumptions; watch for components relying on referential
  instability (rare, usually a smell).
- `withWorkflow` wrapping + native `serverExternalPackages` already make the build non-trivial —
  validate the production build on Vercel preview before merging.

### Effort

Medium. ~½–1 day including fixing any Rules-of-React violations the compiler flags.

---

## 3b — Model price reads as a route handler + SWR

### Why

`getItemPrices` is a **pure read** yet is implemented as a Server Action, so every call forces a
route revalidation (that auto-revalidation was step 1 of the loop, and is inherent to Server
Actions — you cannot opt out per-call). Reads should not be Server Actions. Moving price reads to
a **GET route handler** consumed via **SWR** (or React Query):

- removes the revalidation entirely (a read no longer refreshes the page), and
- **dedupes in-flight + recently-resolved requests automatically**, which neutralizes this whole
  class of "accidentally called N times" at the data layer.

### Design

1. **Route handler** — `app/api/lists/[listId]/prices/route.ts`:
   ```ts
   export async function GET(req: Request, { params }: { params: Promise<{ listId: string }> }) {
     const { listId } = await params;            // Next 16: params is async
     const session = await verifySession();      // same guard as the Server Action
     const names = new URL(req.url).searchParams.getAll("name");
     const prices = await serviceGetItemPrices(listId, session.userId, names);
     return Response.json(prices);
   }
   ```
   - Reuses `serviceGetItemPrices` unchanged — the auth + caching logic stays in `lib/price-service.ts`.
   - Keep the existing `getItemPrices` Server Action temporarily for a safe migration, or delete
     once the client is switched.
   - Read `AGENTS.md`: this is Next 16 — confirm route-handler signature & async `params` in
     `node_modules/next/dist/docs/` before writing.

2. **Client hook with SWR:**
   ```bash
   npm i swr && npm install && git add package-lock.json
   ```
   ```tsx
   const key = useMemo(
     () => `/api/lists/${listId}/prices?` + itemNames.map(n => `name=${encodeURIComponent(n)}`).join("&"),
     [listId, itemNamesKey],            // value-stable key — same discipline as the current fix
   );
   const { data: prices, isLoading, mutate } = useSWR<ItemPrices>(key, fetcher);
   // "Actualizar" button → onClick={() => mutate()}   (revalidate just this key)
   ```
   - SWR dedupes concurrent requests to the same key and caches by key, so even a render storm
     collapses to one network call.
   - `mutate()` replaces the manual `fetchPrices()` refresh; no `useEffect` fetch loop to get wrong.

3. **Delete** the now-unused `useEffect` / `fetchPrices` / `getItemPrices` Server Action path.

### Validation

- `app/components/__tests__/PriceComparison.test.tsx` updated: mock `fetch` (or the SWR fetcher)
  instead of the Server Action, and keep the same `toHaveBeenCalledTimes(1)` assertions. With SWR's
  dedupe, the count guard is even stronger.
- `e2e/price-comparison.spec.ts`: assert the count of `GET /api/lists/*/prices` requests is ≤ 1
  per click (and that no POST to the list route happens anymore — proves revalidation is gone).
- `npm test`, `npx tsc --noEmit`, `npm run test:e2e` all green.

### Risks / notes

- Auth: the route handler must enforce the **same** `verifySession` + `ensureMember` guards the
  Server Action had (`serviceGetItemPrices` already calls `ensureMember`). Verify a non-member
  gets 401/403 — add an API auth test alongside `lib/__tests__/api-auth.test.ts`.
- SWR adds a client dependency; acceptable and small. React Query is the alternative if richer
  cache control is wanted later.
- Caching headers: consider `Cache-Control` on the route since prices already refresh every ~4h
  server-side (`PRICE_CACHE_TTL_MS`).

### Effort

Medium. ~1 day including the API auth test and client migration.

---

## Recommended order

1. **3a first** (React Compiler) — broad, cheap-per-component safety net that prevents the entire
   unstable-identity class across the app, not just prices.
2. **3b second** (reads → route handler + SWR) — targeted architectural fix that removes the
   Server-Action revalidation for reads and adds request dedupe. Do it for prices first, then use
   it as the template for any other client-driven read.
