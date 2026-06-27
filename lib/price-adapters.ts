export type Supermarket = "coto" | "disco" | "carrefour";

export const SUPERMARKETS: { key: Supermarket; label: string }[] = [
  { key: "coto", label: "Coto" },
  { key: "disco", label: "Disco" },
  { key: "carrefour", label: "Carrefour" },
];

export type PriceResult = {
  supermarket: Supermarket;
  price: number | null;
  priceText: string | null;
  productName: string | null;
  brand: string | null;
  productUrl: string | null;
  imageUrl: string | null;
};

type VtexProduct = {
  productName?: string;
  brand?: string;
  link?: string;
  items?: Array<{
    images?: Array<{ imageUrl?: string }>;
    sellers?: Array<{ commertialOffer?: { Price?: number } }>;
  }>;
};

type CotoEndecaResponse = {
  contents?: Array<{
    MainContent?: Array<{
      contents?: Array<{
        records?: Array<{ records?: Array<{ attributes?: Record<string, string[]> }> }>;
      }>;
    }>;
  }>;
};

const VTEX_HOSTS: Record<"disco" | "carrefour", string> = {
  disco: "https://www.disco.com.ar",
  carrefour: "https://www.carrefour.com.ar",
};

const COTO_ATTRS = {
  PRICE:        "sku.activePrice",
  DISPLAY_NAME: "product.displayName",
  BRAND:        "product.MARCA",
  IMAGE_URL:    "product.mediumImage.url",
} as const;

// Strips weight/volume/percentage suffixes that corrupt API relevance ranking.
// "manteca 500gr" → "manteca"; "leche larga vida 3% 1l" → "leche larga vida"
export function stripQueryNoise(query: string): string {
  const stripped = query
    .replace(/\b\d+([.,]\d+)?\s*(g|gr|kg|ml|l|lt)\b/gi, "")
    .replace(/\d+%/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || query.trim();
}

function isValidPrice(price: number | null | undefined): price is number {
  return price != null && !isNaN(price) && price > 0;
}

function getVtexRawPrice(product: VtexProduct): number | null {
  // VTEX API spells this as "commertialOffer" (sic)
  return product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price ?? null;
}

function buildVtexResult(store: "disco" | "carrefour", product: VtexProduct, price: number | null): PriceResult {
  return {
    supermarket: store,
    price,
    priceText: price != null ? formatARS(price) : null,
    productName: product.productName ?? null,
    brand: product.brand ?? null,
    productUrl: product.link ?? null,
    imageUrl: product.items?.[0]?.images?.[0]?.imageUrl ?? null,
  };
}

type CotoResultList = NonNullable<
  NonNullable<NonNullable<CotoEndecaResponse["contents"]>[0]["MainContent"]>[number]["contents"]
>[0];

function extractCotoResultList(data: unknown): CotoResultList | undefined {
  // MainContent[1] is stable: [0] is SearchAdjustments, [1] is ContentSlot-Main (verified live)
  return (data as CotoEndecaResponse)?.contents?.[0]?.MainContent?.[1]?.contents?.[0];
}

function getAllCotoAttrs(data: unknown): Array<Record<string, string[]>> {
  const resultList = extractCotoResultList(data);
  return (resultList?.records ?? [])
    .map(r => r.records?.[0]?.attributes)
    .filter((a): a is Record<string, string[]> => a != null);
}

function buildCotoResult(attrs: Record<string, string[]>, price: number | null, query: string): PriceResult {
  return {
    supermarket: "coto",
    price,
    priceText: price != null ? formatARS(price) : null,
    productName: attrs[COTO_ATTRS.DISPLAY_NAME]?.[0] ?? null,
    brand: attrs[COTO_ATTRS.BRAND]?.[0] ?? null,
    productUrl: `https://www.cotodigital.com.ar/sitios/cdigi/browse?Ntt=${encodeURIComponent(query)}`,
    imageUrl: attrs[COTO_ATTRS.IMAGE_URL]?.[0] ?? null,
  };
}

function scoreWords(name: string, words: string[]): number {
  const lower = name.toLowerCase();
  return words.reduce((acc, w) => {
    if (!lower.includes(w)) return acc;
    // Products whose name starts with the query word rank above ones that merely contain it
    return acc + (lower.startsWith(w) ? 2 : 1);
  }, 0);
}

function parseQueryWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
}

function findBestVtexProduct(products: VtexProduct[], query: string): VtexProduct | null {
  if (!products.length) return null;
  const words = parseQueryWords(query);
  if (!words.length) return products[0] ?? null;

  const scored = products.map(p => ({ p, score: scoreWords(p.productName ?? "", words) }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  return best.score > 0 ? best.p : products[0] ?? null;
}

function findBestCotoAttrs(allAttrs: Array<Record<string, string[]>>, query: string): Record<string, string[]> | null {
  if (!allAttrs.length) return null;
  const words = parseQueryWords(query);
  if (!words.length) return allAttrs[0] ?? null;

  const scored = allAttrs.map(attrs => ({
    attrs,
    score: scoreWords(attrs[COTO_ATTRS.DISPLAY_NAME]?.[0] ?? "", words),
  }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  return best.score > 0 ? best.attrs : allAttrs[0] ?? null;
}

export async function vtexAdapter(
  store: "disco" | "carrefour",
  query: string
): Promise<PriceResult> {
  const base = VTEX_HOSTS[store];
  const url = `${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=9`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.warn(`[price] ${store} responded ${res.status} for "${query}"`);
      return empty(store);
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return empty(store);
    const product = findBestVtexProduct(data as VtexProduct[], query);
    if (!product) return empty(store);

    const rawPrice = getVtexRawPrice(product);
    const price = isValidPrice(rawPrice) ? rawPrice : null;
    return buildVtexResult(store, product, price);
  } catch (err) {
    console.warn(`[price] ${store} fetch failed for "${query}":`, err);
    return empty(store);
  }
}

export async function cotoAdapter(query: string): Promise<PriceResult> {
  const url = `https://www.cotodigital.com.ar/sitios/cdigi/browse?Ntt=${encodeURIComponent(query)}&Nrpp=10&view=json&format=json`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.warn(`[price] coto responded ${res.status} for "${query}"`);
      return empty("coto");
    }

    const data: unknown = await res.json();
    const attrs = findBestCotoAttrs(getAllCotoAttrs(data), query);
    if (!attrs) return empty("coto");

    const priceStr = attrs[COTO_ATTRS.PRICE]?.[0];
    const rawPrice = priceStr ? parseFloat(priceStr) : null;
    const price = isValidPrice(rawPrice) ? rawPrice : null;
    return buildCotoResult(attrs, price, query);
  } catch (err) {
    console.warn(`[price] coto fetch failed for "${query}":`, err);
    return empty("coto");
  }
}

export function empty(supermarket: Supermarket): PriceResult {
  return {
    supermarket,
    price: null,
    priceText: null,
    productName: null,
    brand: null,
    productUrl: null,
    imageUrl: null,
  };
}

export function formatARS(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
