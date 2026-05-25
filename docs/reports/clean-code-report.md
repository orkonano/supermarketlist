# Clean Code Analysis Report

**Project:** superMarketList  
**Date:** 2026-05-18  
**Scope:** Full source review — `lib/`, `app/`, `proxy.ts`  
**Method:** Manual analysis against Clean Code principles (Uncle Bob)

---

## Summary

| Priority | Count | Theme |
|----------|-------|-------|
| P1 — Critical | 3 | Silent failures, dead code, key collision |
| P2 — High | 6 | Magic numbers, duplication, broken layering |
| P3 — Medium | 4 | Functions that do too many things |
| P4 — Low | 8 | Style, unsafe casts, minor improvements |

---

## P1 — Critical

These findings either hide bugs from the user or can produce incorrect behaviour.

---

### P1-1 · Silent validation failure in `addListItem`

**File:** `lib/list-actions.ts:69`

```ts
const parsed = AddItemSchema.safeParse({ name: name?.trim(), quantity: quantity?.trim() || undefined });
if (!parsed.success) return;   // ← silent discard
```

When schema validation fails, the server action returns `undefined` with no error state. The client (`AddItemForm.tsx`) calls `await addListItem(listId, fd)` inside a `startTransition`, resets the form, and closes the panel — meaning the user's product is silently lost.

**Fix:** Return an error object, or use `redirect` with an `?error=` param as the project's established pattern.

---

### P1-2 · Dead form field `addedBy` in `AddItemForm`

**File:** `app/components/AddItemForm.tsx:72–74`

```tsx
<input
  name="addedBy"
  required
  placeholder="Tu nombre *"
  ...
/>
```

`addListItem` in `lib/list-actions.ts` ignores this field entirely — it fetches the user's name from the database (line 71). The `required` attribute means the form cannot be submitted without filling it in, but the value is thrown away. The user is asked for information that is already known and then discarded.

**Fix:** Remove the field from the form. The server action already has the session-derived name.

---

### P1-3 · Composite cache key can collide

**File:** `lib/price-service.ts:34, 49`

```ts
fresh.set(`${e.query}:${e.supermarket}`, ...);
// ...
if (fresh.has(`${query}:${supermarket}`)) continue;
```

If a query string ever contains `:` (e.g. `"leche 1%:entera"`), the key `"leche 1%:entera:coto"` is ambiguous — it matches the pattern `query="leche 1%:entera", supermarket="coto"` and also `query="leche 1%", supermarket="entera:coto"`. The cache would miss or return wrong results.

**Fix:** Use a nested `Map<string, Map<string, PriceResult>>` or encode the key safely: `JSON.stringify([query, supermarket])`.

---

## P2 — High

Architecture and duplication issues that will compound as the codebase grows.

---

### P2-1 · Magic number `7 * 24 * 60 * 60 * 1000` in three files

**Files:** `lib/session.ts:32`, `proxy.ts:27`, `lib/invite-actions.ts:42`

The 7-day session/invite TTL is expressed as an inline arithmetic literal in all three places. If the expiry window changes, three sites need to be updated in sync.

```ts
// session.ts
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

// proxy.ts
const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

// invite-actions.ts
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
```

**Fix:** Extract to a shared constant, e.g. `lib/constants.ts`:

```ts
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
```

---

### P2-2 · Month/year parsing logic duplicated in three places

**Files:** `lib/list-actions.ts:63–66`, `app/api/v1/lists/[id]/items/route.ts:14–17`, `app/lists/[listId]/page.tsx:23–26`

The same guard — clamp an integer to the valid month and year ranges or fall back to "now" — appears identically three times across different layers.

```ts
// list-actions.ts
const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1;
const year  = Number.isInteger(rawYear)  && rawYear >= 2000 && rawYear <= 2100  ? rawYear  : now.getFullYear();

// items/route.ts
const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1;
const year  = rawYear >= 2000 && rawYear <= 2100 ? rawYear : now.getFullYear();
```

Note: the route version skips the `Number.isInteger` check — a subtle divergence.

**Fix:** Extract to `lib/utils.ts`:

```ts
export function parseMonthYear(rawMonth: number, rawYear: number): { month: number; year: number } {
  const now = new Date();
  return {
    month: Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1,
    year:  Number.isInteger(rawYear)  && rawYear  >= 2000 && rawYear <= 2100  ? rawYear  : now.getFullYear(),
  };
}
```

---

### P2-3 · Direct Prisma calls in page components bypass the service layer

**Files:** `app/lists/[listId]/page.tsx:31–39`, `app/lists/page.tsx:16–19`

Both pages call `prisma.list.findUnique` and `prisma.user.findUnique` directly, while all other data access goes through `lib/list-service.ts` or `lib/dal.ts`. This breaks the layered architecture: pages should not know about Prisma.

```ts
// app/lists/[listId]/page.tsx
const [list, user, items] = await Promise.all([
  prisma.list.findUnique({ where: { id: listId }, include: { members: ... } }),
  prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
  getListItems(listId, month, year),
]);
```

**Fix:** Add `serviceGetCurrentUser(userId)` to `lib/list-service.ts` (or `lib/dal.ts`) and a proper `serviceGetListWithMemberCheck` that returns `null` when the user is not a member.

---

### P2-4 · Cookie options object duplicated across `session.ts` and `proxy.ts`

**Files:** `lib/session.ts:36–41`, `proxy.ts:29–35`

The cookie configuration — `httpOnly`, `secure`, `sameSite`, `path` — is hardcoded identically in two places. A change to cookie security policy requires two edits.

**Fix:** Export a helper from `lib/session.ts`:

```ts
export function sessionCookieOptions(expires: Date): CookieOptions {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", expires, sameSite: "lax", path: "/" };
}
```

---

### P2-5 · `SUPERMARKETS` constant defined in two files with divergent shapes

**Files:** `lib/price-service.ts:15`, `app/components/PriceComparison.tsx:9–13`

```ts
// price-service.ts
const SUPERMARKETS: Supermarket[] = ["coto", "disco", "carrefour"];

// PriceComparison.tsx
const SUPERMARKETS = [
  { key: "coto" as const, label: "Coto" },
  { key: "disco" as const, label: "Disco" },
  { key: "carrefour" as const, label: "Carrefour" },
];
```

Adding a fourth supermarket requires changes in both files. The service-level list already defines the canonical order; the UI list should derive from it.

**Fix:** Export a single `SUPERMARKETS` constant from `lib/price-adapters.ts` with both the key and label, and import it in the service (use `.map(s => s.key)`) and the component.

---

### P2-6 · Inline server action in `lists/page.tsx` instead of using the bound action

**File:** `app/lists/page.tsx:97–100`

```tsx
<form
  action={async () => {
    "use server";
    await deleteList(list.id);
  }}
>
```

`deleteList` is already a named server action in `lib/list-actions.ts`. Defining a wrapper inline makes it untestable and creates a new closure per list item. Next.js supports `action={deleteList.bind(null, list.id)}` directly.

**Fix:** Replace with `<form action={deleteList.bind(null, list.id)}>`.

---

## P3 — Medium

Functions that do more than one thing. Each warrants decomposition.

---

### P3-1 · `addListItem` has five responsibilities

**File:** `lib/list-actions.ts:56–82` (26 lines)

1. Extracts form fields and casts types
2. Parses and validates month/year with inline logic
3. Validates the item schema
4. Fetches the current user from the database
5. Delegates to the service

The user fetch (line 71) is especially notable: it makes an extra round-trip just to read the user's name, which could be cached in the session or passed as a parameter.

**Fix:** Extract month/year parsing (see P2-2), remove the user fetch by storing `name` in the session payload or passing it from a higher level, and consider a `parseAddItemFormData` helper to separate extraction from action logic.

---

### P3-2 · `inviteToList` performs seven sequential checks in one function

**File:** `lib/invite-actions.ts:18–58` (40 lines)

The function serially performs: session check, email validation, ownership check, duplicate invite check, self-invite check, existing membership check, invite creation, detail fetch, and workflow start. Every check is a distinct concern.

This creates a hard-to-test monolith: each check path needs its own test setup that also satisfies all prior checks.

**Fix:** Extract `validateInviteCanBeSent(listId, email, inviterId)` returning `{ error } | null` as a guard, and keep the main function responsible only for creating the invite and triggering the workflow.

---

### P3-3 · `serviceGetItemPrices` is a 77-line function mixing caching, fetching, and mapping

**File:** `lib/price-service.ts:17–94`

The function:
1. Asserts membership
2. Deduplicates and normalises queries
3. Loads and evaluates cached entries
4. Launches fetch tasks for stale/missing entries
5. Writes cache on completion
6. Maps results to the per-item output format

Steps 3–5 mix async fetch orchestration with inline Prisma writes inside `.then()` callbacks — a style inconsistency in an otherwise async/await file.

**Fix:** Extract `loadFreshFromCache(queries)`, `fetchAndCacheStale(query, supermarket)`, and `buildResultMap(itemNames, queries, fresh)` as private helpers. This also makes each caching stage independently testable.

---

### P3-4 · `assertMember` has a write side effect disguised as a read guard

**File:** `lib/list-service.ts:10–23`

```ts
export async function assertMember(listId: string, userId: string) {
  const member = await prisma.listMember.findUnique(...);
  if (member) return;

  // Self-heal: owners created before the ListMember invariant was enforced may lack a record
  const list = await prisma.list.findUnique(...);
  if (list?.ownerId === userId) {
    await prisma.listMember.create({ data: { listId, userId } }).catch(() => {});
    return;
  }
  throw new ServiceError(403, ...);
}
```

A function named `assertMember` is expected to be read-only — it "asserts" a condition. Finding a write inside it violates the principle of least surprise. The `.catch(() => {})` on the create also silently swallows any error.

**Fix:** The self-heal logic is a legitimate migration shim, but it should either be an explicit `ensureMemberRecord` called alongside `assertMember`, or documented prominently and time-boxed for removal once the invariant is fully enforced in production.

---

## P4 — Low

Style issues and minor improvements that reduce friction for future readers.

---

### P4-1 · `PriceComparison` has a 32-line duplicated block for brand+product rendering

**File:** `app/components/PriceComparison.tsx:153–185`

The brand name and product name display is rendered twice: once inside an `<a>` wrapper and once inside a fragment `<>`. The only structural difference is the wrapping element.

**Fix:** Extract a `ProductInfo` component that accepts an optional `url` prop and wraps in `<a>` or fragment accordingly.

---

### P4-2 · `eslint-disable-line` suppressing a real hook dependency warning

**File:** `app/components/PriceComparison.tsx:33`

```ts
}, [listId, items.length]); // eslint-disable-line react-hooks/exhaustive-deps
```

`items` is in the dependency position (used inside the callback via `items.map`), but only `items.length` is listed. If items are renamed without adding or removing any, `fetchPrices` will not re-run and the comparison table will show stale names as row headers.

**Fix:** Pass `itemNames: string[]` as a prop instead of the full `Item[]` array, derive the stable dep key from the names, and remove the disable comment.

---

### P4-3 · `decrypt` casts JWT payload without validation

**File:** `lib/session.ts:24`

```ts
return payload as SessionPayload;
```

If the JWT was signed with a different payload shape (e.g. an old token missing `userId`), the cast succeeds silently and downstream code receives `undefined` where a string is expected. The `session?.userId` check in `dal.ts` catches the missing field, but with no error reporting.

**Fix:** Add a minimal shape check before casting:

```ts
if (typeof payload.userId !== "string") return null;
return payload as SessionPayload;
```

---

### P4-4 · Magic number `3_600_000` in `api-auth.ts`

**File:** `lib/api-auth.ts:28`

```ts
if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > 3_600_000) {
```

`3_600_000` is one hour in milliseconds. A named constant makes the intent clear and allows this threshold to be shared if other rate-limiting code is added.

**Fix:** `const LAST_USED_UPDATE_INTERVAL_MS = 60 * 60 * 1000;`

---

### P4-5 · `protectedRoutes.includes(path)` only guards exact paths

**File:** `proxy.ts:11, 17`

```ts
const protectedRoutes: string[] = ["/settings/api-keys"];
const isProtectedRoute = protectedRoutes.includes(path);
```

`/settings/api-keys/new` or `/settings/api-keys/123` would not be caught. As the settings area grows, each new sub-route must be explicitly added or the guard is bypassed.

**Fix:** Use `protectedRoutes.some(r => path === r || path.startsWith(r + "/"))`.

---

### P4-6 · Implicit `any` from `res.json()` in price adapters

**Files:** `lib/price-adapters.ts:29, 57`

```ts
const data = await res.json();
// then: data?.contents?.[0]?.MainContent?.[1]?.contents?.[0]
```

`res.json()` returns `any`. The deep optional chaining is the smell: it compensates for the lack of a type. If the API response shape changes, TypeScript will not catch it.

**Fix:** Define minimal types for the expected API response shapes (`VtexProduct`, `CotoEndecaResponse`) and cast/assert at the parse boundary. At minimum, annotate `data` as `unknown` to force an explicit narrowing step.

---

### P4-7 · `commertialOffer` — VTEX API misspelling should have an explanatory comment

**File:** `lib/price-adapters.ts:34`

```ts
product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price
```

`commertialOffer` is a known VTEX API typo (the actual API key is spelled this way). Without a comment, every future reader will assume it is a local typo and may "fix" it, breaking the integration.

**Fix:** Add an inline comment: `// VTEX API spells this as "commertialOffer" (sic)`

---

### P4-8 · Promises mixed with async/await inside `serviceGetItemPrices`

**File:** `lib/price-service.ts:51–80`

```ts
const task = (
  supermarket === "coto" ? cotoAdapter(query) : vtexAdapter(supermarket, query)
).then(async (r) => {
  fresh.set(...);
  await prisma.priceCache.upsert(...);
});
tasks.push(task);
```

`.then(async ...)` inside an otherwise async/await function is inconsistent style. It also makes error handling implicit — if `prisma.priceCache.upsert` throws, the rejection propagates into the `tasks` array and surfaces only at `Promise.all(tasks)` with no context about which query failed.

**Fix:** Refactor to a named `async function fetchAndCache(query, supermarket)` that uses `await` throughout, then push the call into `tasks`.

---

## Findings by File

| File | P1 | P2 | P3 | P4 | Total |
|------|----|----|----|-----|-------|
| `lib/list-actions.ts` | 1 | 1 | 1 | — | 3 |
| `lib/price-service.ts` | 1 | — | 1 | 1 | 3 |
| `lib/invite-actions.ts` | — | — | 1 | — | 1 |
| `lib/list-service.ts` | — | — | 1 | — | 1 |
| `lib/session.ts` | — | 1+1 | — | 1 | 3 |
| `lib/api-auth.ts` | — | — | — | 1 | 1 |
| `lib/price-adapters.ts` | — | — | — | 2 | 2 |
| `proxy.ts` | — | 1+1 | — | 1 | 3 |
| `app/lists/page.tsx` | — | 1+1 | — | — | 2 |
| `app/lists/[listId]/page.tsx` | — | 1+1 | — | — | 2 |
| `app/components/AddItemForm.tsx` | 1 | — | — | — | 1 |
| `app/components/PriceComparison.tsx` | — | — | — | 2 | 2 |

---

## Recommended Fix Order

1. **P1-2** — Remove dead `addedBy` field (1 file, zero risk)
2. **P2-6** — Replace inline server action with bound action (1 line change)
3. **P1-1** — Surface validation failure in `addListItem`
4. **P2-2** — Extract `parseMonthYear` utility (removes 3-way duplication)
5. **P2-1** — Extract session/invite TTL constants
6. **P2-4** — Extract `sessionCookieOptions` helper
7. **P1-3** — Fix composite cache key in `price-service.ts`
8. **P2-3** — Add `serviceGetCurrentUser` to DAL; remove direct Prisma calls from pages
9. **P2-5** — Unify `SUPERMARKETS` constant
10. **P3-1 / P3-2 / P3-3** — Decompose long functions (lowest urgency, highest effort)
