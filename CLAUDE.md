@AGENTS.md

## Database

This project uses **SQLite locally** and **Turso (libSQL) in production**.

### Running migrations

`prisma migrate deploy` does NOT work with Turso — the Prisma migration engine does not support the `libsql://` scheme.

Use the custom script instead:

```bash
npm run migrate:turso
```

**Workflow:** after every `prisma migrate dev` (local), also run `npm run migrate:turso` to apply the migration to the Turso production database.

The script (`scripts/migrate-turso.ts`) connects via `@libsql/client`, maintains a `_prisma_migrations` tracking table, and applies any unapplied SQL files from `prisma/migrations/`.

Required env vars: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

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

## package-lock.json

Always commit `package-lock.json` alongside any `package.json` changes. The CI pipeline uses `npm ci`, which fails if the two files are out of sync.

After installing or removing packages, run:

```bash
npm install
git add package-lock.json
```
