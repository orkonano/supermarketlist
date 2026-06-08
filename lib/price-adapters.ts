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
  return (data as CotoEndecaResponse)?.contents?.[0]?.MainContent?.[1]?.contents?.[0];
}

function getCotoSkuAttrs(data: unknown): Record<string, string[]> | null {
  const resultList = extractCotoResultList(data);
  const skuRecord = resultList?.records?.[0]?.records?.[0];
  return skuRecord?.attributes ?? null;
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

const COTO_ATTRS = {
  PRICE:        "sku.activePrice",
  DISPLAY_NAME: "product.displayName",
  BRAND:        "product.MARCA",
  IMAGE_URL:    "product.mediumImage.url",
} as const;

export async function vtexAdapter(
  store: "disco" | "carrefour",
  query: string
): Promise<PriceResult> {
  const base = VTEX_HOSTS[store];
  const url = `${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=0`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!res.ok) return empty(store);

    const data: unknown = await res.json();
    const product = Array.isArray(data) ? (data[0] as VtexProduct) : null;
    if (!product) return empty(store);

    const rawPrice = getVtexRawPrice(product);
    const price = isValidPrice(rawPrice) ? rawPrice : null;
    return buildVtexResult(store, product, price);
  } catch {
    return empty(store);
  }
}

export async function cotoAdapter(query: string): Promise<PriceResult> {
  const url = `https://www.cotodigital.com.ar/sitios/cdigi/browse?Ntt=${encodeURIComponent(query)}&Nrpp=1&view=json&format=json`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!res.ok) return empty("coto");

    const data: unknown = await res.json();
    const attrs = getCotoSkuAttrs(data);
    if (!attrs) return empty("coto");

    const priceStr = attrs[COTO_ATTRS.PRICE]?.[0];
    const rawPrice = priceStr ? parseFloat(priceStr) : null;
    const price = isValidPrice(rawPrice) ? rawPrice : null;
    return buildCotoResult(attrs, price, query);
  } catch {
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
