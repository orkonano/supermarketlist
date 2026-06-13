# Plan: Fix ESLint Warnings

**26 warnings across 20 files.** All are `warn`-level only; CI passes. This plan fixes them in batches from trivial to complex.

---

## Batch 1 — Trivial deletions (zero-risk)

### `app/.well-known/workflow/v1/flow/route.js`
**Warning:** Unused `eslint-disable` directive (line 2).  
**Fix:** Delete line 2 (`/* eslint-disable */`). The file is generated; ESLint finds nothing to disable.  
**Risk:** Low | **Change:** 1 line deleted

---

### `lib/__tests__/invite-actions.test.ts`
**Warning:** `fakeInviter` declared but never used (line 30).  
**Fix:** Delete the line `const fakeInviter = { name: "Alice" };`.  
**Risk:** Low | **Change:** 1 line deleted

---

### `lib/__tests__/mcp-tools.test.ts`
**Warning:** `serviceUpdateList` and `serviceDeleteList` imported but unused (lines 24–25).  
**Fix:** Remove both identifiers from the named import statement.  
**Risk:** Low | **Change:** 2 identifiers removed

---

## Batch 2 — Constant extraction and deduplication

### `app/api/mcp/route.ts`
**Warnings:**
- `sonarjs/no-duplicate-string` — `"No autorizado"` appears 3 times
- `sonarjs/no-identical-functions` — `GET` and `DELETE` handlers are body-identical to `POST`

**Fix:** Extract constant + shared handler:
```ts
const UNAUTHORIZED_ERROR = "No autorizado";

async function handleMcpRequest(req: Request): Promise<Response> {
  try {
    return await handleMcp(req);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return Response.json({ error: UNAUTHORIZED_ERROR }, { status: 401 });
    }
    throw e;
  }
}

export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;
```
**Risk:** Low | **Change:** Net -25 lines

---

### `proxy.ts`
**Warning:** `complexity` — proxy scores 11, max 10.  
**Analysis:** The inline `||` predicate in `protectedRoutes.some(...)` and optional chaining push the count over.

**Fix:** Extract two helpers:
```ts
function matchesRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(route + "/");
}

async function refreshSessionCookie(res: NextResponse, session: { userId: string }, cookie: string) {
  const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
  const refreshed = await encrypt({ userId: session.userId, expiresAt: newExpiry });
  res.cookies.set("session", refreshed, sessionCookieOptions(newExpiry));
}
```
Use `protectedRoutes.some((r) => matchesRoute(path, r))` and call `refreshSessionCookie(...)` in the main body.  
**Risk:** Low | **Change:** Small

---

### `lib/price-adapters.ts`
**Warning:** `vtexAdapter` complexity 21, `cotoAdapter` complexity 25.  
**Analysis:** Deeply nested optional chaining (`?.`) counts as branching. Both adapters access multi-level API response paths inline.

**Fix:** Extract response-shape navigators:
```ts
// For vtexAdapter
function getVtexRawPrice(product: VtexProduct): number | null {
  // VTEX API spells this as "commertialOffer" (sic)
  return product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price ?? null;
}

// For cotoAdapter
function extractCotoResultList(data: unknown): CotoResultList | undefined {
  return (data as CotoEndecaResponse)?.contents?.[0]?.MainContent?.[1]?.contents?.[0];
}
```
Each optional chain is now isolated to its own function, dropping both complexity scores below 10.  
**Risk:** Low | **Change:** +4 helpers, simplified adapter bodies

---

## Batch 3 — MCP tool refactors

### `lib/mcp-tools/items.ts`
**Warning:** `registerItemTools` is 52 lines (max 50).  
**Fix:** Extract each `server.tool(...)` callback body into a named handler:
```ts
async function handleAddItem(user: User, params: {...}): Promise<CallToolResult> { ... }
async function handleToggleItem(user: User, params: {...}): Promise<CallToolResult> { ... }
async function handleDeleteItem(user: User, params: {...}): Promise<CallToolResult> { ... }
```
`registerItemTools` becomes 3 slim `server.tool(name, schema, (p) => handleX(user, p))` registrations.  
**Risk:** Low | **Change:** Small

---

### `lib/mcp-tools/lists.ts`
**Warning:** `registerListTools` is 63 lines (max 50).  
**Fix:** Same pattern — extract 5 handler functions (`handleListLists`, `handleCreateList`, `handleGetList`, `handleRenameList`, `handleDeleteList`) above `registerListTools`.  
The `get_list` handler is the most complex (dynamic import + two service calls); extracting it is the most valuable refactor here.  
**Risk:** Low | **Change:** Small

---

## Batch 4 — React component sub-extractions

### `app/components/LoginForm.tsx`
**Warning:** `complexity` — 11, max 10.  
**Fix:** Extract error display helpers (reusable in SignupForm too — consider `app/components/form-helpers.tsx`):
```tsx
function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.[0]) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}
function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{message}</p>;
}
```
Replace inline `state?.errors?.email && <p>...</p>` with `<FieldError errors={state?.errors?.email} />`.  
**Risk:** Low | **Change:** Small

---

### `app/components/SignupForm.tsx`
**Warnings:** 55 lines + complexity 15.  
**Fix:** Reuse `FieldError`/`FormMessage` from above. Also extract a `FormField` wrapper for the repetitive label+input+error pattern:
```tsx
function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
```
**Risk:** Low | **Change:** Medium

---

### `app/components/AddItemForm.tsx`
**Warning:** 82 lines (max 50).  
**Fix:** Extract the expanded form state into `AddItemFormExpanded`:
```tsx
type FormProps = {
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
  error: string | null;
  categories: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

function AddItemFormExpanded(props: FormProps) {
  return <div className="bg-white rounded-2xl shadow-sm p-5">{/* ... the form JSX */}</div>;
}
```
`AddItemForm` itself reduces to ~20 lines: state, callback, conditional render.  
**Risk:** Low | **Change:** Small

---

### `app/components/ShoppingList.tsx`
**Warning:** 78 lines (max 50).  
**Fix:** Two extractions:
1. Module-level navigation helpers (no React state needed):
```ts
function toPrevMonth(month: number, year: number, navigate: (m: number, y: number) => void) { ... }
function toNextMonth(month: number, year: number, navigate: (m: number, y: number) => void) { ... }
```
2. `CategoryList` sub-component for the categorized item list section.  
**Risk:** Low | **Change:** Small

---

### `app/lists/new/page.tsx`
**Warning:** 53 lines (max 50).  
**Fix:** Extract form logic into a hook:
```ts
function useCreateListHandler(router: ReturnType<typeof useRouter>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) { ... }
  return { isPending, error, handleSubmit };
}
```
`NewListPage` then renders pure JSX using the hook values.  
**Risk:** Low | **Change:** Small

---

## Batch 5 — Page-level server component extractions

### `app/lists/[listId]/page.tsx`
**Warning:** 57 lines (max 50).  
**Fix:** Extract `ListPageHeader` server component for the top nav bar (listId, listName, userName, isOwner props). Main function reduces to data fetching + slim JSX.  
**Risk:** Low | **Change:** Small

---

### `app/lists/[listId]/share/page.tsx`
**Warning:** 75 lines (max 50).  
**Fix:** Extract `MembersList` and `PendingInvitesList` sub-components.  
**Risk:** Low | **Change:** Small

---

### `app/lists/page.tsx`
**Warning:** 114 lines (max 50).  
**Fix:** Extract `ListCard` (single list card with actions) and `ListsPageHeader` (top bar with greeting/logout). `ListsPage` reduces to ~30 lines.  
**Risk:** Low | **Change:** Medium

---

### `app/settings/api-keys/page.tsx`
**Warning:** 111 lines (max 50).  
**Fix:** Extract three sub-components:
- `NewKeyBanner` — displays the newly created key
- `CreateApiKeyForm` — the create form with inline server action
- `ApiKeyCard` — single key card with revoke form

Note: inline `"use server"` inside extracted server sub-components is valid in Next.js 15.  
**Risk:** Low | **Change:** Medium

---

## Batch 6 — Largest JSX refactors

### `app/components/PriceComparison.tsx`
**Warning:** 159 lines (max 50). Already has `ProductInfo` extracted.  
**Fix:** Extract 3 more sub-components:
- `PriceComparisonHeader` — title + Actualizar + Cerrar buttons
- `PriceTableRow` — single `<tr>` for one item with all supermarket price cells (receives `item`, `row`, `minPrice`)
- `PriceTotalsFooter` — `<tfoot>` totals row (receives `totals`, `minTotal`)

`PriceComparison` itself: ~50 lines of state, effects, memos, and layout.  
**Risk:** Low | **Change:** Medium

---

### `app/page.tsx`
**Warning:** 168 lines (max 50). The data arrays (`features`, `steps`) are already extracted.  
**Fix:** Extract 5 section components (same file or `app/components/landing/`):
- `HeroSection`
- `HowItWorksSection`
- `PriceHighlightSection` (move inline price card array to module-level const)
- `FeaturesSection`
- `DeveloperSection` (largest — ~55 lines alone)

`LandingPage` becomes ~20 lines of section composition.  
**Risk:** Low | **Change:** Medium (significant JSX reorganization, zero logic)

---

## Batch 7 — Workflow signature change (requires call-site update)

### `workflows/list-invite.ts`
**Warnings:** Both `listInviteWorkflow` and `sendInviteEmail` have 5 params (max 4).  
**Fix:** Introduce an options object:
```ts
type InviteParams = {
  email: string;
  inviterName: string;
  listName: string;
  token: string;
  userExists: boolean;
};

export async function listInviteWorkflow(params: InviteParams) { ... }
async function sendInviteEmail(params: InviteParams) { ... }
```
Also update the call site in `lib/invite-actions.ts` to pass an object.

**Important:** The compiled bundle `app/.well-known/workflow/v1/flow/route.js` will need to be regenerated after this source change. Verify the workflow runtime serializes a single object parameter correctly before merging.  
**Risk:** Medium | **Change:** Small source change, medium verification effort

---

## Recommended Execution Order Summary

| Batch | Files | Risk | Effort |
|-------|-------|------|--------|
| 1 — Trivial deletions | 3 files | Low | Trivial |
| 2 — Constant/dedup extraction | 3 files | Low | Small |
| 3 — MCP tool refactors | 2 files | Low | Small |
| 4 — React component helpers | 5 files | Low | Small–Medium |
| 5 — Page server components | 4 files | Low | Medium |
| 6 — Large JSX refactors | 2 files | Low | Medium |
| 7 — Workflow signature | 1 file + 1 call site | Medium | Small (verify carefully) |
