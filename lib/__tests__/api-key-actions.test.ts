import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../dal", () => ({ verifySession: vi.fn() }));
vi.mock("../prisma", () => ({
  prisma: {
    apiKey: { count: vi.fn(), create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
  },
}));

import { createApiKey, deleteApiKey, getUserApiKeys } from "../api-key-actions";
import { verifySession } from "../dal";
import { prisma } from "../prisma";

const SESSION = { isAuth: true as const, userId: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifySession).mockResolvedValue(SESSION);
});

// ---------------------------------------------------------------------------
// createApiKey
// ---------------------------------------------------------------------------

describe("createApiKey", () => {
  it("creates a key and returns the raw key once", async () => {
    vi.mocked(prisma.apiKey.count).mockResolvedValue(0);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({} as never);

    const result = await createApiKey("Claude MCP");

    expect(result).toHaveProperty("key");
    expect((result as { key: string }).key).toMatch(/^sml_[0-9a-f]{64}$/);
    expect(vi.mocked(prisma.apiKey.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Claude MCP", userId: "user-1" }),
      })
    );
  });

  it("stores a hash, not the raw key", async () => {
    vi.mocked(prisma.apiKey.count).mockResolvedValue(0);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({} as never);

    const result = await createApiKey("Test");
    const rawKey = (result as { key: string }).key;

    const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
    expect(createCall.data.keyHash).not.toBe(rawKey);
    expect(createCall.data.keyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns an error when the 10-key limit is reached", async () => {
    vi.mocked(prisma.apiKey.count).mockResolvedValue(10);

    const result = await createApiKey("Extra");

    expect(result).toHaveProperty("error");
    expect(vi.mocked(prisma.apiKey.create)).not.toHaveBeenCalled();
  });

  it("returns an error for an empty name", async () => {
    const result = await createApiKey("   ");

    expect(result).toHaveProperty("error");
    expect(vi.mocked(prisma.apiKey.create)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteApiKey
// ---------------------------------------------------------------------------

describe("deleteApiKey", () => {
  it("deletes with both id and userId in where clause", async () => {
    vi.mocked(prisma.apiKey.delete).mockResolvedValue({} as never);

    await deleteApiKey("key-1");

    expect(vi.mocked(prisma.apiKey.delete)).toHaveBeenCalledWith({
      where: { id: "key-1", userId: "user-1" },
    });
  });
});

// ---------------------------------------------------------------------------
// getUserApiKeys
// ---------------------------------------------------------------------------

describe("getUserApiKeys", () => {
  it("returns keys scoped to the session user", async () => {
    const keys = [{ id: "key-1", name: "Test", createdAt: new Date(), lastUsedAt: null, expiresAt: null }];
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue(keys as never);

    const result = await getUserApiKeys();

    expect(vi.mocked(prisma.apiKey.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
    expect(result).toEqual(keys);
  });
});
