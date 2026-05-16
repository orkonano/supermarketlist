import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  withApiKey: vi.fn(),
}));
vi.mock("@/lib/list-service", () => ({
  serviceGetListItems: vi.fn(),
  serviceAddListItem: vi.fn(),
  serviceToggleListItem: vi.fn(),
  serviceDeleteListItem: vi.fn(),
  serviceUpdateListItem: vi.fn(),
}));

import { withApiKey } from "@/lib/api-auth";
import {
  serviceGetListItems,
  serviceAddListItem,
  serviceToggleListItem,
  serviceDeleteListItem,
  serviceUpdateListItem,
} from "@/lib/list-service";
import { GET as itemsGET, POST as itemsPOST } from "@/app/api/v1/lists/[id]/items/route";
import { PATCH as itemPATCH, DELETE as itemDELETE } from "@/app/api/v1/lists/[id]/items/[itemId]/route";

const fakeUser = {
  id: "user-1", name: "Alice", email: "alice@example.com",
  hashedPassword: "x", emailVerified: true, createdAt: new Date(), updatedAt: new Date(),
};
const fakeAuth = { user: fakeUser, keyId: "key-1" };
const fakeItem = {
  id: "item-1", name: "Leche", quantity: "1L", category: "Lácteos",
  addedBy: "Alice (API)", month: 5, year: 2026, checked: false,
  listId: "list-1", createdAt: new Date(), updatedAt: new Date(),
};

function req(method = "GET", body?: unknown, url = "http://localhost/api/v1/lists/list-1/items") {
  return new Request(url, {
    method,
    headers: { "Authorization": "Bearer sml_test", "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function ctx(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(withApiKey).mockResolvedValue(fakeAuth);
});

// ---------------------------------------------------------------------------
// GET /api/v1/lists/:id/items
// ---------------------------------------------------------------------------

describe("GET /api/v1/lists/:id/items", () => {
  it("returns items for the current month by default", async () => {
    vi.mocked(serviceGetListItems).mockResolvedValue([fakeItem]);
    const res = await itemsGET(req(), ctx({ id: "list-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].id).toBe("item-1");
  });

  it("uses month/year from query params when valid", async () => {
    vi.mocked(serviceGetListItems).mockResolvedValue([]);
    const r = req("GET", undefined, "http://localhost/api/v1/lists/list-1/items?month=3&year=2025");
    await itemsGET(r, ctx({ id: "list-1" }));
    expect(vi.mocked(serviceGetListItems)).toHaveBeenCalledWith("list-1", "user-1", 3, 2025);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/lists/:id/items
// ---------------------------------------------------------------------------

describe("POST /api/v1/lists/:id/items", () => {
  it("creates an item with addedBy set to user name + (API)", async () => {
    vi.mocked(serviceAddListItem).mockResolvedValue(fakeItem);
    const res = await itemsPOST(req("POST", { name: "Leche" }), ctx({ id: "list-1" }));
    expect(res.status).toBe(201);
    expect(vi.mocked(serviceAddListItem)).toHaveBeenCalledWith(
      "list-1", "user-1", "Alice (API)",
      expect.objectContaining({ name: "Leche" })
    );
  });

  it("returns 422 for missing name", async () => {
    const res = await itemsPOST(req("POST", {}), ctx({ id: "list-1" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 for quantity over 50 chars", async () => {
    const res = await itemsPOST(req("POST", { name: "X", quantity: "a".repeat(51) }), ctx({ id: "list-1" }));
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/lists/:id/items/:itemId
// ---------------------------------------------------------------------------

describe("PATCH /api/v1/lists/:id/items/:itemId", () => {
  it("calls serviceToggleListItem when only checked is provided", async () => {
    vi.mocked(serviceToggleListItem).mockResolvedValue({ ...fakeItem, checked: true });
    const res = await itemPATCH(req("PATCH", { checked: true }), ctx({ id: "list-1", itemId: "item-1" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(serviceToggleListItem)).toHaveBeenCalledWith("list-1", "user-1", "item-1", true);
  });

  it("calls serviceUpdateListItem when other fields are provided", async () => {
    vi.mocked(serviceUpdateListItem).mockResolvedValue({ ...fakeItem, name: "Pan" });
    const res = await itemPATCH(req("PATCH", { name: "Pan" }), ctx({ id: "list-1", itemId: "item-1" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(serviceUpdateListItem)).toHaveBeenCalledWith(
      "list-1", "user-1", "item-1", expect.objectContaining({ name: "Pan" })
    );
  });

  it("uses compound listId+itemId scoping (passed to service)", async () => {
    vi.mocked(serviceToggleListItem).mockResolvedValue({ ...fakeItem, checked: true });
    await itemPATCH(req("PATCH", { checked: true }), ctx({ id: "list-1", itemId: "item-1" }));
    expect(vi.mocked(serviceToggleListItem).mock.calls[0]).toEqual(["list-1", "user-1", "item-1", true]);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/lists/:id/items/:itemId
// ---------------------------------------------------------------------------

describe("DELETE /api/v1/lists/:id/items/:itemId", () => {
  it("deletes and returns 204", async () => {
    vi.mocked(serviceDeleteListItem).mockResolvedValue(undefined as never);
    const res = await itemDELETE(req("DELETE"), ctx({ id: "list-1", itemId: "item-1" }));
    expect(res.status).toBe(204);
    expect(vi.mocked(serviceDeleteListItem)).toHaveBeenCalledWith("list-1", "user-1", "item-1");
  });
});
