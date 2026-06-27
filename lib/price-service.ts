import { prisma } from "./prisma";
import {
  vtexAdapter,
  cotoAdapter,
  empty,
  stripQueryNoise,
  parseSizeTokens,
  SUPERMARKETS,
  type PriceResult,
  type Supermarket,
} from "./price-adapters";
import { ensureMember } from "./list-service";
import { PRICE_CACHE_TTL_MS } from "./constants/time";

export type ItemPrices = Record<string, PriceResult[]>;

type QueryPlan = {
  cacheKey: string;       // original lowercased name — stored in DB and used for lookup
  searchQuery: string;    // noise-stripped — sent to supermarket APIs
  sizePatterns: RegExp[]; // flexible size match patterns for scoring
};

function buildQueryPlan(itemName: string): QueryPlan {
  const cacheKey = itemName.toLowerCase().trim();
  return {
    cacheKey,
    searchQuery: stripQueryNoise(cacheKey),
    sizePatterns: parseSizeTokens(cacheKey),
  };
}

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
  plan: QueryPlan,
  supermarket: Supermarket,
  fresh: Map<string, PriceResult>
): Promise<void> {
  const r = supermarket === "coto"
    ? await cotoAdapter(plan.searchQuery, plan.sizePatterns)
    : await vtexAdapter(supermarket, plan.searchQuery, plan.sizePatterns);
  fresh.set(cacheKey(plan.cacheKey, supermarket), r);
}

async function fetchAndCacheMissing(
  plans: QueryPlan[],
  fresh: Map<string, PriceResult>,
  staleKeys: Set<string> = new Set()
): Promise<void> {
  const missing: { plan: QueryPlan; supermarket: Supermarket }[] = [];
  for (const plan of plans) {
    for (const { key: supermarket } of SUPERMARKETS) {
      const key = cacheKey(plan.cacheKey, supermarket);
      if (!fresh.has(key) || staleKeys.has(key)) {
        missing.push({ plan, supermarket });
      }
    }
  }
  if (missing.length === 0) return;

  await Promise.all(missing.map(({ plan, supermarket }) => fetchAndCache(plan, supermarket, fresh)));

  await prisma.$transaction(
    missing.map(({ plan, supermarket }) => {
      const r = fresh.get(cacheKey(plan.cacheKey, supermarket))!;
      return prisma.priceCache.upsert({
        where: { query_supermarket: { query: plan.cacheKey, supermarket } },
        create: { query: plan.cacheKey, supermarket, ...priceResultToRecord(r) },
        update: { ...priceResultToRecord(r), fetchedAt: new Date() },
      });
    })
  );
}

function buildResult(itemNames: string[], fresh: Map<string, PriceResult>): ItemPrices {
  const result: ItemPrices = {};
  for (const name of itemNames) {
    const key = name.toLowerCase().trim();
    result[name] = SUPERMARKETS.map(({ key: s }) => fresh.get(cacheKey(key, s)) ?? empty(s));
  }
  return result;
}

export async function serviceGetItemPrices(
  listId: string,
  userId: string,
  itemNames: string[]
): Promise<ItemPrices> {
  await ensureMember(listId, userId);

  const planMap = new Map<string, QueryPlan>();
  for (const name of itemNames) {
    const plan = buildQueryPlan(name);
    if (!planMap.has(plan.cacheKey)) planMap.set(plan.cacheKey, plan);
  }
  const plans = [...planMap.values()];
  const { all, staleKeys } = await loadAllFromCache(plans.map(p => p.cacheKey));

  const hasMissing = plans.some(plan =>
    SUPERMARKETS.some(({ key: s }) => !all.has(cacheKey(plan.cacheKey, s)))
  );

  if (hasMissing) {
    await fetchAndCacheMissing(plans, all, new Set());
  } else if (staleKeys.size > 0) {
    void fetchAndCacheMissing(plans, all, staleKeys);
  }

  return buildResult(itemNames, all);
}
