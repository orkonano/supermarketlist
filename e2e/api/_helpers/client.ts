import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import path from "path";

export const BASE_URL = "http://localhost:3000";

// The libSQL testcontainer host port, fixed in playwright.config.ts:22 / e2e/global-setup.ts.
export const DB_URL = "http://localhost:18080";

type SeededKey = { rawKey: string; keyId: string; userId: string };

/**
 * Reads the API key seeded by global-setup. Called lazily from inside tests/hooks —
 * never at module load time (spec files are imported before globalSetup runs).
 */
export function readSeededKey(): SeededKey {
  try {
    return JSON.parse(
      readFileSync(path.join(process.cwd(), "e2e/.auth/api-key.json"), "utf-8")
    ) as SeededKey;
  } catch {
    throw new Error(
      "e2e/.auth/api-key.json not found — did globalSetup run? Check that E2E_TEST_PASSWORD is set."
    );
  }
}

/**
 * A Playwright request context that sends `Authorization: Bearer <key>` on every call.
 * Pass an explicit key (e.g. a bogus one) to exercise the auth negatives.
 */
export function newApiContext(key?: string): Promise<APIRequestContext> {
  const bearer = key ?? readSeededKey().rawKey;
  return pwRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${bearer}` },
  });
}

/** A raw libSQL client against the same testcontainer, for asserting real DB mutations. */
export function dbClient(): Client {
  return createClient({ url: DB_URL });
}
