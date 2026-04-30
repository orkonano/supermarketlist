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
