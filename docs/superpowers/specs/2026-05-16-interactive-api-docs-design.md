# Interactive API Docs — Design Spec

**Date:** 2026-05-16
**Status:** Approved

## Problem

1. The landing page references `docs/openapi.yaml` but the file is not served by Next.js (only `public/` is served statically), so visiting `/docs/openapi.yaml` returns 404.
2. The REST API section on the landing page is brief and non-interactive. Developers need a page where they can browse all endpoints and try them out.

## Goals

- Expose the OpenAPI 3.1 spec at a reachable URL.
- Add an interactive API explorer at `/docs` using Scalar.
- Update the landing page to link to the new page.
- Keep the page public (no login required).

## Non-Goals

- Injecting the user's API key automatically into the explorer (could be a future enhancement).
- Changing any existing API endpoints or auth behavior.
- Modifying existing tests.

---

## Design

### 1. Serve the OpenAPI YAML

Move `docs/openapi.yaml` → `public/openapi.yaml`.

Next.js serves everything in `public/` as static files at the root, so the YAML becomes available at `/openapi.yaml`. No route handler needed.

The original `docs/openapi.yaml` is deleted to avoid two sources of truth.

### 2. Interactive docs route — `app/docs/route.ts`

Install `@scalar/nextjs-api-reference` and create a single-file route handler:

```ts
import { ApiReference } from '@scalar/nextjs-api-reference'

export const GET = ApiReference({
  spec: { url: '/openapi.yaml' },
})
```

This returns a full Scalar HTML page at `GET /docs`. Scalar fetches `/openapi.yaml` from the browser, renders the sidebar-based explorer, and provides a live "Try it out" panel for every endpoint.

No `page.tsx` is needed — this is a pure route handler, so there is no React bundle overhead and no need to mark anything `"use client"`.

### 3. Auth middleware — `proxy.ts`

Add `/docs` to `publicRoutes` so unauthenticated visitors can reach it:

```ts
const publicRoutes = ["/", "/login", "/signup", "/docs"]
```

### 4. Landing page — `app/page.tsx`

Replace the plain-text bullet:

> OAS 3.1 disponible en `docs/openapi.yaml`

With two links:

> OAS 3.1: [Explorador interactivo →](/docs) · [openapi.yaml](/openapi.yaml)

### 5. CLAUDE.md — Prisma import note

Add a one-liner under the Database section noting that Prisma types must be imported from `app/generated/prisma/client`, not the bare directory (no `index.ts` exists).

---

## File Changes

| Action | Path |
|--------|------|
| Delete | `docs/openapi.yaml` |
| Add | `public/openapi.yaml` (same content) |
| Add | `app/docs/route.ts` |
| Edit | `proxy.ts` — add `/docs` to `publicRoutes` |
| Edit | `app/page.tsx` — update the OAS bullet to links |
| Edit | `CLAUDE.md` — Prisma import note |
| Add | `package.json` — `@scalar/nextjs-api-reference` dependency |

---

## Testing

- `npm test` must pass with no changes to existing tests (no behavior changes).
- `npx tsc --noEmit` must pass.
- Manual: visit `/docs` without being logged in — Scalar explorer loads, all endpoints visible, "Try it out" works with a valid API key.
- Manual: visit `/openapi.yaml` — YAML downloads/renders correctly.
- Manual: click the links on the landing page — both routes resolve correctly.

---

## Out of Scope

- Pre-filling the API key in the Scalar UI from the session cookie.
- Adding a "copy API key" button to the Scalar header.
- Versioned docs (`/docs/v2`, etc.).
