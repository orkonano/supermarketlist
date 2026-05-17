# Plan: REST API + MCP Server for SupermarketList

## Goals

1. Expose a REST API over the existing app logic (no browser required)
2. Build an MCP server inside the same Next.js app that calls that API
3. Connect the MCP server to Claude Desktop and Claude.ai web

> **Architecture:** everything runs in one Next.js deployment on Vercel. The MCP server is a single route handler (`/api/mcp`) using the SDK's `StreamableHTTPServerTransport` — no separate package, no separate build, no separate process to manage. The MCP tools call the same service helpers (`lib/list-service.ts`) that the REST API uses.

---

## Phase 1 — API Key Authentication

The current session system uses httpOnly cookies (browser-only). We need a parallel, header-based auth path.

### 1.1 New Prisma model

```prisma
model ApiKey {
  id          String    @id @default(cuid())
  keyHash     String    @unique        // SHA-256 of the raw key — raw key is never stored
  name        String                  // label, e.g. "Claude MCP"
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime?
  expiresAt   DateTime?               // nullable — no expiry if null; checked on every request
}
```

Raw key format: `sml_` + 32 random bytes (hex) = 68-char string. Only the SHA-256 hash is stored.

### 1.2 Migration

```
prisma/migrations/<timestamp>_add_api_key/migration.sql
```

Then `npm run migrate:turso`.

### 1.3 Auth middleware — `lib/api-auth.ts`

```ts
// Throws ApiAuthError (caught by apiRoute wrapper) or returns { user, keyId }
export async function withApiKey(req: Request): Promise<{ user: User; keyId: string }>
```

- Reads `Authorization: Bearer <key>` header
- SHA-256 hashes the key, looks up `ApiKey` row where `expiresAt IS NULL OR expiresAt > now()`, joins `User`
- Updates `lastUsedAt` **only when the existing value is older than 1 hour** — avoids a write on every read:
  ```ts
  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 3_600_000) {
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
  }
  ```
- Throws `ApiAuthError` (status 401) if header is missing, key is invalid, expired, or user not found

**`apiRoute` wrapper** — used by both REST handlers and the MCP route so a forgotten auth check can't leak a 500:

```ts
// lib/api-route.ts
export function apiRoute(
  handler: (req: Request, auth: { user: User; keyId: string }) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      const auth = await withApiKey(req)
      return await handler(req, auth)
    } catch (e) {
      if (e instanceof ApiAuthError) return json({ error: "No autorizado" }, 401)
      throw e
    }
  }
}
```

### 1.4 Key management server actions — `lib/api-key-actions.ts`

- `createApiKey(name)`:
  - Enforces a **maximum of 10 keys per user** — returns an error if the limit is reached
  - Generates key, stores hash, returns raw key once
- `deleteApiKey(id)`:
  - Where clause **must include `userId`** to prevent cross-user deletion:
    ```ts
    prisma.apiKey.delete({ where: { id, userId: session.userId } })
    ```

> **Note:** these are server actions (use the session cookie), not route handlers. They are not part of the REST API.

### 1.5 Settings page — `/app/settings/api-keys/page.tsx`

Simple browser UI (Argentine Spanish / vos):

- Lists existing keys (name + created date + last used + expiry if set) — **raw key is never shown again after creation**
- "Generá una nueva clave" form → name input → POST creates key → shows raw key once in a modal
- "Revocar" button per key → calls `deleteApiKey`

Add `/settings/api-keys` to `protectedRoutes` in `proxy.ts`.

---

## Phase 2 — REST API Routes

All routes under `/app/api/v1/`. Every handler is wrapped with `apiRoute()` from `lib/api-route.ts`.

> **Important:** these are Next.js **route handlers** (`route.ts` files), not server actions. They do not use the session cookie. Auth is solely via the `Authorization: Bearer` header.

Responses are JSON. Errors: `{ "error": "mensaje" }`.

### Endpoints

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/v1/me` | Return current user (name, email) |
| `GET` | `/api/v1/lists` | All lists the user is a member of |
| `POST` | `/api/v1/lists` | Create a list (`{ name }`) |
| `GET` | `/api/v1/lists/:id` | List details + member count |
| `PATCH` | `/api/v1/lists/:id` | Rename (`{ name }`) — owner only |
| `DELETE` | `/api/v1/lists/:id` | Delete — owner only |
| `GET` | `/api/v1/lists/:id/items` | Items, optional `?month=&year=` |
| `POST` | `/api/v1/lists/:id/items` | Add item (`{ name, quantity?, category? }`) |
| `PATCH` | `/api/v1/lists/:id/items/:itemId` | Toggle (`{ checked }`) or update fields |
| `DELETE` | `/api/v1/lists/:id/items/:itemId` | Delete item |
| `GET` | `/api/v1/lists/:id/prices` | Price comparison — see query param note below |

### Query params for prices

Use **repeated params**, not comma-separated values, so item names with commas work correctly:

```
GET /api/v1/lists/:id/prices?items=leche&items=pan&items=arroz
```

Parse with: `new URL(req.url).searchParams.getAll('items')`.

### Item-level scoping

`PATCH` and `DELETE` on items must scope by both `itemId` **and** `listId` in the where clause — never by `itemId` alone:

```ts
prisma.listItem.update({ where: { id: itemId, listId } })
prisma.listItem.delete({ where: { id: itemId, listId } })
```

### Notes

- Route handlers call shared service helpers in `lib/list-service.ts` — no logic duplication with server actions.
- `addedBy` for items created via API = `"${user.name} (API)"` — the suffix distinguishes API-created items from browser-created ones in the UI.
- Month/year for new items defaults to the current month/year when not supplied.
- Price endpoint reuses `getItemPrices` logic (cache + adapters) unchanged.
- **Rate limiting:** no built-in rate limiting in v1. Before any public exposure, add middleware (e.g., Upstash Ratelimit) keyed on `keyId`. Deferred but required before public launch.

---

## Phase 3 — MCP Server

The MCP server runs as a single Next.js route handler at `/app/api/mcp/route.ts` using `StreamableHTTPServerTransport` from the MCP SDK. No separate package, no separate build step.

### New dependency

```bash
npm install @modelcontextprotocol/sdk zod
```

Add to root `package.json` — no workspace needed.

### Entry point — `app/api/mcp/route.ts`

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { withApiKey, ApiAuthError } from "@/lib/api-auth"
import { registerListTools } from "@/lib/mcp-tools/lists"
import { registerItemTools } from "@/lib/mcp-tools/items"
import { registerPriceTools } from "@/lib/mcp-tools/prices"

export async function POST(req: Request) {
  try {
    const auth = await withApiKey(req)
    const server = new McpServer({ name: "supermarketlist", version: "1.0.0" })
    registerListTools(server, auth)
    registerItemTools(server, auth)
    registerPriceTools(server, auth)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await server.connect(transport)
    return transport.handleRequest(req)
  } catch (e) {
    if (e instanceof ApiAuthError) return Response.json({ error: "No autorizado" }, { status: 401 })
    throw e
  }
}
```

### Tools — `lib/mcp-tools/`

Tools call `lib/list-service.ts` directly (same helpers used by REST routes):

| Tool name | Input | What it does |
|-----------|-------|--------------|
| `list_lists` | — | Returns all user's lists |
| `create_list` | `name` | Creates a new list |
| `get_list` | `listId`, `month?`, `year?` | Returns list detail + items (defaults to current month/year) |
| `rename_list` | `listId`, `name` | Renames a list |
| `delete_list` | `listId` | Deletes a list |
| `add_item` | `listId`, `name`, `quantity?`, `category?` | Adds an item |
| `toggle_item` | `listId`, `itemId`, `checked` | Checks/unchecks an item |
| `delete_item` | `listId`, `itemId` | Removes an item |
| `compare_prices` | `listId`, `items: string[]` | Returns prices from Coto, Disco, Carrefour |

`get_list` accepts optional `month` and `year` so Claude can answer historical questions ("what did we buy in February?").

Tool errors (e.g., list not found, not a member) must be returned as MCP tool errors, not thrown exceptions, so Claude can report them gracefully.

---

## Phase 4 — Connecting to Claude

No local build or process needed — the MCP server is already deployed at your Vercel URL.

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supermarketlist": {
      "type": "http",
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer sml_..."
      }
    }
  }
}
```

**Claude.ai web** — Settings → Integrations → add MCP server with the same URL and API key.

Both use the HTTP transport — no local process, no separate deployment.

> **Cold start note:** Vercel serverless functions have a ~200ms cold start on the first MCP call after inactivity. Acceptable for a personal project.

---

## Phase 5 — Tests

Following the existing `lib/__tests__/` + vitest pattern. All tests live in the main test suite — no separate MCP test package.

- `lib/__tests__/api-auth.test.ts` — key hashing, valid/invalid key lookup, expired key rejection, 401 responses
- `lib/__tests__/api-key-actions.test.ts` — create/delete key server actions, 10-key limit, cross-user delete rejected
- `app/api/v1/__tests__/lists.test.ts` — route handler tests: auth failure, correct responses, wrong-owner scenarios
- `app/api/v1/__tests__/items.test.ts` — item create/update/delete with listId scoping verified
- `lib/__tests__/mcp-tools.test.ts` — tool input validation and error propagation (mocked Prisma)

---

## File tree delta

```
prisma/schema.prisma                          ← add ApiKey model (with expiresAt)
prisma/migrations/<ts>_add_api_key/           ← new migration

lib/api-auth.ts                               ← withApiKey(), ApiAuthError
lib/api-route.ts                              ← apiRoute() wrapper
lib/api-key-actions.ts                        ← createApiKey (10-key limit), deleteApiKey (userId-scoped)
lib/list-service.ts                           ← shared Prisma queries (extracted from actions)
lib/mcp-tools/lists.ts                        ← registerListTools()
lib/mcp-tools/items.ts                        ← registerItemTools()
lib/mcp-tools/prices.ts                       ← registerPriceTools()
lib/__tests__/api-auth.test.ts
lib/__tests__/api-key-actions.test.ts
lib/__tests__/mcp-tools.test.ts

app/settings/api-keys/page.tsx                ← settings UI
app/api/mcp/route.ts                          ← MCP server (StreamableHTTPServerTransport)
app/api/v1/me/route.ts
app/api/v1/lists/route.ts
app/api/v1/lists/[id]/route.ts
app/api/v1/lists/[id]/items/route.ts
app/api/v1/lists/[id]/items/[itemId]/route.ts
app/api/v1/lists/[id]/prices/route.ts
app/api/v1/__tests__/lists.test.ts
app/api/v1/__tests__/items.test.ts

proxy.ts                                      ← add /settings/api-keys to protectedRoutes
package.json                                  ← add @modelcontextprotocol/sdk, zod
package-lock.json                             ← commit alongside package.json
```

---

## Implementation order

1. Prisma schema + migration + Turso deploy
2. `lib/api-auth.ts` + `lib/api-route.ts` + tests
3. `lib/list-service.ts` (extract shared queries)
4. `lib/api-key-actions.ts` + settings page UI (generate keys to test with)
5. REST API routes (v1) + route tests
6. `lib/mcp-tools/` + `app/api/mcp/route.ts` + MCP tool tests
7. End-to-end smoke test: generate key → call `/api/v1/me` → connect MCP to Claude Desktop
