# Clean Code Implementation Plan

**Branch:** `feature/clean-code-report-recommendations`  
**Source reports:** `docs/clean-code-analysis.md` (sub-agent analysis) + `docs/reports/clean-code-report.md` (detailed manual review)

---

## Status

### ✅ Implemented — from clean-code-analysis.md (branch: feature/clean-code-analysis-report, merged)

| Finding | File(s) |
|---|---|
| Extract `normalizeMonthYear` to `lib/date-utils.ts` | `lib/list-actions.ts`, `app/lists/[listId]/page.tsx` |
| Fix silent `.catch(() => {})` swallowing real errors | `lib/list-service.ts` |
| Extract `lib/constants/time.ts` (SESSION, INVITE, TTL, LAST_USED) | `lib/session.ts`, `proxy.ts`, `lib/invite-actions.ts`, `lib/api-auth.ts` |
| Extract `lib/constants/errors.ts` (PERMISSION_DENIED, INVALID_CREDENTIALS) | `lib/list-service.ts`, `lib/auth-actions.ts` |
| Rename `assertMember` → `ensureMember` | `lib/list-service.ts`, `lib/price-service.ts` |
| Decompose `serviceGetItemPrices` into helper functions | `lib/price-service.ts` |
| Extract `priceResultToRecord` helper | `lib/price-service.ts` |
| Extract `COTO_ATTRS` typed const | `lib/price-adapters.ts` |
| Extract `isValidPrice` shared guard | `lib/price-adapters.ts` |
| Add `useMemo` for totals in `PriceComparison` | `app/components/PriceComparison.tsx` |
| Stabilize `useCallback` dep with `itemNames` memo | `app/components/PriceComparison.tsx` |
| Deduplicate email field in Zod schemas | `lib/definitions.ts` |
| Extract `API_KEY_PREFIX` constant | `lib/api-key-actions.ts` |
| Separate `listDetails`/`inviter` null checks | `lib/invite-actions.ts` |
| Add `console.debug` to `decrypt` catch | `lib/session.ts` |
| Remove `isAuth: true` from session returns | `lib/dal.ts`, 4 test fixtures |
| Extract `buildInviteLink` helper | `lib/auth-utils.ts`, `LoginForm.tsx`, `SignupForm.tsx` |
| Extract `groupItemsByCategory` to `lib/shopping-utils.ts` | `app/components/ShoppingList.tsx` |
| Extract `calculateTotals` to `lib/price-utils.ts` | `app/components/PriceComparison.tsx` |
| Replace inline `"use server"` closure with `deleteList.bind` | `app/lists/page.tsx` |
| Move `features`/`steps` to `app/config/landing.ts` | `app/page.tsx` |
| Use `validName` from `ListNameSchema.parse()` in `updateList` | `lib/list-actions.ts` |
| Add `redirectAfterLogin` helper | `lib/auth-actions.ts` |
| Remove dead `listMember.findUnique` mock from test | `lib/__tests__/list-actions.test.ts` |
| Exclude `e2e/` from `tsconfig.json` | `tsconfig.json` |
| Add component tests for `groupItemsByCategory` + `calculateTotals` | `lib/__tests__/shopping-utils.test.ts`, `lib/__tests__/price-utils.test.ts` |

---

### 🔄 In Progress — from clean-code-report.md (current branch)

| ID | Finding | File(s) | Status |
|---|---|---|---|
| P2-3 | Replace direct Prisma calls in pages with service functions | `app/lists/page.tsx`, `app/lists/[listId]/page.tsx` | ✅ Done |
| P2-4 | Extract `sessionCookieOptions` helper to eliminate cookie option duplication | `lib/session.ts`, `proxy.ts` | ✅ Done |
| P2-5 | Export `SUPERMARKETS` constant from `lib/price-adapters.ts` | `lib/price-service.ts`, `PriceComparison.tsx` | ✅ Done |
| P2-2 ext | Fix missing `Number.isInteger` in API route month/year parsing | `app/api/v1/lists/[id]/items/route.ts` | ✅ Done |
| P4-3 | Add JWT payload shape check before cast in `decrypt` | `lib/session.ts` | ✅ Done |
| P4-5 | Fix `protectedRoutes.includes` to match sub-paths | `proxy.ts` | ✅ Done |
| P4-6 | Annotate `res.json()` as `unknown`, add `VtexProduct`/`CotoEndecaResponse` types | `lib/price-adapters.ts` | ✅ Done |
| P4-7 | Add comment explaining `commertialOffer` VTEX typo | `lib/price-adapters.ts` | ✅ Done |
| P4-8 | Refactor `.then(async …)` to named `fetchAndCache` function | `lib/price-service.ts` | ✅ Done |
| P3-2 | Extract `validateInviteCanBeSent` guard from `inviteToList` | `lib/invite-actions.ts` | ✅ Done |
| P4-1 | Extract `ProductInfo` component from `PriceComparison` | `PriceComparison.tsx` | ✅ Done |

---

## Findings only in analysis.md (not in report.md — low priority, skipped)

| Finding | Reason skipped |
|---|---|
| `MONTHS`/`CATEGORIES` move to config | Component-local data, not shared |
| Landing page arrays to config | Done |
| `isAuth: true` removal | Done |

---

## Not implemented (deliberate decisions)

| Finding | Reason |
|---|---|
| `redirectAfterAuth` covering both signup+login | Signup and login have different invite logic — no true duplication |
| `dal.ts` isAuth simplification | Done |
| P2-3: `serviceGetListWithMemberCheck` full service wrapper | `serviceGetListForMember` added to `list-service.ts` instead |
