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
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:g(?:r(?:[sm])?)?|l(?:ts?)?|ml|kg)\b/gi, "")
    .replace(/\d+%/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || query.trim();
}

// Builds flexible match patterns for each size token in the query.
// "manteca 500gr" → [/\b500\s*g(?:r(?:[sm])?)?\b/i]
// "leche 3% 1l"   → [/\b1\s*l(?:ts?)?\b/i]
export function parseSizeTokens(query: string): RegExp[] {
  const sizeRe = /\b(\d+(?:[.,]\d+)?)\s*(g(?:r(?:[sm])?)?|l(?:ts?)?|ml|kg)\b/gi;
  const patterns: RegExp[] = [];
  for (const m of query.matchAll(sizeRe)) {
    const num = m[1]!.replace(",", ".");
    patterns.push(new RegExp(`\\b${num}\\s*${unitToPattern(m[2]!)}\\b`, "i"));
  }
  return patterns;
}

// "manteca 500gr" → ["500"]; "leche 3% 1l" → ["1"]; "arroz" → []
export function extractSizeNumbers(query: string): string[] {
  const sizeRe = /\b(\d+(?:[.,]\d+)?)\s*(g(?:r(?:[sm])?)?|l(?:ts?)?|ml|kg)\b/gi;
  return [...query.matchAll(sizeRe)].map(m => m[1]!.replace(",", "."));
}

// "manteca 500gr" → "manteca 500"; "leche larga vida 3% 1l" → "leche larga vida 1"
// When nothing strips (base === q), return as-is — sizes are already embedded.
export function buildVtexQuery(query: string): string {
  const q = query.toLowerCase();
  const base = stripQueryNoise(q);
  if (base === q) return q;
  const sizes = extractSizeNumbers(q);
  return [base, ...sizes].join(" ").trim();
}

function unitToPattern(unit: string): string {
  const u = unit.toLowerCase();
  if (u.startsWith("g")) return "g(?:r(?:[sm])?)?";
  if (u === "ml") return "ml";
  if (u === "kg") return "kg";
  return "l(?:ts?)?"; // l / lt / lts
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

function parseQueryWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
}

// Scores a product name against noun words. A product with zero noun score
// shares no nouns with the query and is disqualified.
function nounScore(name: string, words: string[]): number {
  const lower = name.toLowerCase();
  return words.reduce(
    (acc, w) => (lower.includes(w) ? acc + (lower.startsWith(w) ? 2 : 1) : acc),
    0
  );
}

type Candidate<T> = { item: T; name: string; price: number | null };

function selectBest<T>(
  candidates: Candidate<T>[],
  query: string,
  sizePatterns: RegExp[]
): T | null {
  if (!candidates.length) return null;
  const words = parseQueryWords(query);
  if (!words.length) return candidates[0]!.item;

  const relevant = candidates.filter(c => nounScore(c.name, words) > 0);
  if (!relevant.length) return null;

  const priced = relevant.filter(c => isValidPrice(c.price));
  const pool = priced.length ? priced : relevant;

  const sized = sizePatterns.length
    ? pool.filter(c => sizePatterns.some(p => p.test(c.name)))
    : [];
  const finalPool = sized.length ? sized : pool;

  if (priced.length) {
    return finalPool.reduce((a, b) => (b.price! < a.price! ? b : a)).item;
  }
  return finalPool.reduce((a, b) =>
    nounScore(b.name, words) > nounScore(a.name, words) ? b : a
  ).item;
}

function findBestVtexProduct(
  products: VtexProduct[],
  query: string,
  sizePatterns: RegExp[] = []
): VtexProduct | null {
  return selectBest(
    products.map(p => ({ item: p, name: p.productName ?? "", price: getVtexRawPrice(p) })),
    query,
    sizePatterns
  );
}

function findBestCotoAttrs(
  allAttrs: Array<Record<string, string[]>>,
  query: string,
  sizePatterns: RegExp[] = []
): Record<string, string[]> | null {
  return selectBest(
    allAttrs.map(a => ({
      item: a,
      name: a[COTO_ATTRS.DISPLAY_NAME]?.[0] ?? "",
      price: a[COTO_ATTRS.PRICE]?.[0] ? parseFloat(a[COTO_ATTRS.PRICE]![0]!) : null,
    })),
    query,
    sizePatterns
  );
}

export async function vtexAdapter(
  store: "disco" | "carrefour",
  query: string,
  sizePatterns: RegExp[] = []
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
    const product = findBestVtexProduct(data as VtexProduct[], query, sizePatterns);
    if (!product) return empty(store);

    const rawPrice = getVtexRawPrice(product);
    const price = isValidPrice(rawPrice) ? rawPrice : null;
    return buildVtexResult(store, product, price);
  } catch (err) {
    console.warn(`[price] ${store} fetch failed for "${query}":`, err);
    return empty(store);
  }
}

export async function cotoAdapter(
  query: string,
  sizePatterns: RegExp[] = []
): Promise<PriceResult> {
  const url = `https://www.cotodigital.com.ar/sitios/cdigi/browse?Ntt=${encodeURIComponent(query)}&Nrpp=10&view=json&format=json`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.warn(`[price] coto responded ${res.status} for "${query}"`);
      return empty("coto");
    }

    const data: unknown = await res.json();
    const attrs = findBestCotoAttrs(getAllCotoAttrs(data), query, sizePatterns);
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
