# Plan: Integration Tests for HTTP API + MCP Server

Add end-to-end **integration** tests for the REST API (`/api/v1/*`) and the MCP
server (`/api/mcp`), running them in GitHub Actions. The tests drive the **real
Next.js dev server** against a **real libSQL testcontainer** — exactly the infra
the existing Playwright e2e suite already stands up
(`e2e/global-setup.ts`, `e2e/global-teardown.ts`, `playwright.config.ts`).

This is a **plan only** — no test code is written here.

---

## Goal & scope

### In scope (phases 1–2)
- Every `/api/v1/*` route handler authenticated by API key (`Authorization: Bearer sml_...`).
- The MCP server: `initialize` handshake, `tools/list`, and representative `tools/call` invocations, asserting real DB mutations.
- The two security-critical negatives: missing/invalid key (401) and cross-resource access.
- A new `test:api` npm script and a CI job mirroring `.github/workflows/e2e.yml`.

### Out of scope for phase 1 (deferred to phase 3 / optional)
- `app/api/accept-invite/route.ts` and `app/api/verify-email/route.ts` — these
  authenticate via the **session cookie / workflow runtime**
  (`getOptionalSession`, `app/api/accept-invite/route.ts:15`), not the API key,
  so they need a cookie-minting helper. Deferred to phase 3.
- Live supermarket price scraping. `serviceGetItemPrices` (`lib/price-service.ts`)
  fans out to external adapters (`lib/price-adapters.ts`). Asserting price
  *values* would be flaky; phase 3 covers structure-only assertions with stubbed
  adapters.

### Why Playwright (not Newman/Postman) for the primary suite
The MCP route uses `WebStandardStreamableHTTPServerTransport` with
`sessionIdGenerator: undefined` (stateless) and **does not** enable JSON
responses (`app/api/mcp/route.ts:16`). In the transport, `_enableJsonResponse`
defaults to `false`
(`node_modules/@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.js:61,64`)
and the success path emits **`Content-Type: text/event-stream`** (SSE)
(`webStandardStreamableHttp.js:506`), not JSON. The POST handler also rejects any
request whose `Accept` header lacks **both** `application/json` and
`text/event-stream` with a **406** (`webStandardStreamableHttp.js:378–380`), and
any non-`application/json` Content-Type with a **415**
(`webStandardStreamableHttp.js:383–385`). A flat Newman/Postman collection cannot
do the JSON-RPC `initialize` handshake or parse the SSE stream cleanly. The MCP
suite therefore drives the server with the official SDK **`Client`** +
**`StreamableHTTPClientTransport`** (already a dependency — `@modelcontextprotocol/sdk@^1.29.0`,
`package.json:21`), which handles the handshake, the Accept header, and SSE parsing.

> **Note on the existing Postman collection.** `docs/postman/SupermarketList.postman_collection.json`
> is a useful **manual REST smoke artifact**, but its saved MCP examples are
> misleading: the Initialize response example is labelled
> `Content-Type: application/json` with a plain-JSON body
> (`SupermarketList.postman_collection.json:462–463`), whereas the server
> actually returns `text/event-stream`. Treat that collection as REST-only;
> never use it as the MCP contract.

---

## Coverage matrix

### REST API — `/api/v1/*`
All handlers wrapped by `apiRoute()` (`lib/api-route.ts:9`); auth is API-key-only
via `withApiKey` (`lib/api-auth.ts:12`). `apiRoute` maps `ApiAuthError` → 401
`{error:"No autorizado"}` (`lib/api-route.ts:16–17`), `ServiceError` → `e.status`
(`lib/api-route.ts:19–20`), and **re-throws anything else** → Next.js 500
(`lib/api-route.ts:22`).

| Route | Method | File:line | Success | Documented errors | Service touched | Test to add |
|---|---|---|---|---|---|---|
| `/api/v1/me` | GET | `app/api/v1/me/route.ts:3` | 200 `{id,name,email}` | 401 | — | P1 happy + P1 401 |
| `/api/v1/lists` | GET | `app/api/v1/lists/route.ts:7` | 200 `List[]` | 401 | `serviceGetUserLists` | P1 happy |
| `/api/v1/lists` | POST | `app/api/v1/lists/route.ts:12` | 201 `List` | 401, 422 invalid name | `serviceCreateList` | P1 happy + 422 |
| `/api/v1/lists/[id]` | GET | `app/api/v1/lists/[id]/route.ts:7` | 200 `List` | 401, **404** not found, **403** non-member | `serviceGetList` | P1 happy + **404** + P3 403 (2nd user) |
| `/api/v1/lists/[id]` | PATCH | `app/api/v1/lists/[id]/route.ts:13` | 200 `{ok:true}` | 401, 422, 403 not owner | `serviceUpdateList` | P1 happy |
| `/api/v1/lists/[id]` | DELETE | `app/api/v1/lists/[id]/route.ts:23` | 204 | 401, 403 not owner | `serviceDeleteList` | P1 happy |
| `/api/v1/lists/[id]/items` | GET | `app/api/v1/lists/[id]/items/route.ts:12` | 200 `Item[]` | 401 | `serviceGetListItems` | P1 happy (month/year query) |
| `/api/v1/lists/[id]/items` | POST | `app/api/v1/lists/[id]/items/route.ts:23` | 201 `Item` | 401, 422 | `serviceAddListItem` | P1 happy + 422 |
| `/api/v1/lists/[id]/items/[itemId]` | PATCH | `app/api/v1/lists/[id]/items/[itemId]/route.ts:12` | 200 `Item` | 401, 422, **see cross-list note** | `serviceToggle/UpdateListItem` | P1 toggle happy |
| `/api/v1/lists/[id]/items/[itemId]` | DELETE | `app/api/v1/lists/[id]/items/[itemId]/route.ts:29` | 204 | 401, **see cross-list note** | `serviceDeleteListItem` | P1 happy + **cross-list negative** |
| `/api/v1/lists/[id]/prices` | GET | `app/api/v1/lists/[id]/prices/route.ts:4` | 200 prices | 401, 422 no `items` param | `serviceGetItemPrices` (external) | P3 structure-only (stubbed) |

> **Cross-list item note (verified — flag this).** `serviceToggleListItem`,
> `serviceDeleteListItem`, and `serviceUpdateListItem` use a compound
> `where: { id: itemId, listId }` (`lib/list-service.ts:143,148,158`) after
> `ensureMember(listId, userId)`. If a member of list A targets an `itemId`
> belonging to list B via list A's path, the compound where matches nothing and
> Prisma throws **P2025** — but unlike `serviceUpdateList`/`serviceDeleteList`
> (which catch P2025 → `ServiceError(403)`, `lib/list-service.ts:91–93,102–104`),
> the **item** functions do **not** catch it. The error propagates uncaught and
> `apiRoute` re-throws it (`lib/api-route.ts:22`) → **HTTP 500**, not 404/403.
> The phase-1 cross-list test should assert the *current* behaviour and the plan
> flags this inconsistency as a decision point: either catch P2025 in the three
> item-service functions (→ 403, matching the list-level pattern) or 404, then
> update the test. Do not silently encode 404 — verify before asserting.

### MCP tools — `/api/mcp` (9 tools total)
Registered in `app/api/mcp/route.ts:11–14`. `tools/list` must return exactly **9**.

| Tool | File:line | Args | Service | Test to add |
|---|---|---|---|---|
| `list_lists` | `lib/mcp-tools/lists.ts:68` | — | `serviceGetUserLists` | P2 listTools count |
| `create_list` | `lib/mcp-tools/lists.ts:70` | `name` | `serviceCreateList` | P2 callTool + DB assert |
| `get_list` | `lib/mcp-tools/lists.ts:74` | `listId,month?,year?` | `serviceGetList`+`serviceGetListItems` | P2 |
| `rename_list` | `lib/mcp-tools/lists.ts:85` | `listId,name` | `serviceUpdateList` | P2 |
| `delete_list` | `lib/mcp-tools/lists.ts:92` | `listId` | `serviceDeleteList` | P2 |
| `add_item` | `lib/mcp-tools/items.ts:58` | `listId,name,quantity?,category?` | `serviceAddListItem` | P2 callTool + DB assert |
| `toggle_item` | `lib/mcp-tools/items.ts:70` | `listId,itemId,checked` | `serviceToggleListItem` | P2 |
| `delete_item` | `lib/mcp-tools/items.ts:77` | `listId,itemId` | `serviceDeleteListItem` | P2 |
| `compare_prices` | `lib/mcp-tools/prices.ts:15` | `listId,items[]` | `serviceGetItemPrices` (external) | P3 (stubbed) |

MCP error convention: tool handlers return `{ content:[{type:"text",...}], isError:true }`
on failure (`lib/mcp-tools/lists.ts:16–18`), they do **not** throw HTTP errors.
Bad/missing API key fails earlier, before the JSON-RPC layer (`handleMcp` calls
`withApiKey` first, `app/api/mcp/route.ts:9`), returning HTTP 401
(`app/api/mcp/route.ts:27–28`).

---

## Phase 1 — REST API key seeding + `api` Playwright project + CI

Smallest viable slice: seed an API key, add an API-only Playwright project, write
the REST happy path + the two security negatives, wire `test:api`, and add CI.

### ADD — extend `e2e/global-setup.ts` (seed an API key)
After the existing `User` INSERT (`e2e/global-setup.ts:33–37`), generate a raw
key, hash it, and INSERT into `ApiKey`. Confirm columns against
`prisma/schema.prisma:24–35` — `id` (cuid/string), `keyHash` (unique), `name`,
`userId`, `createdAt` (default now), `lastUsedAt?`, `expiresAt?`; **no `updatedAt`**.
Mirror the User insert's explicit `datetime('now')` for `createdAt`.

```ts
// in e2e/global-setup.ts, after the User insert
import { randomBytes, createHash } from "crypto";

const rawKey = "sml_" + randomBytes(32).toString("hex");          // matches lib/api-key-actions.ts:21
const keyHash = createHash("sha256").update(rawKey).digest("hex"); // matches lib/api-auth.ts:19
const keyId = randomUUID();

await client.execute({
  sql: `INSERT INTO "ApiKey" (id, keyHash, name, userId, createdAt)
        VALUES (?, ?, ?, ?, datetime('now'))`,
  args: [keyId, keyHash, "e2e-api-key", id],
});

writeFileSync(
  path.join(process.cwd(), "e2e/.auth/api-key.json"),
  JSON.stringify({ rawKey, keyId, userId: id })   // RAW key persisted — only the hash is in the DB
);
```

The DB stores only `keyHash`; the raw key exists nowhere else, so it must be
persisted to `e2e/.auth/api-key.json` for the test to read. Confirm `e2e/.auth/`
is gitignored (it holds `user.json`/`test-user.json` already).
**Risk:** Low | **Change:** ~12 lines added to global-setup

### ADD — new `api` project in `playwright.config.ts`
Add a project that needs **no browser** and no `setup`/`storageState` dependency
(API key auth is independent of the session-cookie flow):

```ts
// projects: [...existing,
{
  name: "api",
  testMatch: /api\/.*\.spec\.ts/,   // e2e/api/*.spec.ts
  // no `use.storageState`, no browser context needed
},
```

Keep `webServer.env` as the static literal it already is
(`playwright.config.ts:21–23`) — see Gotchas. `fullyParallel:false` / `workers:1`
already serialize against the single shared DB (`playwright.config.ts:5,7`).
**Risk:** Low | **Change:** ~5 lines

### ADD — `e2e/api/rest.spec.ts` (happy path, Playwright `request` fixture)
Skeleton outline (no implementation):
```ts
import { test, expect, request as pwRequest } from "@playwright/test";
import { readFileSync } from "fs";
// read e2e/.auth/api-key.json → rawKey
// helper: api = await pwRequest.newContext({
//   baseURL: "http://localhost:3000",
//   extraHTTPHeaders: { Authorization: `Bearer ${rawKey}` },
// });

// GET  /api/v1/me                          → 200 {id,name,email}
// POST /api/v1/lists {name}                → 201, capture listId
// GET  /api/v1/lists                       → 200 array includes listId
// GET  /api/v1/lists/{listId}              → 200
// PATCH /api/v1/lists/{listId} {name}      → 200 {ok:true}
// POST /api/v1/lists/{listId}/items {name} → 201, capture itemId
// GET  /api/v1/lists/{listId}/items        → 200 includes itemId (current month)
// PATCH .../items/{itemId} {checked:true}  → 200, item.checked === true
// DELETE .../items/{itemId}                → 204
// POST  /api/v1/lists {name:""}            → 422
// POST  .../items {} (no name)             → 422
// DELETE /api/v1/lists/{listId}            → 204
```
**Risk:** Low | **Change:** new file, ~80 lines

### ADD — `e2e/api/rest-negatives.spec.ts` (security)
```ts
// no Authorization header                  → 401 {error:"No autorizado"}
// Authorization: Bearer sml_bogus           → 401
// GET /api/v1/lists/{nonexistent-cuid}      → 404  (serviceGetList returns null)
// cross-list item: create list A + list B, add itemB to B,
//   DELETE /api/v1/lists/{A}/items/{itemB}  → assert CURRENT behaviour (500, see note)
//   + TODO comment referencing the P2025 decision point
```
**Risk:** Low | **Change:** new file, ~40 lines

### ADD — `test:api` script in `package.json`
```jsonc
"test:api": "playwright test --project=api"
```
(Sits alongside `test:e2e` at `package.json:15`.)
**Risk:** Low | **Change:** 1 line

### ADD — `.github/workflows/api-tests.yml` (CI job)
See [Exact CI changes](#exact-ci-changes). No `playwright install` step (API
project uses no browser), unlike `e2e.yml:24–25`.
**Risk:** Low | **Change:** new ~35-line workflow

---

## Phase 2 — MCP integration via the SDK client

### ADD — `e2e/api/mcp.spec.ts`
Drive the live `/api/mcp` route with the SDK `Client` +
`StreamableHTTPClientTransport`. The transport accepts a `requestInit` for custom
headers (`node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.d.ts:74–77`),
which carries the `Authorization` header; the transport itself sends the correct
`Accept: application/json, text/event-stream` and parses the SSE response.

```ts
import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
// read rawKey from e2e/.auth/api-key.json

// helper newClient(key):
//   const transport = new StreamableHTTPClientTransport(
//     new URL("http://localhost:3000/api/mcp"),
//     { requestInit: { headers: { Authorization: `Bearer ${key}` } } });
//   const client = new Client({ name: "test", version: "1.0.0" });
//   await client.connect(transport);   // performs initialize handshake

// 1. connect (initialize)                              → no throw
// 2. client.listTools()                                → expect exactly 9 tools
//                                                         (names match the matrix)
// 3. client.callTool({ name:"create_list", arguments:{name}})
//      → parse text content as JSON, capture listId
//      → assert via libSQL client that the row exists in "List"
// 4. client.callTool({ name:"add_item", arguments:{listId,name}})
//      → assert the "Item" row exists in the DB (real mutation)
// 5. client.callTool({ name:"delete_list", arguments:{listId}}) → cleanup
```

Assert real DB mutations by reading the same testcontainer via `@libsql/client`
against `http://localhost:18080` (the URL fixed in
`playwright.config.ts:22` / `e2e/global-setup.ts:19`).
**Risk:** Medium (handshake/SSE wiring is the only novelty) | **Change:** new file, ~90 lines

### ADD — MCP bad-key negative (same file or `e2e/api/mcp-negatives.spec.ts`)
A `connect()` with `Authorization: Bearer sml_bogus` must fail — `withApiKey`
throws before the JSON-RPC layer and the route returns HTTP 401
(`app/api/mcp/route.ts:9,27–28`). Assert the transport surfaces the 401 (the SDK
client rejects `connect()`).
**Risk:** Low | **Change:** ~15 lines

---

## Phase 3 — deferred surfaces

### accept-invite redirect branches
`app/api/accept-invite/route.ts` needs the **session cookie**, not the API key.
Add an `e2e/api/_helpers/session.ts` that mints a `session` cookie with `jose`
(same secret as the app — `SESSION_SECRET`) and seeds a `ListInvite` row. Cover
the verified redirect branches: missing-token (`:9`), invalid-invite (`:12`),
invite-expired (`:13`), unauthenticated → `/login` or `/signup` (`:17–22`),
wrong-account (`:30–31`), success → `/lists/{listId}` (`:39`). Use Playwright
`request` with `maxRedirects: 0` to assert `Location` per branch.
**Risk:** Medium (cookie minting) | **Change:** helper + ~60-line spec

### prices — structure only (stubbed adapters)
`compare_prices` / `GET .../prices` call external supermarket APIs via
`lib/price-adapters.ts`. Assert the **response shape** only, with the adapters
stubbed (e.g. an env-gated fixture path or a Playwright route stub at the fetch
boundary). Never assert live price values. Also covers the 422 (no `items`
param) branch (`app/api/v1/lists/[id]/prices/route.ts:6–8`).
**Risk:** Medium (stubbing strategy) | **Change:** ~40 lines + stub

### Remaining MCP tools
Round out `get_list`, `rename_list`, `delete_item`, `toggle_item` callTool +
DB-assert coverage if phase 2 only sampled them.
**Risk:** Low | **Change:** ~40 lines

---

## Optional — Newman REST-only smoke job
A `newman run docs/postman/SupermarketList.postman_collection.json` job can serve
as a REST contract smoke test **only**, with `apiKey` injected from the seeded
key. **MCP stays on the SDK-client path** — do not point Newman at `/api/mcp`
(SSE + handshake; the collection's MCP examples are mislabelled, see the note
above). Low value-add over phase 1; list as optional.
**Risk:** Low | **Change:** new ~25-line workflow + env

---

## Exact CI changes

Add a new workflow `.github/workflows/api-tests.yml`, mirroring `e2e.yml` but
**without** the Playwright browser install (`e2e.yml:24–25`) — the `api` project
runs no browser. ubuntu-latest ships Docker, so testcontainers works (same as the
existing e2e job).

```yaml
name: API + MCP Integration Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24          # must match local npm 11 — see Gotchas
          cache: npm

      - run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run API + MCP tests
        run: npm run test:api
        env:
          CI: true
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
          SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
          # do NOT set TURSO_AUTH_TOKEN — global-setup deletes it (global-setup.ts:20)

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: api-playwright-report
          path: playwright-report/
          retention-days: 7
```

- **Secrets required:** `E2E_TEST_PASSWORD`, `SESSION_SECRET` — both already used
  by `e2e.yml:31–32`, so no new secrets.
- **Ordering:** independent of `test.yml`'s `test`/`coverage` jobs (those run
  vitest, which **excludes** `e2e/`). No `needs:` linkage required; runs in
  parallel as its own workflow.
- **Docker/testcontainer note:** the libSQL testcontainer
  (`ghcr.io/tursodatabase/libsql-server:latest`, `global-setup.ts:14`) needs
  Docker — present on ubuntu-latest. The container binds host port 18080
  (`global-setup.ts:15`), matching `webServer.env.TURSO_DATABASE_URL`.
- Could alternatively be added as a second job inside `e2e.yml` to share
  checkout caching, but a separate file keeps browser-vs-no-browser steps clean.

---

## Gotchas

1. **`webServer.env` is evaluated at config-load time.** Keep only static
   literals there (`playwright.config.ts:21–23` already hard-codes
   `TURSO_DATABASE_URL: "http://localhost:18080"`). Never put runtime/container
   values in `webServer.env`; `global-setup.ts` sets process env / fixed ports
   before the server starts. The container is started in global-setup with a
   fixed host port (`global-setup.ts:15`), so the literal is safe.

2. **Node 24 / npm 11 lock sync.** CI uses Node 24 (npm 11) to match the lockfile
   (`e2e.yml:16`, `test.yml:16`). `npm ci` fails on any divergence. If the SDK
   client import surfaces a missing transitive dep, re-run `npm install` locally
   and commit `package-lock.json`.

3. **vitest excludes `e2e/`.** `vitest.config.ts:8,12` excludes `**/e2e/**`, so
   these specs run **only** under Playwright (`npm run test:api`), never under
   `npm test`. Put all integration specs under `e2e/api/` so vitest ignores them
   and the `api` project's `testMatch` (`/api\/.*\.spec\.ts/`) picks them up.

4. **External supermarket calls cause flakiness.** Anything touching
   `serviceGetItemPrices` → `lib/price-adapters.ts` hits live endpoints. Keep
   prices out of phases 1–2; stub in phase 3.

5. **MCP Accept/Content-Type strictness.** If a future hand-rolled HTTP test
   targets `/api/mcp`, it must send `Accept: application/json, text/event-stream`
   (else 406, `webStandardStreamableHttp.js:378–380`) and
   `Content-Type: application/json` (else 415, `:383–385`). The SDK client does
   this automatically — prefer it over raw `request`.

6. **GPG-signed commits — the user commits, not the agent.** This repo uses
   GPG-signed commits; provide the commit/push commands for the user to run in
   their own GPG-enabled terminal. Do not commit on their behalf.

---

## Recommended Execution Order Summary

| Phase | Files | Risk | Effort |
|---|---|---|---|
| 1 — REST + seeding + CI | `e2e/global-setup.ts` (edit), `playwright.config.ts` (edit), `e2e/api/rest.spec.ts`, `e2e/api/rest-negatives.spec.ts`, `package.json` (edit), `.github/workflows/api-tests.yml` | Low | Medium |
| 2 — MCP via SDK client | `e2e/api/mcp.spec.ts`, `e2e/api/mcp-negatives.spec.ts` | Medium | Medium |
| 3 — accept-invite + prices + remaining tools | `e2e/api/_helpers/session.ts`, `e2e/api/accept-invite.spec.ts`, `e2e/api/prices.spec.ts`, MCP tool top-up | Medium | Medium–Large |
| Optional — Newman REST smoke | `.github/workflows/newman-smoke.yml` | Low | Small |
