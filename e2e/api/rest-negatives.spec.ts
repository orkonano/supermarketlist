import { test, expect, request as pwRequest } from "@playwright/test";
import { BASE_URL, newApiContext } from "./_helpers/client";

const UNAUTHORIZED = { error: "No autorizado" };

test("no Authorization header → 401", async () => {
  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
  const res = await ctx.get("/api/v1/me");
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual(UNAUTHORIZED);
  await ctx.dispose();
});

test("bogus bearer key → 401", async () => {
  const ctx = await newApiContext("sml_bogus");
  const res = await ctx.get("/api/v1/me");
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual(UNAUTHORIZED);
  await ctx.dispose();
});

test("GET nonexistent list → 404", async () => {
  const api = await newApiContext();
  // serviceGetList returns null for an unknown id → route maps to 404.
  const res = await api.get("/api/v1/lists/cl00000000000000000000000");
  expect(res.status()).toBe(404);
  await api.dispose();
});

test("cross-list item mutation → 404 (P2025 caught — see #40)", async () => {
  const api = await newApiContext();

  // Two lists owned by the same user; an item that lives in list B.
  const listA = await (await api.post("/api/v1/lists", { data: { name: `A ${Date.now()}` } })).json();
  const listB = await (await api.post("/api/v1/lists", { data: { name: `B ${Date.now()}` } })).json();
  const itemB = await (
    await api.post(`/api/v1/lists/${listB.id}/items`, { data: { name: "Solo en B" } })
  ).json();

  // Target itemB through list A's path. serviceDeleteListItem uses a compound
  // `where: { id: itemId, listId }`, so this matches no row and Prisma throws P2025.
  //
  // DECISION POINT (resolved): the integration-tests plan flagged this as possibly
  // surfacing as an uncaught 500. It no longer does — commit #40 wrapped the three item
  // mutations in `runScopedItemMutation` (lib/list-service.ts), which catches P2025 and
  // throws ServiceError(404, ITEM_NOT_FOUND). 404 is therefore the current contract.
  const res = await api.delete(`/api/v1/lists/${listA.id}/items/${itemB.id}`);
  expect(res.status()).toBe(404);

  // itemB must still exist in list B (the cross-list delete was a no-op).
  const stillThere = await api.delete(`/api/v1/lists/${listB.id}/items/${itemB.id}`);
  expect(stillThere.status()).toBe(204);

  await api.delete(`/api/v1/lists/${listA.id}`);
  await api.delete(`/api/v1/lists/${listB.id}`);
  await api.dispose();
});
