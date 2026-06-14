import { test, expect } from "@playwright/test";

let listUrl: string;

test.beforeEach(async ({ page }) => {
  const listName = `Prices E2E ${Date.now()}`;
  await page.goto("/lists/new");
  await page.fill('input[name="name"]', listName);
  await page.click('button:has-text("Crear")');
  await page.waitForURL((url) => url.pathname !== "/lists/new");
  listUrl = page.url();
});

test("clicking Actualizar issues a bounded number of list-route requests", async ({ page }) => {
  await page.goto(listUrl);

  // The price comparison panel only renders once the list has at least one item.
  await page.click('button:has-text("Agregar producto")');
  await page.fill('input[placeholder="Nombre del producto *"]', "Leche");
  await page.click('button:has-text("Agregar")');
  await expect(page.locator("text=Comparación de precios")).toBeVisible();

  // Wait for the initial price load to settle — the button flips back from
  // "Actualizando..." to "Actualizar" (exact match so it doesn't match the loading text).
  const refresh = page.getByRole("button", { name: "Actualizar", exact: true });
  await expect(refresh).toBeEnabled({ timeout: 30_000 });

  // Count only the requests caused by the click below.
  let listPosts = 0;
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().startsWith(listUrl)) listPosts++;
  });

  await refresh.click();
  await page.waitForTimeout(2_000);

  // A single Server Action POST is expected. Before the fix, the fetch -> revalidate ->
  // refetch loop fired many requests against the list route.
  expect(listPosts).toBeLessThanOrEqual(1);
});
