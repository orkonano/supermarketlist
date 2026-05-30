import { vi, describe, it, expect, beforeEach } from "vitest";
import { vtexAdapter, cotoAdapter, empty, formatARS } from "../price-adapters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function vtexProduct(overrides: Record<string, unknown> = {}) {
  return [
    {
      productName: "Leche La Serenísima 1L",
      brand: "La Serenísima",
      link: "https://www.disco.com.ar/leche-la-serenisima",
      items: [
        {
          images: [{ imageUrl: "https://cdn.disco.com.ar/leche.jpg" }],
          sellers: [{ commertialOffer: { Price: 1890, ListPrice: 2100 } }],
        },
      ],
      ...overrides,
    },
  ];
}

function cotoResponse(attrOverrides: Record<string, string[]> = {}) {
  return {
    contents: [
      {
        MainContent: [
          { "@type": "SearchAdjustments" },
          {
            "@type": "ContentSlot-Main",
            contents: [
              {
                "@type": "COTO_ResultsList",
                records: [
                  {
                    attributes: { "product.displayName": ["Leche La Serenísima 1L"] },
                    records: [
                      {
                        attributes: {
                          "product.displayName": ["Leche La Serenísima 1L"],
                          "product.MARCA": ["LA SERENÍSIMA"],
                          "sku.activePrice": ["1890.000000"],
                          "product.mediumImage.url": ["https://static.cotodigital3.com.ar/leche.jpg"],
                          ...attrOverrides,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// formatARS
// ---------------------------------------------------------------------------

describe("formatARS", () => {
  it("formats a whole-number price in ARS locale", () => {
    const result = formatARS(1890);
    expect(result).toContain("1");
    expect(result).toContain("890");
    expect(result).toContain("$");
  });

  it("formats a large price with thousands separator", () => {
    const result = formatARS(12500);
    expect(result).toContain("12");
    expect(result).toContain("500");
  });
});

// ---------------------------------------------------------------------------
// empty
// ---------------------------------------------------------------------------

describe("empty", () => {
  it("returns a PriceResult with all nulls for the given supermarket", () => {
    expect(empty("coto")).toEqual({
      supermarket: "coto",
      price: null,
      priceText: null,
      productName: null,
      brand: null,
      productUrl: null,
      imageUrl: null,
    });
  });
});

// ---------------------------------------------------------------------------
// vtexAdapter
// ---------------------------------------------------------------------------

describe("vtexAdapter", () => {
  it("extracts price, brand, productName, productUrl and imageUrl from a VTEX response", async () => {
    vi.stubGlobal("fetch", mockFetch(vtexProduct()));

    const result = await vtexAdapter("disco", "leche");

    expect(result.supermarket).toBe("disco");
    expect(result.price).toBe(1890);
    expect(result.priceText).toBeTruthy();
    expect(result.brand).toBe("La Serenísima");
    expect(result.productName).toBe("Leche La Serenísima 1L");
    expect(result.productUrl).toBe("https://www.disco.com.ar/leche-la-serenisima");
    expect(result.imageUrl).toBe("https://cdn.disco.com.ar/leche.jpg");
  });

  it("uses the correct host for carrefour", async () => {
    const fetchMock = mockFetch(vtexProduct());
    vi.stubGlobal("fetch", fetchMock);

    await vtexAdapter("carrefour", "leche");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("carrefour.com.ar"),
      expect.anything()
    );
  });

  it("uses the correct host for disco", async () => {
    const fetchMock = mockFetch(vtexProduct());
    vi.stubGlobal("fetch", fetchMock);

    await vtexAdapter("disco", "leche");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("disco.com.ar"),
      expect.anything()
    );
  });

  it("URL-encodes the search query", async () => {
    const fetchMock = mockFetch(vtexProduct());
    vi.stubGlobal("fetch", fetchMock);

    await vtexAdapter("disco", "leche entera");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("leche%20entera"),
      expect.anything()
    );
  });

  it("returns null price when the API returns Price: 0", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(vtexProduct({ items: [{ images: [], sellers: [{ commertialOffer: { Price: 0, ListPrice: 0 } }] }] }))
    );

    const result = await vtexAdapter("carrefour", "cerveza");

    expect(result.price).toBeNull();
    expect(result.priceText).toBeNull();
  });

  it("returns empty when the response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 503));

    const result = await vtexAdapter("disco", "leche");

    expect(result).toEqual(empty("disco"));
  });

  it("returns empty when the response array is empty", async () => {
    vi.stubGlobal("fetch", mockFetch([]));

    const result = await vtexAdapter("disco", "leche");

    expect(result).toEqual(empty("disco"));
  });

  it("returns empty when price is missing from the response", async () => {
    vi.stubGlobal("fetch", mockFetch(vtexProduct({ items: [] })));

    const result = await vtexAdapter("disco", "leche");

    expect(result.price).toBeNull();
    expect(result.priceText).toBeNull();
  });

  it("returns empty when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const result = await vtexAdapter("disco", "leche");

    expect(result).toEqual(empty("disco"));
  });
});

// ---------------------------------------------------------------------------
// cotoAdapter
// ---------------------------------------------------------------------------

describe("cotoAdapter", () => {
  it("extracts price, brand, productName and imageUrl from the Endeca ATG response", async () => {
    vi.stubGlobal("fetch", mockFetch(cotoResponse()));

    const result = await cotoAdapter("leche");

    expect(result.supermarket).toBe("coto");
    expect(result.price).toBe(1890);
    expect(result.priceText).toBeTruthy();
    expect(result.brand).toBe("LA SERENÍSIMA");
    expect(result.productName).toBe("Leche La Serenísima 1L");
    expect(result.imageUrl).toBe("https://static.cotodigital3.com.ar/leche.jpg");
    expect(result.productUrl).toBe("https://www.cotodigital.com.ar/sitios/cdigi/browse?Ntt=leche");
  });

  it("parses the price string as a float", async () => {
    vi.stubGlobal("fetch", mockFetch(cotoResponse({ "sku.activePrice": ["3299.000000"] })));

    const result = await cotoAdapter("dulce de leche");

    expect(result.price).toBe(3299);
  });

  it("URL-encodes the search query", async () => {
    const fetchMock = mockFetch(cotoResponse());
    vi.stubGlobal("fetch", fetchMock);

    await cotoAdapter("leche entera");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("leche%20entera"),
      expect.anything()
    );
  });

  it("returns empty when the response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 403));

    const result = await cotoAdapter("leche");

    expect(result).toEqual(empty("coto"));
  });

  it("returns empty when there are no records in the ResultsList", async () => {
    const noRecords = cotoResponse();
    noRecords.contents[0]!.MainContent[1]!.contents![0]!.records = [];
    vi.stubGlobal("fetch", mockFetch(noRecords));

    const result = await cotoAdapter("leche");

    expect(result).toEqual(empty("coto"));
  });

  it("returns empty when the SKU sub-record is missing", async () => {
    const noSku = cotoResponse();
    noSku.contents[0]!.MainContent[1]!.contents![0]!.records![0]!.records = [];
    vi.stubGlobal("fetch", mockFetch(noSku));

    const result = await cotoAdapter("leche");

    expect(result).toEqual(empty("coto"));
  });

  it("returns null price when sku.activePrice is absent", async () => {
    // Build a response where the SKU record has no sku.activePrice at all
    const response = {
      contents: [{
        MainContent: [
          { "@type": "SearchAdjustments" },
          {
            "@type": "ContentSlot-Main",
            contents: [{
              records: [{
                attributes: {},
                records: [{
                  attributes: {
                    "product.displayName": ["Leche"],
                    "product.MARCA": ["MARCA"],
                    "product.mediumImage.url": ["https://img.jpg"],
                    // sku.activePrice deliberately absent
                  },
                }],
              }],
            }],
          },
        ],
      }],
    };
    vi.stubGlobal("fetch", mockFetch(response));

    const result = await cotoAdapter("leche");

    expect(result.price).toBeNull();
    expect(result.priceText).toBeNull();
    expect(result.productName).toBe("Leche");
  });

  it("returns empty when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    const result = await cotoAdapter("leche");

    expect(result).toEqual(empty("coto"));
  });
});
