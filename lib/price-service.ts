import { prisma } from "./prisma";
import {
  vtexAdapter,
  cotoAdapter,
  empty,
  type PriceResult,
  type Supermarket,
} from "./price-adapters";
import { assertMember } from "./list-service";
import { PRICE_CACHE_TTL_MS } from "./constants/time";

export type ItemPrices = Record<string, PriceResult[]>;

const SUPERMARKETS: Supermarket[] = ["coto", "disco", "carrefour"];

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

async function loadFreshFromCache(queries: string[]): Promise<Map<string, PriceResult>> {
  const now = Date.now();
  const entries = await prisma.priceCache.findMany({ where: { query: { in: queries } } });
  const fresh = new Map<string, PriceResult>();
  for (const e of entries) {
    if (now - e.fetchedAt.getTime() < PRICE_CACHE_TTL_MS) {
      fresh.set(cacheKey(e.query, e.supermarket), {
        supermarket: e.supermarket as Supermarket,
        price: e.price,
        priceText: e.priceText,
        productName: e.productName,
        brand: e.brand,
        productUrl: e.productUrl,
        imageUrl: e.imageUrl,
      });
    }
  }
  return fresh;
}

async function fetchAndCacheMissing(
  queries: string[],
  fresh: Map<string, PriceResult>
): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (const query of queries) {
    for (const supermarket of SUPERMARKETS) {
      if (fresh.has(cacheKey(query, supermarket))) continue;
      const task = (
        supermarket === "coto" ? cotoAdapter(query) : vtexAdapter(supermarket, query)
      ).then(async (r) => {
        fresh.set(cacheKey(query, supermarket), r);
        await prisma.priceCache.upsert({
          where: { query_supermarket: { query, supermarket } },
          create: { query, supermarket, ...priceResultToRecord(r) },
          update: { ...priceResultToRecord(r), fetchedAt: new Date() },
        });
      });
      tasks.push(task);
    }
  }
  await Promise.all(tasks);
}

function buildResult(itemNames: string[], fresh: Map<string, PriceResult>): ItemPrices {
  const result: ItemPrices = {};
  for (const name of itemNames) {
    const query = name.toLowerCase().trim();
    result[name] = SUPERMARKETS.map((s) => fresh.get(cacheKey(query, s)) ?? empty(s));
  }
  return result;
}

export async function serviceGetItemPrices(
  listId: string,
  userId: string,
  itemNames: string[]
): Promise<ItemPrices> {
  await assertMember(listId, userId);
  const queries = [...new Set(itemNames.map((n) => n.toLowerCase().trim()))];
  const fresh = await loadFreshFromCache(queries);
  await fetchAndCacheMissing(queries, fresh);
  return buildResult(itemNames, fresh);
}
