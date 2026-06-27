import { test, expect, type APIRequestContext } from "@playwright/test";
import { newApiContext } from "./_helpers/client";

test.describe("REST API v1 — happy path", () => {
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await newApiContext();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test("full list + item CRUD lifecycle", async () => {
    // GET /api/v1/me → 200 {id,name,email}
    const me = await api.get("/api/v1/me");
    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
    });

    // POST /api/v1/lists {name} → 201, capture listId
    const listName = `API List ${Date.now()}`;
    const createRes = await api.post("/api/v1/lists", { data: { name: listName } });
    expect(createRes.status()).toBe(201);
    const list = await createRes.json();
    const listId: string = list.id;
    expect(listId).toBeTruthy();
    expect(list.name).toBe(listName);

    // GET /api/v1/lists → 200 array includes listId
    const listsRes = await api.get("/api/v1/lists");
    expect(listsRes.status()).toBe(200);
    const lists = await listsRes.json();
    expect(lists.some((l: { id: string }) => l.id === listId)).toBe(true);

    // GET /api/v1/lists/{listId} → 200
    const oneRes = await api.get(`/api/v1/lists/${listId}`);
    expect(oneRes.status()).toBe(200);
    expect((await oneRes.json()).id).toBe(listId);

    // PATCH /api/v1/lists/{listId} {name} → 200 {ok:true}
    const renameRes = await api.patch(`/api/v1/lists/${listId}`, {
      data: { name: `${listName} (renamed)` },
    });
    expect(renameRes.status()).toBe(200);
    expect(await renameRes.json()).toEqual({ ok: true });

    // POST /api/v1/lists/{listId}/items {name} → 201, capture itemId
    const itemRes = await api.post(`/api/v1/lists/${listId}/items`, { data: { name: "Leche" } });
    expect(itemRes.status()).toBe(201);
    const item = await itemRes.json();
    const itemId: string = item.id;
    expect(itemId).toBeTruthy();
    expect(item.checked).toBe(false);

    // GET /api/v1/lists/{listId}/items?month&year → 200 includes itemId (current month)
    const now = new Date();
    const itemsRes = await api.get(
      `/api/v1/lists/${listId}/items?month=${now.getMonth() + 1}&year=${now.getFullYear()}`
    );
    expect(itemsRes.status()).toBe(200);
    const items = await itemsRes.json();
    expect(items.some((i: { id: string }) => i.id === itemId)).toBe(true);

    // PATCH .../items/{itemId} {checked:true} → 200, item.checked === true
    const toggleRes = await api.patch(`/api/v1/lists/${listId}/items/${itemId}`, {
      data: { checked: true },
    });
    expect(toggleRes.status()).toBe(200);
    expect((await toggleRes.json()).checked).toBe(true);

    // DELETE .../items/{itemId} → 204
    const delItemRes = await api.delete(`/api/v1/lists/${listId}/items/${itemId}`);
    expect(delItemRes.status()).toBe(204);

    // DELETE /api/v1/lists/{listId} → 204
    const delListRes = await api.delete(`/api/v1/lists/${listId}`);
    expect(delListRes.status()).toBe(204);

    // The list is gone afterwards
    const goneRes = await api.get(`/api/v1/lists/${listId}`);
    expect(goneRes.status()).toBe(404);
  });

  test("POST /api/v1/lists with empty name → 422", async () => {
    const res = await api.post("/api/v1/lists", { data: { name: "" } });
    expect(res.status()).toBe(422);
  });

  test("POST .../items with no name → 422", async () => {
    const created = await api.post("/api/v1/lists", { data: { name: `Tmp ${Date.now()}` } });
    const { id } = await created.json();

    const res = await api.post(`/api/v1/lists/${id}/items`, { data: {} });
    expect(res.status()).toBe(422);

    await api.delete(`/api/v1/lists/${id}`);
  });
});
