# Test Plan

## Stack

**Vitest** + **React Testing Library**. Vitest handles ESM/TypeScript natively with no transform config, runs faster than Jest, and works cleanly with Next.js App Router's server/client split. Add `@testing-library/react` + `jsdom` or `happy-dom` when component tests are introduced.

Run tests: `npm test` (one-shot) or `npm run test:watch` (watch mode).

---

## Priority 1 — Validation schemas `lib/definitions.ts` ✅

Pure Zod schemas with no dependencies. Easiest and most valuable to test first.

**`SignupFormSchema`**: name min-2-chars, valid email format, password min-8 with letter+number requirement, trim behaviour.  
**`LoginFormSchema`**: valid email, non-empty password.

Key cases: empty strings, boundary lengths (7 vs 8 chars), passwords with only letters or only digits, multiple simultaneous errors.

**Zod v4 note**: validators run on the *untrimmed* input; `.trim()` is a post-validation transform. A whitespace-padded email fails `.email()` before trim ever runs. A whitespace-only password passes `.min(1)` (untrimmed length > 0) and resolves to `""` after trim — a schema limitation worth documenting.

**File**: `lib/__tests__/definitions.test.ts`

---

## Priority 2 — JWT session utilities `lib/session.ts` ✅

`encrypt` and `decrypt` are isolated crypto functions. The silent failure mode — a wrong `SESSION_SECRET` causes `decrypt` to return `null`, propagating as unauthenticated access — makes these worth locking in.

**Setup requirement**: `session.ts` encodes the key at module-level (`const encodedKey = new TextEncoder().encode(secretKey)`), so `SESSION_SECRET` must be set in `vitest.setup.ts` before the first import, not in `beforeAll`. `server-only` and `next/headers` must be mocked via `vi.mock` (hoisted before imports).

**Cases**:
- `encrypt` → `decrypt` round-trip preserves `userId` and `expiresAt`
- Output is a three-part JWT string
- `decrypt("")` and `decrypt(undefined)` return `null`
- Garbage input returns `null`
- Token signed with a different key returns `null`
- Expired token returns `null`
- Structurally valid JWT with tampered payload bytes returns `null`

**File**: `lib/__tests__/session.test.ts`

---

## Priority 3 — Auth actions `lib/auth-actions.ts`

The most security-critical code. Requires mocking `prisma`, `bcryptjs`, `next/navigation`, and the workflow `start`.

**`signup`**:
- Validation errors are returned per-field
- Duplicate email returns `{ errors: { email: [...] } }`
- Success: creates user, calls `createSession`, starts email workflow, redirects to `/`

**`login`**:
- Validation errors are returned per-field
- User not found returns generic `{ message: "Invalid email or password." }`
- Wrong password returns the *same* generic message (no user enumeration — test locks this in)
- Correct credentials: calls `createSession`, redirects to `/`

**`logout`**: calls `deleteSession`, redirects to `/login`.

**File**: `lib/__tests__/auth-actions.test.ts`

---

## Priority 4 — Shopping list actions `lib/actions.ts`

`addItem` has a silent no-op guard (`if (!name?.trim() || !addedBy?.trim()) return`) that's easy to break silently. Requires mocking `prisma` and `next/cache`.

**Cases**:
- `addItem` with missing `name` or `addedBy` returns without calling `prisma.item.create`
- `addItem` with optional fields absent stores `null` for `quantity` and `category`
- `getItems` filters by both `month` *and* `year` (not just one)
- `toggleItem` calls `prisma.item.update` with the correct `checked` value
- `deleteItem` calls `prisma.item.delete` with the correct `id`

**File**: `lib/__tests__/actions.test.ts`

---

## Priority 5 — `ShoppingList` component navigation `app/components/ShoppingList.tsx`

Month navigation boundary conditions are pure logic, fast to test with React Testing Library.

**Cases**:
- `prevMonth` when `month === 1` navigates to `month=12, year-1`
- `nextMonth` when `month === 12` navigates to `month=1, year+1`
- Items with `null` category fall into "Other"
- Items with an unrecognised category fall into "Other" (not duplicated)
- `checked/total` count shown when `total > 0`, hidden when `total === 0`

**File**: `app/components/__tests__/ShoppingList.test.tsx`

---

## Priority 6 — `ItemRow` component `app/components/ItemRow.tsx`

**Cases**:
- `item.checked = true` renders `line-through` styling and aria-label "Uncheck item"
- `item.checked = false` renders normal styling and aria-label "Check item"
- Quantity span absent when `item.quantity` is `null`
- Toggle calls `toggleItem(item.id, !item.checked)` — the inversion is easy to regress
- Delete calls `deleteItem(item.id)`
- `opacity-50` class applied on the list item while transition is pending

**File**: `app/components/__tests__/ItemRow.test.tsx`

---

## Priority 7 — Verify-email API route `app/api/verify-email/route.ts`

Small but security-relevant HTTP endpoint; requires mocking `resumeHook` from `workflow/api`.

**Cases**:
- Missing `?token` → redirects to `/?error=missing-token`
- Valid token → `resumeHook` called with token → redirects to `/?verified=1`
- `resumeHook` throws → redirects to `/?error=invalid-token`

**File**: `app/api/verify-email/__tests__/route.test.ts`

---

## Priority 8 — DAL `lib/dal.ts`

Requires mocking `cookies` from `next/headers`, `decrypt` from `./session`, and `redirect` from `next/navigation`.

**Cases**:
- `verifySession` with no cookie calls `redirect("/login")`
- `verifySession` with valid session returns `{ isAuth: true, userId }`
- `getOptionalSession` with no cookie returns `null` (does not redirect)
- `getOptionalSession` with valid session returns `{ isAuth: true, userId }`

**File**: `lib/__tests__/dal.test.ts`

---

## Out of scope (for now)

- **`AddItemForm` / `LoginForm` / `SignupForm` components**: validation logic lives in `definitions.ts` (P1) and server actions (P3). RTL smoke tests add infrastructure cost for limited new signal.
- **Email verification workflow** (`workflows/email-verification.ts`): depends on the Anthropic Workflow API runtime. Revisit once the rest is in place and the workflow test utilities are understood.
