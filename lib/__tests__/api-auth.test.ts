import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { withApiKey, ApiAuthError } from "../api-auth";
import { prisma } from "../prisma";
import { createHash } from "crypto";

function makeKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function makeRequest(authHeader?: string) {
  return new Request("http://localhost/api/v1/me", {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

const fakeUser = {
  id: "user-1",
  name: "Alice",
  email: "alice@example.com",
  hashedPassword: "x",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const RAW_KEY = "sml_" + "a".repeat(64);

const fakeApiKey = {
  id: "key-1",
  keyHash: makeKey(RAW_KEY),
  name: "Test",
  userId: "user-1",
  user: fakeUser,
  createdAt: new Date(),
  lastUsedAt: null,
  expiresAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.apiKey.update).mockResolvedValue(fakeApiKey as never);
});

// ---------------------------------------------------------------------------
// withApiKey
// ---------------------------------------------------------------------------

describe("withApiKey", () => {
  it("returns user and keyId for a valid key", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(fakeApiKey as never);

    const result = await withApiKey(makeRequest(`Bearer ${RAW_KEY}`));

    expect(result.user.id).toBe("user-1");
    expect(result.keyId).toBe("key-1");
  });

  it("throws ApiAuthError when Authorization header is missing", async () => {
    await expect(withApiKey(makeRequest())).rejects.toBeInstanceOf(ApiAuthError);
  });

  it("throws ApiAuthError when header does not start with Bearer", async () => {
    await expect(withApiKey(makeRequest("Basic abc"))).rejects.toBeInstanceOf(ApiAuthError);
  });

  it("throws ApiAuthError when key is not found in db", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);

    await expect(withApiKey(makeRequest(`Bearer ${RAW_KEY}`))).rejects.toBeInstanceOf(ApiAuthError);
  });

  it("throws ApiAuthError when key is expired", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      ...fakeApiKey,
      expiresAt: new Date(Date.now() - 1000),
    } as never);

    await expect(withApiKey(makeRequest(`Bearer ${RAW_KEY}`))).rejects.toBeInstanceOf(ApiAuthError);
  });

  it("accepts a key with expiresAt in the future", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      ...fakeApiKey,
      expiresAt: new Date(Date.now() + 86_400_000),
    } as never);

    await expect(withApiKey(makeRequest(`Bearer ${RAW_KEY}`))).resolves.toBeDefined();
  });

  it("updates lastUsedAt when it is null", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ ...fakeApiKey, lastUsedAt: null } as never);

    await withApiKey(makeRequest(`Bearer ${RAW_KEY}`));

    expect(vi.mocked(prisma.apiKey.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "key-1" }, data: { lastUsedAt: expect.any(Date) } })
    );
  });

  it("updates lastUsedAt when it is older than 1 hour", async () => {
    const old = new Date(Date.now() - 3_700_000);
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ ...fakeApiKey, lastUsedAt: old } as never);

    await withApiKey(makeRequest(`Bearer ${RAW_KEY}`));

    expect(vi.mocked(prisma.apiKey.update)).toHaveBeenCalled();
  });

  it("skips lastUsedAt update when it was updated recently", async () => {
    const recent = new Date(Date.now() - 60_000);
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ ...fakeApiKey, lastUsedAt: recent } as never);

    await withApiKey(makeRequest(`Bearer ${RAW_KEY}`));

    expect(vi.mocked(prisma.apiKey.update)).not.toHaveBeenCalled();
  });

  it("looks up key by SHA-256 hash, not raw value", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(fakeApiKey as never);

    await withApiKey(makeRequest(`Bearer ${RAW_KEY}`));

    expect(vi.mocked(prisma.apiKey.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { keyHash: makeKey(RAW_KEY) } })
    );
  });
});

// ---------------------------------------------------------------------------
// apiRoute wrapper
// ---------------------------------------------------------------------------

describe("apiRoute", () => {
  it("returns 401 when ApiAuthError is thrown", async () => {
    const { apiRoute } = await import("../api-route");
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);

    const handler = apiRoute(async () => Response.json({ ok: true }));
    const res = await handler(makeRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("No autorizado");
  });

  it("calls handler with auth when key is valid", async () => {
    const { apiRoute } = await import("../api-route");
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(fakeApiKey as never);

    const handler = apiRoute(async (_req, auth) => Response.json({ userId: auth.user.id }));
    const res = await handler(makeRequest(`Bearer ${RAW_KEY}`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe("user-1");
  });

  it("re-throws non-auth errors", async () => {
    const { apiRoute } = await import("../api-route");
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(fakeApiKey as never);

    const handler = apiRoute(async () => { throw new Error("DB exploded"); });
    await expect(handler(makeRequest(`Bearer ${RAW_KEY}`))).rejects.toThrow("DB exploded");
  });
});
