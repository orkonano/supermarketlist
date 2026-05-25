import { GenericContainer, Wait } from "testcontainers";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { mkdirSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { randomUUID } from "crypto";
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

  mkdirSync(path.join(process.cwd(), "e2e/.auth"), { recursive: true });
  writeFileSync(
    path.join(process.cwd(), "e2e/.auth/test-user.json"),
    JSON.stringify({ email, id })
  );

  (globalThis as any).__DB_CONTAINER__ = container;
  console.log("Testcontainer ready:", dbUrl);
}
