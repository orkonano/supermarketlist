# Plan: Prisma Optimization

**9 findings across schema and query layer.** Issues range from missing indexes (immediate high-ROI) to dead code cleanup. Ordered by impact.

---

## Findings

### F1 — Missing indexes (CRITICAL)

`prisma/schema.prisma` has no indexes on the most-queried foreign keys and filter columns. Every affected query does a full table scan.

| Model | Missing index | Affected call |
|---|---|---|
| `Item` | `@@index([listId, month, year])` | `serviceGetListItems` — most frequent read path |
| `ListInvite` | `@@index([email])` | `validateInviteCanBeSent` — scans by email |
| `ApiKey` | `@@index([userId])` | `getUserApiKeys`, `createApiKey` count check |
| `List` | `@@index([ownerId])` | Cascade deletes, ownership checks |

Bonus: `PriceCache.@@index([query])` is **redundant** — `@@unique([query, supermarket])` already creates a composite index that SQLite uses for `query`-only lookups.

---

### F2 — Double-read in `acceptInvite` flow (HIGH)

**Files:** `app/api/accept-invite/route.ts:11-26`, `lib/invite-actions.ts:67-72`

The route fetches the invite and session user, then calls `acceptInvite()` which re-fetches both:

```
route.ts:      listInvite.findUnique(token)     ← invite
route.ts:      user.findUnique(session.userId)  ← session user email
acceptInvite:  listInvite.findUnique(token)     ← same invite again
acceptInvite:  user.findUnique(userId)          ← same user again
```

4 queries for 2 unique pieces of data.

---

### F3 — Double-read in `serviceGetList` and `serviceUpdateList` (HIGH)

**File:** `lib/list-service.ts:61-78`

`serviceGetList` calls `ensureMember` (which queries `List`), then calls `findUnique` on the same list again:

```ts
await ensureMember(listId, userId);                          // queries List
return prisma.list.findUnique({ where: { id: listId }, ... }); // same list again
```

`serviceUpdateList` calls `assertOwner` (which fetches the list and discards it), then `update` re-hits the DB:

```ts
await assertOwner(listId, userId); // fetches List, returns it, caller ignores it
return prisma.list.update(...);    // second round-trip to same row
```

---

### F4 — `assertOwner` over-fetches (MEDIUM)

**File:** `lib/list-service.ts:6-10`

```ts
const list = await prisma.list.findUnique({ where: { id: listId } });
```

No `select` — retrieves `name`, `createdAt`, `updatedAt` when only `ownerId` is needed.

---

### F5 — Sequential queries in `validateInviteCanBeSent` (MEDIUM)

**File:** `lib/invite-actions.ts:21-38`

Four sequential DB round-trips, two of which are independent:

```
1. list.findUnique(listId)           ← independent
2. listInvite.findFirst(listId+email) ← independent
3. user.findUnique(email)            ← depends on nothing above
4. listMember.findUnique(...)        ← conditional on 3
```

Queries 1, 2, and 3 can all be parallelized with `Promise.all`.

---

### F6 — Late inviter fetch in `inviteToList` (MEDIUM)

**File:** `lib/invite-actions.ts:57-58`

The inviter's name is fetched **after** the invite is already inserted, adding a sequential RTT at the end of the function. The DAL already exports `getCurrentUser` for this purpose. It should be fetched earlier alongside the validation queries.

---

### F7 — `loadAllFromCache` over-fetches (MEDIUM)

**File:** `lib/price-service.ts:35`

```ts
const entries = await prisma.priceCache.findMany({ where: { query: { in: queries } } });
```

No `select` — fetches `id` which is never used. Should select only the 8 fields consumed in the loop.

---

### F8 — ~~Dead code: `serviceGetListForMember`~~ (FINDING INCORRECT)

**File:** `lib/list-service.ts:33-38`

~~Exported function with zero call sites in the codebase. Safe to delete.~~

**Correction:** `serviceGetListForMember` has an active call site in `app/lists/[listId]/page.tsx`. The original analysis was wrong. This function is live and must not be deleted.

---

### F9 — Redundant `@@index([query])` on `PriceCache` (LOW)

**File:** `prisma/schema.prisma:98`

The `@@unique([query, supermarket])` constraint already creates a composite index. SQLite can use the prefix (`query`) of a composite index for single-column lookups. The standalone `@@index([query])` is a no-op and should be removed.

---

## Execution Plan

### Step 1 — Schema migration (F1 + F9)

One migration, highest ROI. Adds four missing indexes and removes the redundant one.

```prisma
model Item {
  // ...existing fields...
  @@index([listId, month, year])
}

model ListInvite {
  // ...existing fields...
  @@index([email])
}

model ApiKey {
  // ...existing fields...
  @@index([userId])
}

model List {
  // ...existing fields...
  @@index([ownerId])
}

model PriceCache {
  // remove @@index([query]) — covered by @@unique([query, supermarket])
  @@unique([query, supermarket])
}
```

```bash
npx prisma migrate dev --name add-missing-indexes
npm run migrate:turso
```

---

### Step 2 — Fix double-read in `acceptInvite` flow (F2)

**`lib/invite-actions.ts`** — extend `acceptInvite` to accept an optional pre-fetched invite and email so the route can pass what it already has:

```ts
export async function acceptInvite(
  token: string,
  userId: string,
  prefetched?: { invite: ListInvite; email: string }
): Promise<{ listId: string } | { error: string }>
```

Inside the function: use `prefetched` if provided, skip the `findUnique` calls.

**`app/api/accept-invite/route.ts`** — pass the already-fetched invite and user email into `acceptInvite` instead of re-fetching.

---

### Step 3 — Eliminate double-reads in list service (F3 + F4)

**`lib/list-service.ts`**

- Add `select: { id: true, ownerId: true }` to `assertOwner` (F4).
- Make `assertOwner` return `{ id, ownerId }` and use the returned value in `serviceUpdateList` to avoid the second DB hit (F3).
- In `serviceGetList`, merge the membership check into the `findUnique` call using a filtered `include` — one query instead of two (F3).

---

### Step 4 — Parallelize `validateInviteCanBeSent` + move inviter fetch (F5 + F6)

**`lib/invite-actions.ts`**

Parallelize the three independent queries at the top of `validateInviteCanBeSent`:

```ts
const [list, existing, invitee] = await Promise.all([
  prisma.list.findUnique({ where: { id: listId }, select: { ownerId: true, name: true } }),
  prisma.listInvite.findFirst({ where: { listId, email, accepted: false } }),
  prisma.user.findUnique({ where: { email }, select: { id: true } }),
]);
```

Move the inviter name fetch (`getCurrentUser`) into the parallel block alongside validation queries in `inviteToList` (F6), removing the post-insert sequential query.

---

### Step 5 — Add `select` to `loadAllFromCache` (F7)

**`lib/price-service.ts:35`**

```ts
const entries = await prisma.priceCache.findMany({
  where: { query: { in: queries } },
  select: {
    query: true,
    supermarket: true,
    price: true,
    priceText: true,
    productName: true,
    brand: true,
    productUrl: true,
    imageUrl: true,
    fetchedAt: true,
  },
});
```

---

### Step 6 — ~~Delete dead code (F8)~~ (CANCELLED)

`serviceGetListForMember` is imported and called in `app/lists/[listId]/page.tsx`. The function is not dead. Step 6 is a no-op.

---

## Risk Assessment

| Step | Risk | Notes |
|---|---|---|
| Step 1 (indexes) | Low | Additive schema change; no data loss; must run `migrate:turso` |
| Step 2 (acceptInvite) | Medium | Changes function signature; update all call sites and tests |
| Step 3 (list service) | Medium | `assertOwner` is called from multiple places; verify all callers |
| Step 4 (parallelism) | Low | Logic unchanged; only execution order shifts |
| Step 5 (select) | Low | Purely additive constraint on return type |
| Step 6 (dead code) | — | CANCELLED — function has an active call site in `app/lists/[listId]/page.tsx` |

Run `npm test && npx tsc --noEmit` after each step.
