import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error("TURSO_DATABASE_URL is not set.");

  const client = createClient({ url, authToken });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id                TEXT PRIMARY KEY,
      checksum          TEXT NOT NULL,
      finished_at       DATETIME,
      migration_name    TEXT NOT NULL UNIQUE,
      logs              TEXT,
      rolled_back_at    DATETIME,
      started_at        DATETIME NOT NULL DEFAULT current_timestamp,
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  const migrationsDir = join(process.cwd(), "prisma/migrations");
  const dirs = readdirSync(migrationsDir)
    .filter((d) => d !== "migration_lock.toml")
    .sort();

  for (const dir of dirs) {
    const existing = await client.execute({
      sql: "SELECT id FROM _prisma_migrations WHERE migration_name = ?",
      args: [dir],
    });
    if (existing.rows.length > 0) {
      console.log(`  skip  ${dir}`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, dir, "migration.sql"), "utf-8");
    console.log(`  apply ${dir}`);
    await client.executeMultiple(sql);

    await client.execute({
      sql: `INSERT INTO _prisma_migrations
              (id, checksum, migration_name, finished_at, applied_steps_count)
            VALUES (?, ?, ?, datetime('now'), 1)`,
      args: [randomUUID(), dir, dir],
    });
  }

  console.log("Done.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
