import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../dal", () => ({ verifySession: vi.fn() }));
vi.mock("../prisma", () => ({
  prisma: {
    list: { findUnique: vi.fn() },
    listMember: { findUnique: vi.fn() },
    priceCache: { findMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("../price-adapters", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../price-adapters")>();
  return {
    ...actual,
    vtexAdapter: vi.fn(),
    cotoAdapter: vi.fn(),
  };
});

import { getItemPrices } from "../price-actions";
import { verifySession } from "../dal";
import { prisma } from "../prisma";
import { vtexAdapter, cotoAdapter, empty } from "../price-adapters";

const SESSION = { userId: "user-1" };
const MEMBER = { listId: "list-1", userId: "user-1", joinedAt: new Date() };

const FRESH = new Date(); // within TTL
const STALE = new Date(0); // epoch — always expired

function cacheEntry(
  query: string,
  supermarket: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `${query}-${supermarket}`,
    query,
    supermarket,
    price: 1890,
    priceText: "$ 1.890",
    productName: "Leche 1L",
    brand: "La Serenísima",
    productUrl: null,
    imageUrl: null,
    fetchedAt: FRESH,
    ...overrides,
  };
}

function adapterResult(supermarket: "coto" | "disco" | "carrefour") {
  return {
    supermarket,
    price: 2000,
    priceText: "$ 2.000",
    productName: "Leche 1L (fresh fetch)",
    brand: "SomeBrand",
    productUrl: null,
    imageUrl: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifySession).mockResolvedValue(SESSION);
  vi.mocked(prisma.$transaction).mockResolvedValue([]);
  vi.mocked(vtexAdapter).mockResolvedValue(adapterResult("disco"));
  vi.mocked(cotoAdapter).mockResolvedValue(adapterResult("coto"));
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe("getItemPrices — auth guard", () => {
  it("throws when the user is not a member of the list", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ id: "list-1", ownerId: "other-user" } as never);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);

    await expect(getItemPrices("list-1", ["leche"])).rejects.toThrow(
      "No tenés permiso para realizar esta acción."
    );
  });

  it("does not call any adapter when the user is not a member", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ id: "list-1", ownerId: "other-user" } as never);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);

    await expect(getItemPrices("list-1", ["leche"])).rejects.toThrow();
    expect(cotoAdapter).not.toHaveBeenCalled();
    expect(vtexAdapter).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cache hits
// ---------------------------------------------------------------------------

describe("getItemPrices — cache hits", () => {
  it("returns cached prices without calling any adapter when all entries are fresh", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([
      cacheEntry("leche", "coto"),
      cacheEntry("leche", "disco"),
      cacheEntry("leche", "carrefour"),
    ] as never);

    const result = await getItemPrices("list-1", ["leche"]);

    expect(cotoAdapter).not.toHaveBeenCalled();
    expect(vtexAdapter).not.toHaveBeenCalled();
    expect(result["leche"]).toHaveLength(3);
    expect(result["leche"].find((r) => r.supermarket === "coto")?.price).toBe(1890);
  });

  it("normalises item names to lowercase before cache lookup", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([
      cacheEntry("leche entera", "coto"),
      cacheEntry("leche entera", "disco"),
      cacheEntry("leche entera", "carrefour"),
    ] as never);

    const result = await getItemPrices("list-1", ["Leche Entera"]);

    expect(cotoAdapter).not.toHaveBeenCalled();
    expect(result["Leche Entera"]).toHaveLength(3);
  });

  it("deduplicates identical item names and only fetches once", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);
    vi.mocked(cotoAdapter).mockResolvedValue(adapterResult("coto"));
    vi.mocked(vtexAdapter).mockImplementation(async (store) => adapterResult(store));

    await getItemPrices("list-1", ["leche", "leche", "leche"]);

    // Only one set of adapter calls despite three identical names
    expect(cotoAdapter).toHaveBeenCalledTimes(1);
    expect(vtexAdapter).toHaveBeenCalledTimes(2); // disco + carrefour
  });

  it("returns correct cached prices when the item name contains a colon", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([
      cacheEntry("leche:entera", "coto"),
      cacheEntry("leche:entera", "disco"),
      cacheEntry("leche:entera", "carrefour"),
    ] as never);

    const result = await getItemPrices("list-1", ["leche:entera"]);

    expect(cotoAdapter).not.toHaveBeenCalled();
    expect(vtexAdapter).not.toHaveBeenCalled();
    expect(result["leche:entera"]).toHaveLength(3);
    expect(result["leche:entera"].find((r) => r.supermarket === "coto")?.price).toBe(1890);
  });
});

// ---------------------------------------------------------------------------
// Cache misses
// ---------------------------------------------------------------------------

describe("getItemPrices — cache misses", () => {
  it("calls all three adapters when no cache entries exist", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);
    vi.mocked(vtexAdapter).mockImplementation(async (store) => adapterResult(store));

    await getItemPrices("list-1", ["leche"]);

    expect(cotoAdapter).toHaveBeenCalledWith("leche", []);
    expect(vtexAdapter).toHaveBeenCalledWith("disco", "leche", []);
    expect(vtexAdapter).toHaveBeenCalledWith("carrefour", "leche", []);
  });

  it("batches all adapter results into a single $transaction", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);
    vi.mocked(vtexAdapter).mockImplementation(async (store) => adapterResult(store));

    await getItemPrices("list-1", ["leche"]);

    // All 3 upserts are built and passed to a single $transaction call
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.priceCache.upsert)).toHaveBeenCalledTimes(3);
    expect(vi.mocked(prisma.priceCache.upsert)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { query_supermarket: { query: "leche", supermarket: "coto" } },
      })
    );
  });

  it("returns the adapter results in the response", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);
    vi.mocked(vtexAdapter).mockImplementation(async (store) => adapterResult(store));
    vi.mocked(cotoAdapter).mockResolvedValue(adapterResult("coto"));

    const result = await getItemPrices("list-1", ["leche"]);

    expect(result["leche"]).toHaveLength(3);
    expect(result["leche"].find((r) => r.supermarket === "coto")?.price).toBe(2000);
  });

  it("only fetches stale entries and keeps fresh ones from cache", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    // coto and disco are fresh; carrefour is stale
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([
      cacheEntry("leche", "coto", { fetchedAt: FRESH }),
      cacheEntry("leche", "disco", { fetchedAt: FRESH }),
      cacheEntry("leche", "carrefour", { fetchedAt: STALE }),
    ] as never);
    vi.mocked(vtexAdapter).mockImplementation(async (store) => adapterResult(store));

    await getItemPrices("list-1", ["leche"]);

    // Only carrefour should be re-fetched
    expect(cotoAdapter).not.toHaveBeenCalled();
    expect(vtexAdapter).toHaveBeenCalledTimes(1);
    expect(vtexAdapter).toHaveBeenCalledWith("carrefour", "leche", []);
  });

  it("returns empty result for a supermarket whose adapter returns null price", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);
    vi.mocked(cotoAdapter).mockResolvedValue(empty("coto"));
    vi.mocked(vtexAdapter).mockImplementation(async (store) => adapterResult(store));

    const result = await getItemPrices("list-1", ["leche"]);

    expect(result["leche"].find((r) => r.supermarket === "coto")?.price).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Multiple items
// ---------------------------------------------------------------------------

describe("getItemPrices — multiple items", () => {
  it("returns prices for each item independently", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);
    vi.mocked(vtexAdapter).mockImplementation(async (store) => adapterResult(store));
    vi.mocked(cotoAdapter).mockResolvedValue(adapterResult("coto"));

    const result = await getItemPrices("list-1", ["leche", "pan"]);

    expect(result["leche"]).toHaveLength(3);
    expect(result["pan"]).toHaveLength(3);
  });

  it("fetches each distinct item name from all three adapters", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(MEMBER);
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([]);
    vi.mocked(vtexAdapter).mockImplementation(async (store) => adapterResult(store));

    await getItemPrices("list-1", ["leche", "pan"]);

    expect(cotoAdapter).toHaveBeenCalledWith("leche", []);
    expect(cotoAdapter).toHaveBeenCalledWith("pan", []);
    expect(vtexAdapter).toHaveBeenCalledWith("disco", "leche", []);
    expect(vtexAdapter).toHaveBeenCalledWith("disco", "pan", []);
    expect(vtexAdapter).toHaveBeenCalledWith("carrefour", "leche", []);
    expect(vtexAdapter).toHaveBeenCalledWith("carrefour", "pan", []);
  });
});
