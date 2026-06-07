import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import * as path from "path";

function getTestUser() {
  try {
    return JSON.parse(
      readFileSync(path.join(process.cwd(), "e2e/.auth/test-user.json"), "utf-8")
    ) as { email: string; id: string };
  } catch {
    throw new Error(
      "e2e/.auth/test-user.json not found — did globalSetup run? Check that E2E_TEST_PASSWORD is set."
    );
  }
}

const password = process.env.E2E_TEST_PASSWORD ?? "";

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
    const errorMsg = page.locator('[data-testid="form-error"]');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText("Correo electrónico o contraseña incorrectos.");
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
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("email verified — no verification banner shown", async ({ page }) => {
    await page.goto("/lists");
    await expect(page.locator("text=Revisá tu correo")).not.toBeVisible();
    await expect(page.locator("h1")).toContainText("Mis listas");
  });
});
