import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  withApiKey: vi.fn(),
}));
vi.mock("@/lib/list-service", () => ({
  serviceGetUserLists: vi.fn(),
  serviceCreateList: vi.fn(),
  serviceGetList: vi.fn(),
  serviceUpdateList: vi.fn(),
  serviceDeleteList: vi.fn(),
}));

import { withApiKey, ApiAuthError } from "@/lib/api-auth";
import {
  serviceGetUserLists,
  serviceCreateList,
  serviceGetList,
  serviceUpdateList,
  serviceDeleteList,
} from "@/lib/list-service";
import { GET as meGET } from "@/app/api/v1/me/route";
import { GET as listsGET, POST as listsPOST } from "@/app/api/v1/lists/route";
import { GET as listGET, PATCH as listPATCH, DELETE as listDELETE } from "@/app/api/v1/lists/[id]/route";

const fakeUser = {
  id: "user-1", name: "Alice", email: "alice@example.com",
  hashedPassword: "x", emailVerified: true, createdAt: new Date(), updatedAt: new Date(),
};
const fakeAuth = { user: fakeUser, keyId: "key-1" };
const fakeList = { id: "list-1", name: "Home", ownerId: "user-1", createdAt: new Date(), updatedAt: new Date() };

function req(method = "GET", body?: unknown, url = "http://localhost/api/v1/lists") {
  return new Request(url, {
    method,
    headers: { "Authorization": "Bearer sml_test", "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function ctx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(withApiKey).mockResolvedValue(fakeAuth);
});

// ---------------------------------------------------------------------------
// GET /api/v1/me
// ---------------------------------------------------------------------------

describe("GET /api/v1/me", () => {
  it("returns the authenticated user", async () => {
    const res = await meGET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ id: "user-1", name: "Alice", email: "alice@example.com" });
  });

  it("returns 401 when auth fails", async () => {
    vi.mocked(withApiKey).mockRejectedValue(new ApiAuthError());
    const res = await meGET(req());
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/lists
// ---------------------------------------------------------------------------

describe("GET /api/v1/lists", () => {
  it("returns the user lists", async () => {
    vi.mocked(serviceGetUserLists).mockResolvedValue([fakeList] as never);
    const res = await listsGET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("list-1");
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/lists
// ---------------------------------------------------------------------------

describe("POST /api/v1/lists", () => {
  it("creates a list and returns 201", async () => {
    vi.mocked(serviceCreateList).mockResolvedValue(fakeList);
    const res = await listsPOST(req("POST", { name: "Compras" }));
    expect(res.status).toBe(201);
    expect(vi.mocked(serviceCreateList)).toHaveBeenCalledWith("user-1", "Compras");
  });

  it("returns 422 for an empty name", async () => {
    const res = await listsPOST(req("POST", { name: "" }));
    expect(res.status).toBe(422);
    expect(vi.mocked(serviceCreateList)).not.toHaveBeenCalled();
  });

  it("returns 401 when auth fails", async () => {
    vi.mocked(withApiKey).mockRejectedValue(new ApiAuthError());
    const res = await listsPOST(req("POST", { name: "X" }));
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/lists/:id
// ---------------------------------------------------------------------------

describe("GET /api/v1/lists/:id", () => {
  it("returns list detail", async () => {
    vi.mocked(serviceGetList).mockResolvedValue(fakeList as never);
    const res = await listGET(req(), ctx({ id: "list-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("list-1");
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(serviceGetList).mockResolvedValue(null as never);
    const res = await listGET(req(), ctx({ id: "bad" }));
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/lists/:id
// ---------------------------------------------------------------------------

describe("PATCH /api/v1/lists/:id", () => {
  it("renames the list", async () => {
    vi.mocked(serviceUpdateList).mockResolvedValue(undefined as never);
    const res = await listPATCH(req("PATCH", { name: "Nuevo nombre" }), ctx({ id: "list-1" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(serviceUpdateList)).toHaveBeenCalledWith("list-1", "user-1", "Nuevo nombre");
  });

  it("returns 422 for missing name", async () => {
    const res = await listPATCH(req("PATCH", {}), ctx({ id: "list-1" }));
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/lists/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/v1/lists/:id", () => {
  it("deletes and returns 204", async () => {
    vi.mocked(serviceDeleteList).mockResolvedValue(undefined as never);
    const res = await listDELETE(req("DELETE"), ctx({ id: "list-1" }));
    expect(res.status).toBe(204);
    expect(vi.mocked(serviceDeleteList)).toHaveBeenCalledWith("list-1", "user-1");
  });
});
