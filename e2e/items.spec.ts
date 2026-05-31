import { test, expect } from "@playwright/test";

let listUrl: string;

test.beforeEach(async ({ page }) => {
  const listName = `Items E2E ${Date.now()}`;
  await page.goto("/lists/new");
  await page.fill('input[name="name"]', listName);
  await page.click('button:has-text("Crear")');
  await page.waitForURL(url => url.pathname !== "/lists/new");
  listUrl = page.url();
});

test("can add an item to a list", async ({ page }) => {
  await page.goto(listUrl);
  await page.click('button:has-text("Agregar producto")');
  await page.fill('input[placeholder="Nombre del producto *"]', "Leche");
  await page.click('button:has-text("Agregar")');
  await expect(page.locator("text=Leche")).toBeVisible();
  await expect(page.locator("text=Agregado por E2E Test User")).toBeVisible();
});

test("can toggle an item as checked", async ({ page }) => {
  await page.goto(listUrl);
  await page.click('button:has-text("Agregar producto")');
  await page.fill('input[placeholder="Nombre del producto *"]', "Pan");
  await page.click('button:has-text("Agregar")');
  await expect(page.locator("li").filter({ hasText: "Agregado por" }).filter({ hasText: "Pan" })).toBeVisible();

  await page.click('button[aria-label="Marcar producto"]');
  await expect(page.locator('button[aria-label="Desmarcar producto"]')).toBeVisible();
  await expect(page.locator("span.line-through", { hasText: "Pan" })).toBeVisible();
});

test("can delete an item", async ({ page }) => {
  await page.goto(listUrl);
  await page.click('button:has-text("Agregar producto")');
  await page.fill('input[placeholder="Nombre del producto *"]', "Azúcar");
  await page.click('button:has-text("Agregar")');
  await expect(page.locator("text=Azúcar")).toBeVisible();

  const item = page.locator("li", { hasText: "Azúcar" });
  await item.hover();
  await item.locator('button[aria-label="Eliminar producto"]').click({ force: true });
  await expect(
    page.locator("li").filter({ has: page.locator('button[aria-label="Eliminar producto"]') }).filter({ hasText: "Azúcar" })
  ).toHaveCount(0);
});
