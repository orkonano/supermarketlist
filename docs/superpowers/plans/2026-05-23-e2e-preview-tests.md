# E2E Preview Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Playwright E2E test suite covering auth, lists, and items flows. Runs locally and in GitHub Actions CI using a libSQL testcontainer — no Turso credentials needed anywhere.

**Architecture:** `globalSetup` spins up a `ghcr.io/tursodatabase/libsql-server` container, runs migrations against it, and creates a test user with `emailVerified = true` via direct SQL. It sets `process.env.TURSO_DATABASE_URL` to the container URL so Playwright's `webServer` passes it to the Next.js dev server at startup. Because the webServer isn't running during `globalSetup`, a dedicated Playwright **setup project** (`auth.setup.ts`) handles the browser login and saves `storageState` — it runs after the webServer is up, before the test projects. `globalTeardown` stops the container (data destroyed automatically). No Turso credentials or preview URLs are needed in CI.

**Tech Stack:** `@playwright/test`, `testcontainers` (new), `@libsql/client` (already installed), `bcryptjs` (already installed), GitHub Actions.

---

## File Map

| Path | Action | Purpose |
|---|---|---|
| `playwright.config.ts` | Create | Two projects: `setup` (login) + `chromium` (tests with auth state); webServer passes container URL |
| `e2e/global-setup.ts` | Create | Starts libSQL container, runs migrations, creates test user, writes `test-user.json` |
| `e2e/global-teardown.ts` | Create | Stops the container |
| `e2e/auth.setup.ts` | Create | Playwright setup project — logs in, saves `storageState` to `e2e/.auth/user.json` |
| `e2e/auth.spec.ts` | Create | Redirect, login, wrong password, logout |
| `e2e/lists.spec.ts` | Create | View lists page, create list, delete list |
| `e2e/items.spec.ts` | Create | Add item, toggle item, delete item |
| `package.json` | Modify | Add `@playwright/test` + `testcontainers` devDeps; add `test:e2e` / `test:e2e:ui` scripts |
| `.gitignore` | Modify | Add `e2e/.auth/`, `playwright-report/`, `test-results/` |
| `.github/workflows/e2e.yml` | Create | Runs on PR and push to main; Docker pre-installed on `ubuntu-latest` |

---

## Task 1: Install packages and create `playwright.config.ts`

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `playwright.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install -D @playwright/test testcontainers
```

Run `npm install` after to update `package-lock.json`.

- [ ] **Step 2: Add scripts to `package.json`**

In the `"scripts"` block, add after `"test:watch"`:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    env: {
      // globalSetup sets this before the webServer starts
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
```

- [ ] **Step 4: Add entries to `.gitignore`**

Append to `.gitignore`:

```
# playwright
/e2e/.auth/
/playwright-report/
/test-results/
```

- [ ] **Step 5: Install the Playwright Chromium binary**

```bash
npx playwright install chromium
```

Expected: downloads Chromium, no errors.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts package.json package-lock.json .gitignore
git commit -m "chore: install Playwright + testcontainers and add playwright.config.ts"
```

---

## Task 2: Global setup and teardown

**Files:**
- Create: `e2e/global-setup.ts`
- Create: `e2e/global-teardown.ts`

`globalSetup` runs before the webServer. It:
1. Starts a `ghcr.io/tursodatabase/libsql-server` container on port 8080
2. Sets `process.env.TURSO_DATABASE_URL` — the webServer inherits this when Playwright starts Next.js
3. Runs migrations against the container via the existing `migrate-turso` script
4. Creates a test user with `emailVerified = 1` via direct SQL (no email workflow triggered)
5. Writes `{email, id}` to `e2e/.auth/test-user.json` for `auth.setup.ts` to read
6. Stores the container reference on `globalThis` for teardown

`globalTeardown` stops the container. All data is gone with it — no explicit user cleanup needed.

**Required env var:**
- `E2E_TEST_PASSWORD` — any string ≥ 8 chars; hashed into the DB, used to log in during the setup project

- [ ] **Step 1: Create `e2e/global-setup.ts`**

```typescript
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
    .withExposedPorts(8080)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const dbUrl = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
  process.env.TURSO_DATABASE_URL = dbUrl;
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
```

- [ ] **Step 2: Create `e2e/global-teardown.ts`**

```typescript
export default async function globalTeardown() {
  const container = (globalThis as any).__DB_CONTAINER__;
  if (container) await container.stop();
}
```

- [ ] **Step 3: Commit**

```bash
git add e2e/global-setup.ts e2e/global-teardown.ts
git commit -m "chore(e2e): global setup starts libSQL testcontainer and seeds test user"
```

---

## Task 3: Auth setup project (browser login)

**Files:**
- Create: `e2e/auth.setup.ts`

This is a Playwright **setup project** — it runs after the webServer is up but before any test project. It logs in with the test user and saves the session cookie to `e2e/.auth/user.json`. The `chromium` project then uses this file as its `storageState` so no test needs to log in manually.

- [ ] **Step 1: Create `e2e/auth.setup.ts`**

```typescript
import { test as setup } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";

setup("authenticate", async ({ page }) => {
  const { email } = JSON.parse(
    readFileSync(path.join(process.cwd(), "e2e/.auth/test-user.json"), "utf-8")
  ) as { email: string; id: string };

  const password = process.env.E2E_TEST_PASSWORD!;

  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/lists");
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/auth.setup.ts
git commit -m "chore(e2e): add auth setup project — logs in and saves storageState"
```

---

## Task 4: Auth E2E tests

**Files:**
- Create: `e2e/auth.spec.ts`

Covers: unauthenticated redirect, wrong password error, successful login, logout. The unauthenticated describe block overrides `storageState` to empty — the `chromium` project sets it by default, so we must explicitly clear it for tests that must start logged out.

- [ ] **Step 1: Create `e2e/auth.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";

function getTestUser() {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "e2e/.auth/test-user.json"), "utf-8")
  ) as { email: string; id: string };
}

const password = process.env.E2E_TEST_PASSWORD!;

test.describe("unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("visiting /lists redirects to /login", async ({ page }) => {
    await page.goto("/lists");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login with wrong password shows error", async ({ page }) => {
    const { email } = getTestUser();
    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", "wrong-password");
    await page.click('button[type="submit"]');
    await expect(page.locator("p.text-red-600")).toContainText(
      "Correo electrónico o contraseña incorrectos."
    );
  });

  test("login with correct credentials lands on /lists", async ({ page }) => {
    const { email } = getTestUser();
    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/lists$/);
    await expect(page.locator("h1")).toContainText("Mis listas");
  });
});

test.describe("authenticated", () => {
  test("can log out", async ({ page }) => {
    await page.goto("/lists");
    await page.click('button:has-text("Cerrar sesión")');
    await expect(page).toHaveURL(/\/login/);
  });

  test("email verified — no verification banner shown", async ({ page }) => {
    await page.goto("/lists");
    await expect(page.locator("text=Revisá tu correo")).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run auth tests**

```bash
E2E_TEST_PASSWORD=TestPassword123 npm run test:e2e -- --project=setup --project=chromium e2e/auth.spec.ts
```

Expected: setup project runs first (login), then 5 auth tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test(e2e): add auth E2E tests — redirect, login, wrong password, logout"
```

---

## Task 5: Lists E2E tests

**Files:**
- Create: `e2e/lists.spec.ts`

All tests inherit the `storageState` from the `chromium` project — they start already logged in.

- [ ] **Step 1: Create `e2e/lists.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("lists page shows heading and user greeting", async ({ page }) => {
  await page.goto("/lists");
  await expect(page.locator("h1")).toContainText("Mis listas");
  await expect(page.locator("text=Hola, E2E Test User")).toBeVisible();
});

test("can create a new list", async ({ page }) => {
  const listName = `Lista E2E ${Date.now()}`;
  await page.goto("/lists/new");
  await page.fill('input[name="name"]', listName);
  await page.click('button:has-text("Crear")');
  await expect(page).toHaveURL(/\/lists\/.+/);
  await expect(page.locator("h1")).toContainText(listName);
});

test("created list appears on /lists and can be deleted", async ({ page }) => {
  const listName = `Lista E2E Delete ${Date.now()}`;

  await page.goto("/lists/new");
  await page.fill('input[name="name"]', listName);
  await page.click('button:has-text("Crear")');
  await expect(page).toHaveURL(/\/lists\/.+/);

  await page.goto("/lists");
  await expect(page.locator(`text=${listName}`)).toBeVisible();

  const listCard = page.locator("div.bg-white.rounded-2xl", {
    has: page.locator(`text=${listName}`),
  });
  await listCard.locator('button:has-text("Eliminar")').click();
  await expect(page.locator(`text=${listName}`)).not.toBeVisible();
});
```

- [ ] **Step 2: Run lists tests**

```bash
E2E_TEST_PASSWORD=TestPassword123 npm run test:e2e -- e2e/lists.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/lists.spec.ts
git commit -m "test(e2e): add lists E2E tests — view, create, delete"
```

---

## Task 6: Items E2E tests

**Files:**
- Create: `e2e/items.spec.ts`

Each test creates a fresh list in `beforeEach`. The delete button is `opacity-0` until hover — use `{ force: true }` on the click.

- [ ] **Step 1: Create `e2e/items.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

let listUrl: string;

test.beforeEach(async ({ page }) => {
  const listName = `Items E2E ${Date.now()}`;
  await page.goto("/lists/new");
  await page.fill('input[name="name"]', listName);
  await page.click('button:has-text("Crear")');
  await page.waitForURL(/\/lists\/.+/);
  listUrl = page.url();
});

test("can add an item to a list", async ({ page }) => {
  await page.goto(listUrl);
  await page.click('button:has-text("Agregar producto")');
  await page.fill('input[placeholder="Nombre del producto *"]', "Leche");
  await page.fill('input[placeholder="Tu nombre *"]', "E2E");
  await page.click('button:has-text("Agregar")');
  await expect(page.locator("text=Leche")).toBeVisible();
  await expect(page.locator("text=Agregado por E2E")).toBeVisible();
});

test("can toggle an item as checked", async ({ page }) => {
  await page.goto(listUrl);
  await page.click('button:has-text("Agregar producto")');
  await page.fill('input[placeholder="Nombre del producto *"]', "Pan");
  await page.fill('input[placeholder="Tu nombre *"]', "E2E");
  await page.click('button:has-text("Agregar")');
  await expect(page.locator("text=Pan")).toBeVisible();

  await page.click('button[aria-label="Marcar producto"]');
  await expect(page.locator('button[aria-label="Desmarcar producto"]')).toBeVisible();
  await expect(page.locator("span.line-through", { hasText: "Pan" })).toBeVisible();
});

test("can delete an item", async ({ page }) => {
  await page.goto(listUrl);
  await page.click('button:has-text("Agregar producto")');
  await page.fill('input[placeholder="Nombre del producto *"]', "Azúcar");
  await page.fill('input[placeholder="Tu nombre *"]', "E2E");
  await page.click('button:has-text("Agregar")');
  await expect(page.locator("text=Azúcar")).toBeVisible();

  const item = page.locator("li", { hasText: "Azúcar" });
  await item.hover();
  await item.locator('button[aria-label="Eliminar producto"]').click({ force: true });
  await expect(page.locator("text=Azúcar")).not.toBeVisible();
});
```

- [ ] **Step 2: Run items tests**

```bash
E2E_TEST_PASSWORD=TestPassword123 npm run test:e2e -- e2e/items.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Run full suite**

```bash
E2E_TEST_PASSWORD=TestPassword123 npm run test:e2e
```

Expected: setup project runs once, then 11 tests pass across auth/lists/items, then container stops.

- [ ] **Step 4: Commit**

```bash
git add e2e/items.spec.ts
git commit -m "test(e2e): add items E2E tests — add, toggle, delete"
```

---

## Task 7: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

`ubuntu-latest` has Docker pre-installed. The container is started inside the job — no Turso credentials, no deployment URL, no special secrets beyond `E2E_TEST_PASSWORD`.

**GitHub Secrets required** (add once in repo Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `E2E_TEST_PASSWORD` | Any string ≥ 8 chars. Pick one and store it. Never needs to change. |

- [ ] **Step 1: Create `.github/workflows/e2e.yml`**

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

```bash
npx js-yaml .github/workflows/e2e.yml > /dev/null && echo "valid"
```

Expected: `valid`.

- [ ] **Step 3: Confirm existing unit tests still pass**

```bash
npm test
```

Expected: all Vitest tests pass. Playwright lives in a separate command and doesn't interfere.

- [ ] **Step 4: Run `npx tsc --noEmit`**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: add E2E workflow — testcontainer + Playwright on every PR and main push"
```

---

## Self-review

**Spec coverage:**
- ✅ No Turso credentials in GitHub Actions → testcontainer is the DB
- ✅ DB URL configured at startup, not via endpoint → `process.env.TURSO_DATABASE_URL` set in globalSetup, passed to webServer via `env:`
- ✅ Email verification bypassed → `emailVerified = 1` in direct SQL INSERT
- ✅ Fresh DB per run → new container per run, destroyed on teardown
- ✅ Auth state shared across tests → setup project logs in, saves `storageState`
- ✅ Unauthenticated tests clear storageState → `test.use({ storageState: { cookies: [], origins: [] } })`
- ✅ Auth: redirect, login, wrong password, logout
- ✅ Lists: view, create, delete
- ✅ Items: add, toggle, delete
- ✅ CI: Docker pre-installed on ubuntu-latest, single secret only

**Note on preview/prod smoke tests:** This suite tests the app code + DB together on every PR. If you also want to verify that a specific Vercel deployment's env vars and migration ran correctly, a separate lightweight smoke test workflow triggered by `deployment_status` (hitting the preview URL with a persistent test user) can sit alongside this one. That's a separate plan.
