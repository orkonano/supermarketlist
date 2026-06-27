import { vi, describe, it, expect, beforeEach } from "vitest";
import { vtexAdapter, cotoAdapter, empty, formatARS, stripQueryNoise, parseSizeTokens } from "../price-adapters";

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

function cotoResponseMulti(products: Array<Record<string, string[]>>) {
  return {
    contents: [{
      MainContent: [
        { "@type": "SearchAdjustments" },
        {
          "@type": "ContentSlot-Main",
          contents: [{
            "@type": "COTO_ResultsList",
            records: products.map(attrs => ({
              attributes: { "product.displayName": attrs["product.displayName"] ?? [] },
              records: [{ attributes: attrs }],
            })),
          }],
        },
      ],
    }],
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

  it("fetches up to 10 results for relevance matching", async () => {
    const fetchMock = mockFetch(cotoResponse());
    vi.stubGlobal("fetch", fetchMock);

    await cotoAdapter("leche");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("Nrpp=10"),
      expect.anything()
    );
  });

  it("picks the best-matching product when the top result is irrelevant", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        cotoResponseMulti([
          {
            "product.displayName": ["Banana Cavendish X Kg"],
            "product.MARCA": ["NUESTRAS FRUTAS"],
            "sku.activePrice": ["1899.000000"],
            "product.mediumImage.url": ["https://static.cotodigital3.com.ar/banana.jpg"],
          },
          {
            "product.displayName": ["Manteca La Serenísima 200g"],
            "product.MARCA": ["LA SERENÍSIMA"],
            "sku.activePrice": ["3000.000000"],
            "product.mediumImage.url": ["https://static.cotodigital3.com.ar/manteca.jpg"],
          },
        ])
      )
    );

    const result = await cotoAdapter("manteca");

    expect(result.productName).toBe("Manteca La Serenísima 200g");
    expect(result.price).toBe(3000);
  });
});

// ---------------------------------------------------------------------------
// stripQueryNoise
// ---------------------------------------------------------------------------

describe("stripQueryNoise", () => {
  it("strips weight suffixes", () => {
    expect(stripQueryNoise("manteca 500gr")).toBe("manteca");
    expect(stripQueryNoise("aceite 1l")).toBe("aceite");
    expect(stripQueryNoise("harina 1kg")).toBe("harina");
    expect(stripQueryNoise("yogur 200g")).toBe("yogur");
    expect(stripQueryNoise("leche 1lt")).toBe("leche");
    expect(stripQueryNoise("jugo 500ml")).toBe("jugo");
  });

  it("strips percentage values", () => {
    expect(stripQueryNoise("leche 3%")).toBe("leche");
    expect(stripQueryNoise("leche larga vida 3% 1l")).toBe("leche larga vida");
  });

  it("keeps the core product name intact", () => {
    expect(stripQueryNoise("leche entera")).toBe("leche entera");
    expect(stripQueryNoise("manteca")).toBe("manteca");
  });

  it("is case-insensitive for the unit", () => {
    expect(stripQueryNoise("Manteca 500GR")).toBe("Manteca");
    expect(stripQueryNoise("Aceite 1L")).toBe("Aceite");
  });

  it("falls back to the original when the result would be empty", () => {
    expect(stripQueryNoise("500gr")).toBe("500gr");
  });
});

// ---------------------------------------------------------------------------
// vtexAdapter — relevance matching
// ---------------------------------------------------------------------------

describe("vtexAdapter relevance matching", () => {
  it("fetches up to 10 results", async () => {
    const fetchMock = mockFetch(vtexProduct());
    vi.stubGlobal("fetch", fetchMock);

    await vtexAdapter("disco", "manteca");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("_to=9"),
      expect.anything()
    );
  });

  it("returns the candidate whose name best matches the query over the top result", async () => {
    const products = [
      {
        productName: "Palmeritas De Manteca 200 Grs",
        brand: "ELABORACION PROPIA",
        link: "https://www.disco.com.ar/palmeritas",
        items: [{ images: [], sellers: [{ commertialOffer: { Price: 6499 } }] }],
      },
      {
        productName: "Manteca La Serenísima 200g",
        brand: "LA SERENÍSIMA",
        link: "https://www.disco.com.ar/manteca",
        items: [{ images: [], sellers: [{ commertialOffer: { Price: 4600 } }] }],
      },
    ];
    vi.stubGlobal("fetch", mockFetch(products));

    const result = await vtexAdapter("disco", "manteca");

    expect(result.productName).toBe("Manteca La Serenísima 200g");
    expect(result.price).toBe(4600);
  });

  it("falls back to the first product when no candidate matches the query", async () => {
    vi.stubGlobal("fetch", mockFetch(vtexProduct()));

    const result = await vtexAdapter("disco", "xyz_nonexistent");

    expect(result.productName).toBe("Leche La Serenísima 1L");
  });
});

// ---------------------------------------------------------------------------
// parseSizeTokens
// ---------------------------------------------------------------------------

describe("parseSizeTokens", () => {
  it("returns empty array for a query with no size tokens", () => {
    expect(parseSizeTokens("manteca")).toHaveLength(0);
    expect(parseSizeTokens("leche entera")).toHaveLength(0);
  });

  it("extracts gram patterns — matches all supermarket formats", () => {
    const [pat] = parseSizeTokens("manteca 500gr");
    expect(pat).toBeDefined();
    expect(pat!.test("Manteca Tonadita 500g")).toBe(true);
    expect(pat!.test("Manteca Tonadita 500 Gr")).toBe(true);
    expect(pat!.test("Manteca Tonadita 500 Grs")).toBe(true);
    expect(pat!.test("Manteca Tonadita 500 Grm")).toBe(true);
    expect(pat!.test("Manteca Tonadita 200g")).toBe(false);
  });

  it("extracts liter patterns — matches all supermarket formats", () => {
    const [pat] = parseSizeTokens("leche 1l");
    expect(pat).toBeDefined();
    expect(pat!.test("Leche La Serenísima 1L")).toBe(true);
    expect(pat!.test("Leche La Serenísima 1lt")).toBe(true);
    expect(pat!.test("Leche La Serenísima 1 Lt")).toBe(true);
    expect(pat!.test("Leche La Serenísima 1 Lts")).toBe(true);
    expect(pat!.test("Leche La Serenísima 2l")).toBe(false);
  });

  it("handles percentage in query and ignores it", () => {
    const patterns = parseSizeTokens("leche larga vida 3% 1l");
    expect(patterns).toHaveLength(1); // only 1l, not 3%
    expect(patterns[0]!.test("Leche 1 Lt")).toBe(true);
  });

  it("extracts ml and kg patterns", () => {
    const [mlPat] = parseSizeTokens("aceite 500ml");
    expect(mlPat!.test("Aceite 500ml")).toBe(true);
    expect(mlPat!.test("Aceite 500 ML")).toBe(true);
    expect(mlPat!.test("Aceite 250ml")).toBe(false);

    const [kgPat] = parseSizeTokens("harina 1kg");
    expect(kgPat!.test("Harina 1kg")).toBe(true);
    expect(kgPat!.test("Harina 1 KG")).toBe(true);
    expect(kgPat!.test("Harina 2kg")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Size-aware scoring
// ---------------------------------------------------------------------------

describe("vtexAdapter — size-aware scoring", () => {
  it("prefers the product whose name matches the requested size", async () => {
    const products = [
      {
        productName: "Leche Entera 2L",
        brand: "LA SERENÍSIMA",
        link: "https://www.disco.com.ar/leche-2l",
        items: [{ images: [], sellers: [{ commertialOffer: { Price: 3000 } }] }],
      },
      {
        productName: "Leche Entera 1 Lt",
        brand: "LA SERENÍSIMA",
        link: "https://www.disco.com.ar/leche-1l",
        items: [{ images: [], sellers: [{ commertialOffer: { Price: 1890 } }] }],
      },
    ];
    vi.stubGlobal("fetch", mockFetch(products));

    const sizePatterns = [/\b1\s*l(?:ts?)?\b/i];
    const result = await vtexAdapter("disco", "leche", sizePatterns);

    expect(result.productName).toBe("Leche Entera 1 Lt");
    expect(result.price).toBe(1890);
  });

  it("degrades gracefully when no product matches the requested size", async () => {
    const products = [
      {
        productName: "Manteca La Serenísima 200g",
        brand: "LA SERENÍSIMA",
        link: "https://www.disco.com.ar/manteca-200g",
        items: [{ images: [], sellers: [{ commertialOffer: { Price: 2200 } }] }],
      },
      {
        productName: "Manteca Tonadita 100g",
        brand: "TONADITA",
        link: "https://www.disco.com.ar/manteca-100g",
        items: [{ images: [], sellers: [{ commertialOffer: { Price: 1500 } }] }],
      },
    ];
    vi.stubGlobal("fetch", mockFetch(products));

    // No 500g manteca exists — falls back to best noun match
    const sizePatterns = [/\b500\s*g(?:r(?:[sm])?)?\b/i];
    const result = await vtexAdapter("disco", "manteca", sizePatterns);

    // Should return the best noun match (Manteca La Serenísima starts with "manteca")
    expect(result.productName).toBe("Manteca La Serenísima 200g");
  });
});

describe("cotoAdapter — size-aware scoring", () => {
  it("prefers the product whose name matches the requested size", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        cotoResponseMulti([
          {
            "product.displayName": ["Leche La Serenísima 2 Lts"],
            "product.MARCA": ["LA SERENÍSIMA"],
            "sku.activePrice": ["3200.000000"],
            "product.mediumImage.url": ["https://img.jpg"],
          },
          {
            "product.displayName": ["Leche La Serenísima 1 Lt"],
            "product.MARCA": ["LA SERENÍSIMA"],
            "sku.activePrice": ["1890.000000"],
            "product.mediumImage.url": ["https://img.jpg"],
          },
        ])
      )
    );

    const sizePatterns = [/\b1\s*l(?:ts?)?\b/i];
    const result = await cotoAdapter("leche", sizePatterns);

    expect(result.productName).toBe("Leche La Serenísima 1 Lt");
    expect(result.price).toBe(1890);
  });
});
