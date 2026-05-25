import { test as setup } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";

setup("authenticate", async ({ page }) => {
  let email: string;
  try {
    ({ email } = JSON.parse(
      readFileSync(path.join(process.cwd(), "e2e/.auth/test-user.json"), "utf-8")
    ) as { email: string; id: string });
  } catch {
    throw new Error(
      "e2e/.auth/test-user.json not found — did globalSetup run? Check that E2E_TEST_PASSWORD is set."
    );
  }

  const password = process.env.E2E_TEST_PASSWORD;
  if (!password) throw new Error("E2E_TEST_PASSWORD environment variable is not set");

  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/lists");
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
