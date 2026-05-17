# Interactive API Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public Scalar API explorer at `/docs`, fix the broken `openapi.yaml` URL, and let users launch the explorer with their API key pre-filled from the Settings page.

**Architecture:** `@scalar/nextjs-api-reference` provides a Next.js route handler that returns a full Scalar HTML page. The OpenAPI YAML moves to `public/` so Next.js serves it statically at `/openapi.yaml`. When the API Keys settings page reveals a newly created key, a "Try in explorer" link passes the raw key via `?token=` to the route handler, which injects it into Scalar's auth config.

**Tech Stack:** Next.js App Router route handlers, `@scalar/nextjs-api-reference`, TypeScript, Vitest

> **Note on proxy.ts:** The spec says to add `/docs` to `publicRoutes`, but that array redirects *logged-in* users away to `/lists`. `/docs` should be in neither array — middleware already passes everyone through to routes not in either list. No change to `proxy.ts` needed.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Delete | `docs/openapi.yaml` | Moved to public/ |
| Add | `public/openapi.yaml` | Statically served at /openapi.yaml |
| Add | `app/docs/route.ts` | Scalar HTML route handler |
| Add | `app/docs/__tests__/route.test.ts` | Tests for route handler |
| Edit | `app/settings/api-keys/page.tsx` | "Try in explorer" link in reveal banner |
| Edit | `app/page.tsx` | Update OAS bullet to working links |
| Edit | `CLAUDE.md` | Prisma import note |

---

## Task 1: Move OpenAPI YAML to public/

**Files:**
- Delete: `docs/openapi.yaml`
- Add: `public/openapi.yaml`

- [ ] **Step 1: Copy the YAML to public/**

```bash
cp docs/openapi.yaml public/openapi.yaml
```

- [ ] **Step 2: Delete the original**

```bash
rm docs/openapi.yaml
```

- [ ] **Step 3: Verify the file is accessible**

Start the dev server (`npm run dev`) in another terminal, then:
```bash
curl -s http://localhost:3000/openapi.yaml | head -5
```
Expected output starts with:
```
openapi: 3.1.0
```

- [ ] **Step 4: Commit**

```bash
git add public/openapi.yaml docs/openapi.yaml
git commit -m "move openapi.yaml to public/ so Next.js serves it statically"
```

---

## Task 2: Install Scalar and create the route handler

**Files:**
- Add: `app/docs/route.ts`
- Add: `app/docs/__tests__/route.test.ts`

- [ ] **Step 1: Install the package**

```bash
npm install @scalar/nextjs-api-reference
```

- [ ] **Step 2: Write the failing test**

Create `app/docs/__tests__/route.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { GET } from "../route";

function makeReq(url: string) {
  return new Request(url);
}

describe("GET /docs", () => {
  it("returns 200 with Scalar HTML", async () => {
    const res = await GET(makeReq("http://localhost:3000/docs") as never);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("scalar");
    expect(html).toContain("/openapi.yaml");
  });

  it("returns 200 when ?token= is empty", async () => {
    const res = await GET(makeReq("http://localhost:3000/docs?token=") as never);
    expect(res.status).toBe(200);
  });

  it("embeds the token when ?token= is provided", async () => {
    const res = await GET(makeReq("http://localhost:3000/docs?token=sml_abc123") as never);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("sml_abc123");
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
npx vitest run app/docs/__tests__/route.test.ts
```

Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 4: Create the route handler**

Create `app/docs/route.ts`:

```ts
import { ApiReference } from "@scalar/nextjs-api-reference";
import type { NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  return ApiReference({
    spec: { url: "/openapi.yaml" },
    ...(token && {
      authentication: {
        preferredSecurityScheme: "bearerAuth",
        securitySchemes: {
          bearerAuth: { token },
        },
      },
    }),
  })();
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
npx vitest run app/docs/__tests__/route.test.ts
```

Expected: 3 passed

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (no regressions)

- [ ] **Step 7: Commit**

```bash
git add app/docs/route.ts app/docs/__tests__/route.test.ts package.json package-lock.json
git commit -m "add Scalar API explorer at /docs with optional ?token= pre-fill"
```

---

## Task 3: Add "Try in Explorer" link to the API key reveal banner

**Files:**
- Modify: `app/settings/api-keys/page.tsx`

The one-time reveal banner is rendered when `params.created` is set (line ~27). The raw key is in `params.created`.

- [ ] **Step 1: Open the file and locate the reveal banner**

The current banner (around line 27–34):
```tsx
{params.created && (
  <div className="mb-6 px-4 py-4 bg-green-50 border border-green-200 rounded-2xl">
    <p className="text-sm font-semibold text-green-800 mb-1">¡API Key creada! Guardala ahora — no la vamos a mostrar de nuevo.</p>
    <code className="block text-xs font-mono text-green-900 bg-green-100 rounded-lg px-3 py-2 break-all">
      {params.created}
    </code>
  </div>
)}
```

- [ ] **Step 2: Add the "Try in explorer" link**

Replace the banner with:

```tsx
{params.created && (
  <div className="mb-6 px-4 py-4 bg-green-50 border border-green-200 rounded-2xl">
    <p className="text-sm font-semibold text-green-800 mb-1">¡API Key creada! Guardala ahora — no la vamos a mostrar de nuevo.</p>
    <code className="block text-xs font-mono text-green-900 bg-green-100 rounded-lg px-3 py-2 break-all">
      {params.created}
    </code>
    <div className="mt-3">
      <a
        href={`/docs?token=${encodeURIComponent(params.created)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 underline underline-offset-2"
      >
        Probar en el explorador →
      </a>
    </div>
  </div>
)}
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/settings/api-keys/page.tsx
git commit -m "add Try in Explorer link to API key reveal banner"
```

---

## Task 4: Update the landing page

**Files:**
- Modify: `app/page.tsx` (around line 206)

- [ ] **Step 1: Replace the plain-text OAS bullet with two links**

Current (line ~206):
```tsx
<li>• OAS 3.1 disponible en <code className="text-gray-400">docs/openapi.yaml</code></li>
```

Replace with:
```tsx
<li>• OAS 3.1: <a href="/docs" className="text-gray-300 underline underline-offset-2 hover:text-white">Explorador interactivo →</a> · <a href="/openapi.yaml" className="text-gray-500 hover:text-gray-300 underline underline-offset-2">openapi.yaml</a></li>
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "update landing page OAS link to point to /docs explorer"
```

---

## Task 5: Add Prisma import note to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a note under the Database section**

Find the Database section in `CLAUDE.md` and add after the existing content:

```markdown
### Prisma type imports

Always import Prisma model types from `app/generated/prisma/client`, not from the bare `app/generated/prisma` directory — there is no `index.ts` so the Next.js build worker can't resolve the directory import.

```ts
// correct
import type { User } from "@/app/generated/prisma/client";

// wrong — causes build failure
import type { User } from "@/app/generated/prisma";
```
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "document Prisma type import path in CLAUDE.md"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Manual smoke test**

With dev server running:

1. Visit `http://localhost:3000/openapi.yaml` — YAML content should appear (not 404)
2. Visit `http://localhost:3000/docs` — Scalar explorer loads, all endpoints visible in sidebar
3. Visit `http://localhost:3000/docs?token=sml_test` — Scalar opens with `sml_test` pre-filled in the Authorization field
4. Go to Settings → API Keys, create a new key — reveal banner shows the "Probar en el explorador →" link
5. Click the link — opens `/docs` in a new tab with the token pre-filled
6. On the landing page, click "Explorador interactivo →" — lands on `/docs`
7. Click `openapi.yaml` link — navigates to the raw YAML

- [ ] **Step 4: Push**

```bash
git push
```
