import { GenericContainer, Wait } from "testcontainers";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { mkdirSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { randomUUID, randomBytes, createHash } from "crypto";
import path from "path";

export default async function globalSetup() {
  const password = process.env.E2E_TEST_PASSWORD;
  if (!password) throw new Error("E2E_TEST_PASSWORD is required");

  console.log("Starting libSQL testcontainer...");
  const container = await new GenericContainer("ghcr.io/tursodatabase/libsql-server:latest")
    .withExposedPorts({ container: 8080, host: 18080 })
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const dbUrl = "http://localhost:18080";
  delete process.env.TURSO_AUTH_TOKEN;

  console.log("Running migrations...");
  execSync("tsx scripts/migrate-turso.ts", {
    env: { ...process.env, TURSO_DATABASE_URL: dbUrl },
    stdio: "inherit",
  });

  const email = `e2e-${Date.now()}@test.local`;
  const id = randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);

  const client = createClient({ url: dbUrl });
  await client.execute({
    sql: `INSERT INTO "User" (id, name, email, hashedPassword, emailVerified, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    args: [id, "E2E Test User", email, hashedPassword],
  });

  // Seed an API key for the REST + MCP integration suite (e2e/api/*).
  // The DB stores only the SHA-256 hash; the raw key exists nowhere else, so it must be
  // persisted to e2e/.auth/api-key.json for the specs to read.
  const rawKey = "sml_" + randomBytes(32).toString("hex"); // matches lib/api-key-actions.ts:21
  const keyHash = createHash("sha256").update(rawKey).digest("hex"); // matches lib/api-auth.ts:19
  const keyId = randomUUID();
  await client.execute({
    sql: `INSERT INTO "ApiKey" (id, keyHash, name, userId, createdAt)
          VALUES (?, ?, ?, ?, datetime('now'))`,
    args: [keyId, keyHash, "e2e-api-key", id],
  });

  mkdirSync(path.join(process.cwd(), "e2e/.auth"), { recursive: true });
  writeFileSync(
    path.join(process.cwd(), "e2e/.auth/test-user.json"),
    JSON.stringify({ email, id })
  );
  writeFileSync(
    path.join(process.cwd(), "e2e/.auth/api-key.json"),
    JSON.stringify({ rawKey, keyId, userId: id })
  );

  (globalThis as any).__DB_CONTAINER__ = container;
  console.log("Testcontainer ready:", dbUrl);
}
