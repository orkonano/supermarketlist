@AGENTS.md

## Git Flow — branch first, always

**Before touching any file**, check the current branch:

```bash
git branch --show-current
```

If the result is `main`, invoke the `git-flow-branch-creator` skill immediately and switch to the appropriate branch. Only then begin reading or editing files.

This applies to every task — features, fixes, docs, README updates, landing page tweaks. No exceptions.

## Database

This project uses **SQLite locally** and **Turso (libSQL) in production**.

### Local vs production databases

Local development uses SQLite (`prisma/dev.db`). **Do not set `TURSO_DATABASE_URL` in `.env`** — doing so connects local dev directly to the production Turso database and risks data loss when running migrations or any destructive local operation.

Vercel production connects to Turso via env vars set in the Vercel dashboard only.

### Setting up the local database

On a fresh clone (or after deleting `dev.db`):

```bash
npm run migrate:local
```

This runs the same migration script as production but targets the local SQLite file. `prisma migrate deploy` does NOT work here because the schema has no `url` field — the URL is managed entirely by `prisma.config.ts` and the Prisma CLI rejects `file:` URLs in that context.

### Running migrations

For production (Turso), use the custom script:

```bash
npm run migrate:turso
```

**Workflow:** after every `prisma migrate dev` (local), also run `npm run migrate:turso` to apply the migration to the Turso production database. The script is also part of the Vercel build command and runs on every deployment — it exits cleanly when `TURSO_DATABASE_URL` is not set (i.e., locally).

The script (`scripts/migrate-turso.ts`) connects via `@libsql/client`, maintains a `_prisma_migrations` tracking table, and applies any unapplied SQL files from `prisma/migrations/`.

Required env vars: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (production/Vercel only).

### Running `prisma migrate dev` locally

`prisma.config.ts` uses `TURSO_DATABASE_URL ?? DATABASE_URL`. Since `TURSO_DATABASE_URL` is not set in `.env` locally, `prisma migrate dev` targets the local SQLite automatically — no workaround needed:

```bash
npx prisma migrate dev --name <name>
npm run migrate:turso   # apply the new migration to Turso production
```

If you ever need to resync the local SQLite (e.g. after pulling a branch with new migrations), run `npm run migrate:local`.

### Prisma type imports

Always import Prisma model types from `app/generated/prisma/client`, not from the bare `app/generated/prisma` directory — there is no `index.ts`, so the Next.js build worker cannot resolve the directory import.

```ts
// correct
import type { User } from "@/app/generated/prisma/client";

// wrong — causes build failure
import type { User } from "@/app/generated/prisma";
```

### Manual data migrations

When adding a NOT NULL column to an existing table in SQLite, Prisma's generated INSERT omits the new column and fails the NOT NULL constraint. Add data migration steps **before** the `RedefineTables` block in the migration SQL:

```sql
-- populate new table first
INSERT INTO "NewTable" (...) SELECT ... FROM "OldTable";
-- then Prisma's RedefineTables block
PRAGMA defer_foreign_keys=ON; ...
```

## Auth middleware

The auth/routing middleware lives in **`proxy.ts`** (repo root), not `middleware.ts`. The `withWorkflow` wrapper in `next.config.ts` registers it automatically.

`proxy.ts` controls two arrays:
- `protectedRoutes` — unauthenticated visitors are redirected to `/login`
- `publicRoutes` — authenticated users are redirected **away** to `/lists`

Routes accessible to everyone (logged-in or not) must be in **neither** array — the middleware passes them through. Only add a route to `publicRoutes` if a logged-in user should be bounced away from it (e.g. `/login`, `/signup`). Adding `/docs` or similar pages to `publicRoutes` would silently redirect authenticated users away from them.

## Base URL

The app's public URL is `process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"`. Use this pattern everywhere a full URL is needed (emails, OpenAPI spec, MCP snippets). The env var is intentionally absent from `.env` — local dev always falls back to `localhost:3000`.

## Git commit signing (GPG)

This repo uses GPG-signed commits. In every new terminal session, run this before committing:

```bash
export GPG_TTY=$(tty)
```

Without it, GPG fails with `Inappropriate ioctl for device` and the commit is aborted.

## CI

The GitHub Actions workflow uses Node 24, which ships with npm 11. This must match the local npm version used to generate `package-lock.json`. If they diverge, `npm ci` will fail.

## Vercel environment variables

These env vars must be set manually in **Vercel → Settings → Environment Variables**:

| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | JWT signing secret — run `openssl rand -base64 32` to generate |
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |

**Note:** this project uses a custom JWT session via `jose`, NOT NextAuth. The session secret is `SESSION_SECRET`, not `NEXTAUTH_SECRET`.

## Native addons and Turbopack

Packages that include native `.node` binaries (e.g. `@napi-rs/keyring`, pulled in by the Workflow runtime) cannot be bundled by Turbopack or webpack. They must be listed in `serverExternalPackages` in `next.config.ts`:

```ts
serverExternalPackages: [
  "@napi-rs/keyring",
  "@vercel/oidc",
  "@vercel/queue",
  "@workflow/world-vercel",
],
```

## Workflow bundle is generated — never commit it

`app/.well-known/workflow/v1/flow/route.js` is a **generated** snapshot of the `workflows/` source, produced by `withWorkflow` at `npm run build`. It is gitignored via `app/.well-known/workflow/v1/.gitignore` (a bare `*`), so `git add` on it fails with "The following paths are ignored by one of your .gitignore files".

- Never commit it, and never edit it directly to silence a lint warning — it is overwritten on the next build.
- After changing any `workflows/*.ts` signature (e.g. switching positional params to an options object), the on-disk bundle is **stale** until you run `npm run build`. Vercel regenerates it on deploy.

## package-lock.json

Always commit `package-lock.json` alongside any `package.json` changes. The CI pipeline uses `npm ci`, which fails if the two files are out of sync.

After installing or removing packages, run:

```bash
npm install
git add package-lock.json
```

## Locale — Spanish (Argentino) with vos

All customer-facing UI, error messages, validation text, and emails must be in **Argentine Spanish** using the **vos** register. Never use tuteo or neutral Spanish.

Key forms:
- "Iniciá sesión" (not "Inicia sesión")
- "Creá tu cuenta" (not "Crea tu cuenta")
- "Hacé clic" (not "Haz clic")
- "Revisá tu correo" (not "Revisa tu correo")
- "Tenés" / "No tenés" (not "Tienes")
- "Registrate" (not "Regístrate")

Apply this to any new string from the start — do not write it in English or neutral Spanish first.

## ESLint clean-code rules

The config (`eslint.config.mjs`) enforces `sonarjs` plus `max-lines-per-function` (50), `complexity` (10), and `max-params` (4) as **warnings**.

`sonarjs/no-duplicate-string` (threshold 3) counts occurrences **across a whole file, not per function**. Extracting repeated JSX into a sub-component *in the same file* shrinks the function (helps `max-lines-per-function`) but does **not** clear a dup-string warning — the literals (e.g. CSS tokens like `"var(--border)"`) are still in the file. To clear it, either:

- extract the sub-component into a **separate file** (the literals physically leave the original file), or
- hoist the repeated literal to a **module-level `const`** (e.g. `const BORDER = "var(--border)"`).

## Testing

Run `npm test` after every change — no exceptions.

Also run `npx tsc --noEmit` before every push. Vitest runs code but does not type-check it, so type errors that would fail the Vercel build (e.g. `string | undefined` passed to `encodeURIComponent`) pass tests locally without complaint.

### TypeScript 5.9+ array index access

`arr[n]` on a non-`as const` array whose type is inferred from an object literal can resolve as `T | undefined` (TS2532) even without `noUncheckedIndexedAccess`. This affects test fixture code written before the version bump. Fix with `!` assertions at the access site (`arr[0]!.prop`). Before assuming a new change introduced the error, run `git stash && npx tsc --noEmit` to check whether it was already there.

When adding a new feature, add tests for it in the same PR. Tests live in `lib/__tests__/` and follow the existing vitest + mock pattern.

When existing tests fail after a change, determine the cause before touching anything:
- **Regression** — the change broke behaviour that should still work. Fix the code, not the test.
- **Intentional behaviour change** — the feature was deliberately altered and the test no longer reflects the new contract. Update the test to match the new behaviour and add a comment explaining what changed and why.

Never delete or skip a failing test to make CI green without understanding why it failed.

## Testing & Verification

**CSS/visual changes (hover states, styling) cannot be verified by tsc/lint/tests** — they
never evaluate `:hover`, focus, or rendered appearance. Confirm visually (or ask the user to
confirm) before claiming a styling fix is complete, and enumerate every affected page rather
than trusting a green test run.

**TypeScript type errors can pass Vitest but still fail Vercel's `tsc` build.** Vitest runs
code without type-checking it, so errors like `string | undefined` passed to
`encodeURIComponent` slip past green tests. Always run `npx tsc --noEmit` before considering
a TypeScript change complete.

## next/dynamic with ssr: false in Server Components

`ssr: false` is forbidden inside a Server Component — Next.js throws a hard compile error. When a Server Component needs to lazy-load a client-heavy component without SSR, extract the `dynamic(...)` call into a thin `"use client"` wrapper:

```tsx
// PriceComparisonLazy.tsx
"use client";
import dynamic from "next/dynamic";

const Heavy = dynamic(() => import("./Heavy"), { ssr: false });
export default function HeavyLazy(props) { return <Heavy {...props} />; }
```

Import the wrapper from the Server Component. The `ssr: false` stays inside the Client Component boundary where it belongs.

## Error surfacing pattern

When a server action fails during a flow that ends in a redirect, surface the error via:

```ts
redirect(`/lists?error=${encodeURIComponent(message)}`);
```

The `/lists` page already reads `searchParams.error` and renders a red banner — no additional UI work is needed. Check the destination page first; if it does not handle `params.error`, add the banner there too.