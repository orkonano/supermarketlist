# Interactive API Docs — Design Spec

**Date:** 2026-05-16
**Status:** Approved

## Problem

1. The landing page references `docs/openapi.yaml` but the file is not served by Next.js (only `public/` is served statically), so visiting `/docs/openapi.yaml` returns 404.
2. The REST API section on the landing page is brief and non-interactive. Developers need a page where they can browse all endpoints and try them out.
3. After creating an API key, the user has to manually copy it and paste it into any API tool they want to use.

## Goals

- Expose the OpenAPI 3.1 spec at a reachable URL.
- Add an interactive API explorer at `/docs` using Scalar.
- Update the landing page to link to the new page.
- Keep the page public (no login required).
- Allow the API key to be pre-filled in the Scalar explorer via a one-click flow from the API Keys settings page.

## Non-Goals

- Automatic pre-fill without any user action (raw keys are stored only as SHA-256 hashes and cannot be recovered).
- Changing any existing API endpoints or auth behavior.
- Modifying existing tests.

---

## Design

### 1. Serve the OpenAPI YAML

Move `docs/openapi.yaml` → `public/openapi.yaml`.

Next.js serves everything in `public/` as static files at the root, so the YAML becomes available at `/openapi.yaml`. No route handler needed.

The original `docs/openapi.yaml` is deleted to avoid two sources of truth.

### 2. Interactive docs route — `app/docs/route.ts`

Install `@scalar/nextjs-api-reference` and create a route handler that optionally pre-fills the bearer token from a `?token=` query parameter:

```ts
import { ApiReference } from '@scalar/nextjs-api-reference'
import type { NextRequest } from 'next/server'

export function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  return ApiReference({
    spec: { url: '/openapi.yaml' },
    authentication: token
      ? { preferredSecurityScheme: 'bearerAuth', http: { bearer: { token } } }
      : undefined,
  })()
}
```

When `?token=sml_...` is present, Scalar pre-populates the Authorization header for all "Try it out" requests. When absent (anonymous visitor), the explorer loads without a token.

No `page.tsx` is needed — this is a pure route handler with no React bundle overhead.

### 3. Auth middleware — `proxy.ts`

Add `/docs` to `publicRoutes` so unauthenticated visitors can reach it:

```ts
const publicRoutes = ["/", "/login", "/signup", "/docs"]
```

### 4. "Try in API Explorer" button — `app/settings/api-keys/page.tsx`

The one-time key reveal banner (shown in `?created=sml_...`) already displays the raw key. Add a link button beneath it:

```
¡API Key creada! Guardala ahora — no la vamos a mostrar de nuevo.
sml_abc123...
[Copiar]  [Probar en el explorador →]   ← new
```

The "Probar en el explorador" link points to `/docs?token=<rawKey>`. It opens in a new tab so the user keeps the key visible while exploring.

The key appears in the URL only over HTTPS and only the user themselves can see it — acceptable for a developer tool.

### 5. Landing page — `app/page.tsx`

Replace the plain-text bullet:

> OAS 3.1 disponible en `docs/openapi.yaml`

With two links:

> OAS 3.1: [Explorador interactivo →](/docs) · [openapi.yaml](/openapi.yaml)

### 6. CLAUDE.md — Prisma import note

Add a one-liner under the Database section noting that Prisma types must be imported from `app/generated/prisma/client`, not the bare directory (no `index.ts` exists).

---

## File Changes

| Action | Path |
|--------|------|
| Delete | `docs/openapi.yaml` |
| Add | `public/openapi.yaml` (same content) |
| Add | `app/docs/route.ts` |
| Edit | `proxy.ts` — add `/docs` to `publicRoutes` |
| Edit | `app/settings/api-keys/page.tsx` — add "Try in explorer" link to the reveal banner |
| Edit | `app/page.tsx` — update the OAS bullet to links |
| Edit | `CLAUDE.md` — Prisma import note |
| Add | `package.json` — `@scalar/nextjs-api-reference` dependency |

---

## Testing

- `npm test` must pass with no changes to existing tests (no behavior changes).
- `npx tsc --noEmit` must pass.
- Manual: visit `/docs` without being logged in — Scalar explorer loads, all endpoints visible, "Try it out" works with a valid API key pasted manually.
- Manual: visit `/docs?token=sml_test` — Scalar opens with the bearer token pre-filled.
- Manual: create a new API key in Settings — reveal banner shows the "Try in explorer" link; clicking it opens `/docs` with the token pre-filled.
- Manual: visit `/openapi.yaml` — YAML renders correctly.
- Manual: click the links on the landing page — both routes resolve correctly.

---

## Out of Scope

- Automatic session-based pre-fill (impossible without storing raw keys).
- Adding a "copy API key" button to the Scalar header.
- Versioned docs (`/docs/v2`, etc.).
