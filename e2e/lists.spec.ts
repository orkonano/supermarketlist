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
