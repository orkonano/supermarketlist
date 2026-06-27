import { prisma } from "./prisma";
import {
  vtexAdapter,
  cotoAdapter,
  empty,
  stripQueryNoise,
  SUPERMARKETS,
  type PriceResult,
  type Supermarket,
} from "./price-adapters";
import { ensureMember } from "./list-service";
import { PRICE_CACHE_TTL_MS } from "./constants/time";

export type ItemPrices = Record<string, PriceResult[]>;

function cacheKey(query: string, supermarket: string): string {
  return JSON.stringify([query, supermarket]);
}

function priceResultToRecord(r: PriceResult) {
  return {
    price: r.price,
    priceText: r.priceText,
    productName: r.productName,
    brand: r.brand,
    productUrl: r.productUrl,
    imageUrl: r.imageUrl,
  };
}

async function loadAllFromCache(queries: string[]): Promise<{
  all: Map<string, PriceResult>;
  staleKeys: Set<string>;
}> {
  const now = Date.now();
  const entries = await prisma.priceCache.findMany({
    where: { query: { in: queries } },
    select: {
      query: true,
      supermarket: true,
      price: true,
      priceText: true,
      productName: true,
      brand: true,
      productUrl: true,
      imageUrl: true,
      fetchedAt: true,
    },
  });
  const all = new Map<string, PriceResult>();
  const staleKeys = new Set<string>();

  for (const e of entries) {
    const key = cacheKey(e.query, e.supermarket);
    const result: PriceResult = {
      supermarket: e.supermarket as Supermarket,
      price: e.price,
      priceText: e.priceText,
      productName: e.productName,
      brand: e.brand,
      productUrl: e.productUrl,
      imageUrl: e.imageUrl,
    };
    all.set(key, result);
    if (now - e.fetchedAt.getTime() >= PRICE_CACHE_TTL_MS) {
      staleKeys.add(key);
    }
  }
  return { all, staleKeys };
}

async function fetchAndCache(
  query: string,
  supermarket: Supermarket,
  fresh: Map<string, PriceResult>
): Promise<void> {
  const r = supermarket === "coto"
    ? await cotoAdapter(query)
    : await vtexAdapter(supermarket, query);
  fresh.set(cacheKey(query, supermarket), r);
}

async function fetchAndCacheMissing(
  queries: string[],
  fresh: Map<string, PriceResult>,
  staleKeys: Set<string> = new Set()
): Promise<void> {
  const missing: { query: string; supermarket: Supermarket }[] = [];
  for (const query of queries) {
    for (const { key: supermarket } of SUPERMARKETS) {
      const key = cacheKey(query, supermarket);
      if (!fresh.has(key) || staleKeys.has(key)) {
        missing.push({ query, supermarket });
      }
    }
  }
  if (missing.length === 0) return;

  await Promise.all(missing.map(({ query, supermarket }) => fetchAndCache(query, supermarket, fresh)));

  await prisma.$transaction(
    missing.map(({ query, supermarket }) => {
      const r = fresh.get(cacheKey(query, supermarket))!;
      return prisma.priceCache.upsert({
        where: { query_supermarket: { query, supermarket } },
        create: { query, supermarket, ...priceResultToRecord(r) },
        update: { ...priceResultToRecord(r), fetchedAt: new Date() },
      });
    })
  );
}

function buildResult(itemNames: string[], fresh: Map<string, PriceResult>): ItemPrices {
  const result: ItemPrices = {};
  for (const name of itemNames) {
    const query = stripQueryNoise(name.toLowerCase().trim());
    result[name] = SUPERMARKETS.map(({ key }) => fresh.get(cacheKey(query, key)) ?? empty(key));
  }
  return result;
}

export async function serviceGetItemPrices(
  listId: string,
  userId: string,
  itemNames: string[]
): Promise<ItemPrices> {
  await ensureMember(listId, userId);
  const queries = [...new Set(itemNames.map((n) => stripQueryNoise(n.toLowerCase().trim())))];
  const { all, staleKeys } = await loadAllFromCache(queries);

  const missingKeys = queries.flatMap((q) =>
    SUPERMARKETS.filter(({ key: s }) => !all.has(cacheKey(q, s))).map(({ key: s }) => ({ q, s }))
  );

  if (missingKeys.length > 0) {
    // Await missing entries — no cached data to show yet
    await fetchAndCacheMissing(queries, all, new Set());
  } else if (staleKeys.size > 0) {
    // Return stale data immediately; refresh silently in background
    void fetchAndCacheMissing(queries, all, staleKeys);
  }

  return buildResult(itemNames, all);
}
