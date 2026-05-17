import { prisma } from "./prisma";
import {
  vtexAdapter,
  cotoAdapter,
  empty,
  type PriceResult,
  type Supermarket,
} from "./price-adapters";
import { assertMember } from "./list-service";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

export type ItemPrices = Record<string, PriceResult[]>;

const SUPERMARKETS: Supermarket[] = ["coto", "disco", "carrefour"];

export async function serviceGetItemPrices(
  listId: string,
  userId: string,
  itemNames: string[]
): Promise<ItemPrices> {
  await assertMember(listId, userId);

  const queries = [...new Set(itemNames.map((n) => n.toLowerCase().trim()))];
  const now = Date.now();

  const cachedEntries = await prisma.priceCache.findMany({
    where: { query: { in: queries } },
  });

  const fresh = new Map<string, PriceResult>();
  for (const e of cachedEntries) {
    if (now - e.fetchedAt.getTime() < CACHE_TTL_MS) {
      fresh.set(`${e.query}:${e.supermarket}`, {
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

  const tasks: Promise<void>[] = [];
  for (const query of queries) {
    for (const supermarket of SUPERMARKETS) {
      if (fresh.has(`${query}:${supermarket}`)) continue;

      const task = (
        supermarket === "coto"
          ? cotoAdapter(query)
          : vtexAdapter(supermarket, query)
      ).then(async (r) => {
        fresh.set(`${query}:${supermarket}`, r);
        await prisma.priceCache.upsert({
          where: { query_supermarket: { query, supermarket } },
          create: {
            query,
            supermarket,
            price: r.price,
            priceText: r.priceText,
            productName: r.productName,
            brand: r.brand,
            productUrl: r.productUrl,
            imageUrl: r.imageUrl,
          },
          update: {
            price: r.price,
            priceText: r.priceText,
            productName: r.productName,
            brand: r.brand,
            productUrl: r.productUrl,
            imageUrl: r.imageUrl,
            fetchedAt: new Date(),
          },
        });
      });

      tasks.push(task);
    }
  }

  await Promise.all(tasks);

  const result: ItemPrices = {};
  for (const name of itemNames) {
    const query = name.toLowerCase().trim();
    result[name] = SUPERMARKETS.map((s) => fresh.get(`${query}:${s}`) ?? empty(s));
  }

  return result;
}
