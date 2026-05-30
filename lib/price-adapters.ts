export type Supermarket = "coto" | "disco" | "carrefour";

export type PriceResult = {
  supermarket: Supermarket;
  price: number | null;
  priceText: string | null;
  productName: string | null;
  brand: string | null;
  productUrl: string | null;
  imageUrl: string | null;
};

const VTEX_HOSTS: Record<"disco" | "carrefour", string> = {
  disco: "https://www.disco.com.ar",
  carrefour: "https://www.carrefour.com.ar",
};

function isValidPrice(price: number | null | undefined): price is number {
  return price != null && !isNaN(price) && price > 0;
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
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return empty(store);

    const data = await res.json();
    const product = Array.isArray(data) ? data[0] : null;
    if (!product) return empty(store);

    const rawPrice: number | null =
      product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price ?? null;
    const price = isValidPrice(rawPrice) ? rawPrice : null;

    return {
      supermarket: store,
      price,
      priceText: price != null ? formatARS(price) : null,
      productName: product.productName ?? null,
      brand: product.brand ?? null,
      productUrl: product.link ?? null,
      imageUrl: product.items?.[0]?.images?.[0]?.imageUrl ?? null,
    };
  } catch {
    return empty(store);
  }
}

export async function cotoAdapter(query: string): Promise<PriceResult> {
  const url = `https://www.cotodigital.com.ar/sitios/cdigi/browse?Ntt=${encodeURIComponent(query)}&Nrpp=1&view=json&format=json`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return empty("coto");

    const data = await res.json();

    // Endeca ATG response tree:
    // contents[0].MainContent[1].contents[0] = ResultsList
    //   .records[0]            = product-level group record
    //     .records[0]          = SKU record with full attributes (flat dot-key strings)
    const resultList = data?.contents?.[0]?.MainContent?.[1]?.contents?.[0];
    const skuRecord = resultList?.records?.[0]?.records?.[0];
    if (!skuRecord) return empty("coto");

    const attrs: Record<string, string[]> = skuRecord.attributes ?? {};
    const priceStr = attrs[COTO_ATTRS.PRICE]?.[0];
    const rawPrice = priceStr ? parseFloat(priceStr) : null;
    const price = isValidPrice(rawPrice) ? rawPrice : null;

    const productUrl = `https://www.cotodigital.com.ar/sitios/cdigi/browse?Ntt=${encodeURIComponent(query)}`;

    return {
      supermarket: "coto",
      price,
      priceText: price != null ? formatARS(price) : null,
      productName: attrs[COTO_ATTRS.DISPLAY_NAME]?.[0] ?? null,
      brand: attrs[COTO_ATTRS.BRAND]?.[0] ?? null,
      productUrl,
      imageUrl: attrs[COTO_ATTRS.IMAGE_URL]?.[0] ?? null,
    };
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
