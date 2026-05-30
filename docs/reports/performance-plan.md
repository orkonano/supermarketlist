# Performance Review & Plan

Generated: 2026-05-13
Agent: vercel:performance-optimizer

---

## Prioritised Fix List

| # | Fix | File(s) | Effort | Impact |
|---|---|---|---|---|
| 1 | `AbortSignal.timeout(3000)` on price adapters | `lib/price-adapters.ts` | 15 min | Prevents hung price table |
| 2 | `useOptimistic` for checkbox toggle | `app/components/ItemRow.tsx` | 30 min | INP: 300-500ms → <50ms |
| 3 | Collapse `getListItems` to 1 DB query | `lib/list-actions.ts` | 30 min | TTFB -80-160ms per list page load |
| 4 | Lazy-load `PriceComparison` with `next/dynamic` | `app/components/ShoppingList.tsx` | 15 min | Smaller initial bundle, faster hydration |
| 5 | Merge double list fetch in `inviteToList` | `lib/invite-actions.ts` | 10 min | -1 Turso RTT per invite action |
| 6 | Batch price cache upserts into single `$transaction` | `lib/price-actions.ts` | 30 min | Turso write throughput |
| 7 | Stale-while-revalidate for price cache | `lib/price-actions.ts` | 2-4h | Repeat users see prices instantly |
| 8 | Push `'use client'` boundary down in `ShoppingList` | `app/components/ShoppingList.tsx` | 1-2h | Smaller bundle, faster hydration |
| 9 | `lang="es-AR"` on `<html>` | `app/layout.tsx:26` | 1 min | Accessibility / SEO |
| 10 | Enable PPR on list detail route | `next.config.ts`, `app/lists/[listId]/page.tsx` | 2-4h | LCP -200-400ms on cold start |

---

## Detailed Findings

### 1. `AbortSignal.timeout(3000)` on price adapters
**File:** `lib/price-adapters.ts`

A slow or hanging Coto/Disco/Carrefour response blocks the entire Server Action. No single external call can delay the response more than 3s.

```ts
const res = await fetch(url, {
  cache: 'no-store',
  signal: AbortSignal.timeout(3000),
})
```

Apply to both `vtexAdapter` and `cotoAdapter`.

---

### 2. `useOptimistic` for checkbox toggle
**File:** `app/components/ItemRow.tsx`, lines 22-28

`toggleListItem` calls a Server Action inside `startTransition`, then waits for `revalidatePath` to trigger a full RSC refetch. On a slow Turso connection (300-500ms RTT), the user sees a delay before the strikethrough appears.

```tsx
import { useOptimistic, useTransition } from 'react'

export default function ItemRow({ item, listId }) {
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(item.checked)
  const [, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      setOptimisticChecked(!item.checked)
      await toggleListItem(listId, item.id, !item.checked)
    })
  }
  // render uses optimisticChecked instead of item.checked
}
```

---

### 3. Collapse `getListItems` to 1 DB query
**File:** `lib/list-actions.ts`, lines 78-86

Currently 3 sequential Turso round-trips: `verifySession` → `assertMember` → `findMany`. Move the membership check into a compound Prisma `where` clause:

```ts
export async function getListItems(listId: string, month: number, year: number) {
  const session = await verifySession()
  const items = await prisma.item.findMany({
    where: {
      listId,
      month,
      year,
      list: { members: { some: { userId: session.userId } } },
    },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  })
  return items
}
```

---

### 4. Lazy-load `PriceComparison`
**File:** `app/components/ShoppingList.tsx`

`PriceComparison` is imported synchronously and ends up in the initial JS chunk. Since it immediately fires a `useEffect` fetch, there is no meaningful SSR value.

```tsx
import dynamic from 'next/dynamic'

const PriceComparison = dynamic(() => import('./PriceComparison'), {
  loading: () => (
    <div className="bg-white rounded-2xl shadow-sm p-4 text-sm text-gray-400">
      Cargando comparación de precios…
    </div>
  ),
  ssr: false,
})
```

---

### 5. Merge double list fetch in `inviteToList`
**File:** `lib/invite-actions.ts`, lines 24 and 48-51

List is fetched once for `ownerId` check, then again for `name`. Merge into one query:

```ts
const list = await prisma.list.findUnique({
  where: { id: listId },
  select: { ownerId: true, name: true },
})
```

Remove the second `prisma.list.findUnique` call and use `list.name` directly.

---

### 6. Batch price cache upserts into single `$transaction`
**File:** `lib/price-actions.ts`, lines 64-86

Up to 30 individual `priceCache.upsert` calls run in parallel. Turso (libSQL) uses SQLite's serialised write model — concurrent writes are queued. Collect all results first, then batch:

```ts
await Promise.all(tasks) // collect results first

await prisma.$transaction(
  freshEntries.map(e =>
    prisma.priceCache.upsert({
      where: { query_supermarket: { query: e.query, supermarket: e.supermarket } },
      create: e,
      update: e,
    })
  )
)
```

---

### 7. Stale-while-revalidate for price cache
**File:** `lib/price-actions.ts`

On a cold cache with 10 items, the Server Action waits for 30 concurrent external fetches (potentially 2-5s). Return stale cached data immediately and refresh in the background:

```ts
const staleResult = buildResult(itemNames, cachedEntries) // use all cached, even expired
if (hasStalePairs) {
  void refreshStalePairs(queries, stalePairs) // fire and forget
}
return staleResult
```

The user sees prices from the last fetch instantly. The next cache miss fetches fresh data silently.

---

### 8. Push `'use client'` boundary down in `ShoppingList`
**File:** `app/components/ShoppingList.tsx`

The entire shopping experience — month navigation, item grouping, `AddItemForm`, every `ItemRow`, and `PriceComparison` — is bundled under a single `'use client'` boundary. The grouping logic (`reduce` + `filter`) and `CATEGORIES`/`MONTHS` arrays are pure data transformation and don't need the browser.

Approach:
- Make `ShoppingList` a Server Component (remove `'use client'`)
- Extract `MonthNav` as a thin client component (`useRouter` + `useTransition` only)
- Keep `AddItemForm`, `ItemRow`, `PriceComparison` as client components
- Category grouping stays server-side — never serialised into the client bundle

---

### 9. Fix `lang="en"` → `lang="es-AR"`
**File:** `app/layout.tsx`, line 26

The app is entirely in Argentine Spanish but declares `lang="en"`. One-line fix:

```tsx
<html lang="es-AR">
```

---

### 10. Enable Partial Prerendering (PPR) on list detail route
**Files:** `next.config.ts`, `app/lists/[listId]/page.tsx`

The list detail page has a static shell (nav, month selector header, "Agregar producto" button) and dynamic slots (item list, price comparison). PPR serves the shell from the edge cache instantly while dynamic sections stream in.

```ts
// next.config.ts
experimental: {
  ppr: 'incremental',
}
```

```ts
// app/lists/[listId]/page.tsx
export const experimental_ppr = true
```

Wrap item list and price comparison in `<Suspense>` boundaries with skeleton fallbacks.

---

## Notes

- Items 1-6 are independent and can be done in any order
- Item 7 (stale-while-revalidate) depends on understanding Item 6's batching approach first
- Item 8 (RSC boundary refactor) is the highest-effort structural change and should be done after Items 1-6 are merged to avoid conflicts
- Item 10 (PPR) depends on Item 8 being done first (Suspense boundaries required)
