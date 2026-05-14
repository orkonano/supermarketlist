# Plan: REST API + MCP Server for SupermarketList

## Goals

1. Expose a REST API over the existing app logic (no browser required)
2. Build an MCP server (`mcp/` folder in this repo) that calls that API
3. Connect the MCP server to Claude Desktop / Claude.ai

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
// Returns { user } or responds 401
export async function withApiKey(req: Request): Promise<{ user: User } | Response>
```

- Reads `Authorization: Bearer <key>` header
- SHA-256 hashes the key, looks up `ApiKey` row, joins `User`
- Updates `lastUsedAt`
- Returns `401` if missing, invalid, or user not found

### 1.4 Settings page — `/app/settings/api-keys/page.tsx`

Simple browser UI (Argentine Spanish / vos):

- Lists existing keys (name + created date + last used) — **raw key is never shown again after creation**
- "Generá una nueva clave" form → name input → POST creates key → shows raw key once in a modal
- "Revocar" button per key → DELETE removes it
- Backed by two new server actions in `lib/api-key-actions.ts`:
  - `createApiKey(name)` → generates key, stores hash, returns raw key once
  - `deleteApiKey(id)` → deletes row (owner-guarded)

Add `/settings/api-keys` to `protectedRoutes` in `proxy.ts`.

---

## Phase 2 — REST API Routes

All routes under `/app/api/v1/`. Every handler starts with `const auth = await withApiKey(req)` and returns `auth` if it's a `Response` (i.e. 401).

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
| `GET` | `/api/v1/lists/:id/prices` | Price comparison, `?items=leche,pan` |

### Notes

- The route handlers call the **same Prisma queries** already used by server actions — the logic is extracted into thin service helpers so both server actions and API routes share it without duplication.
- `addedBy` for items created via API = user's `name` from the `ApiKey → User` join.
- Month/year for new items defaults to the current month/year when not supplied.
- Price endpoint reuses `getItemPrices` logic (cache + adapters) unchanged.

---

## Phase 3 — MCP Server

### Location

```
mcp/
  package.json
  tsconfig.json
  src/
    index.ts      ← entry point, stdio transport
    client.ts     ← thin fetch wrapper for the REST API
    tools/
      lists.ts
      items.ts
      prices.ts
```

### Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.x",
  "zod": "^3.x"
}
```

### Configuration

Two env vars consumed at startup:

```
API_BASE_URL=https://your-app.vercel.app
API_KEY=sml_...
```

### Tools

| Tool name | Input | What it does |
|-----------|-------|--------------|
| `list_lists` | — | Returns all user's lists |
| `create_list` | `name` | Creates a new list |
| `get_list` | `listId` | Returns list detail + items for current month |
| `rename_list` | `listId`, `name` | Renames a list |
| `delete_list` | `listId` | Deletes a list |
| `add_item` | `listId`, `name`, `quantity?`, `category?` | Adds an item |
| `toggle_item` | `listId`, `itemId`, `checked` | Checks/unchecks an item |
| `delete_item` | `listId`, `itemId` | Removes an item |
| `compare_prices` | `listId`, `items: string[]` | Returns prices from Coto, Disco, Carrefour |

### Transport

stdio — the standard transport for Claude Desktop and Claude.ai MCP integrations.

### Build

```json
// mcp/package.json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js"
}
```

---

## Phase 4 — Connecting to Claude

After running `npm run build` inside `mcp/`:

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supermarketlist": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://your-app.vercel.app",
        "API_KEY": "sml_..."
      }
    }
  }
}
```

**Claude.ai (web)** — add the MCP server via Settings → Integrations using the same URL + key.

---

## Phase 5 — Tests

Following the existing `lib/__tests__/` + vitest pattern:

- `lib/__tests__/api-auth.test.ts` — key hashing, valid/invalid key lookup, 401 responses
- `lib/__tests__/api-key-actions.test.ts` — create/delete key server actions
- `mcp/src/__tests__/tools.test.ts` — tool input validation (mocked fetch)

---

## File tree delta

```
prisma/schema.prisma                          ← add ApiKey model
prisma/migrations/<ts>_add_api_key/           ← new migration

lib/api-auth.ts                               ← withApiKey() middleware
lib/api-key-actions.ts                        ← createApiKey, deleteApiKey
lib/list-service.ts                           ← shared Prisma queries (extracted from actions)
lib/__tests__/api-auth.test.ts
lib/__tests__/api-key-actions.test.ts

app/settings/api-keys/page.tsx                ← settings UI

app/api/v1/me/route.ts
app/api/v1/lists/route.ts
app/api/v1/lists/[id]/route.ts
app/api/v1/lists/[id]/items/route.ts
app/api/v1/lists/[id]/items/[itemId]/route.ts
app/api/v1/lists/[id]/prices/route.ts

mcp/package.json
mcp/tsconfig.json
mcp/src/index.ts
mcp/src/client.ts
mcp/src/tools/lists.ts
mcp/src/tools/items.ts
mcp/src/tools/prices.ts
mcp/src/__tests__/tools.test.ts

proxy.ts                                      ← add /settings/api-keys to protectedRoutes
```

---

## Implementation order

1. Prisma schema + migration + Turso deploy
2. `lib/api-auth.ts` + tests
3. `lib/list-service.ts` (extract shared queries)
4. REST API routes (v1)
5. `lib/api-key-actions.ts` + settings page UI
6. MCP server (`mcp/`)
7. End-to-end smoke test: generate key → call API → connect MCP to Claude
