import { describe, it, expect } from "vitest";
import { calculateTotals } from "../price-utils";
import type { ItemPrices } from "../price-service";

const SUPERMARKETS = ["coto", "disco", "carrefour"];

describe("calculateTotals", () => {
  it("sums prices per supermarket", () => {
    const items = [{ name: "Leche" }, { name: "Pan" }];
    const prices: ItemPrices = {
      Leche: [
        { supermarket: "coto", price: 100, priceText: "$100", productName: null, brand: null, productUrl: null, imageUrl: null },
        { supermarket: "disco", price: 120, priceText: "$120", productName: null, brand: null, productUrl: null, imageUrl: null },
        { supermarket: "carrefour", price: 110, priceText: "$110", productName: null, brand: null, productUrl: null, imageUrl: null },
      ],
      Pan: [
        { supermarket: "coto", price: 50, priceText: "$50", productName: null, brand: null, productUrl: null, imageUrl: null },
        { supermarket: "disco", price: 60, priceText: "$60", productName: null, brand: null, productUrl: null, imageUrl: null },
        { supermarket: "carrefour", price: 55, priceText: "$55", productName: null, brand: null, productUrl: null, imageUrl: null },
      ],
    };

    const totals = calculateTotals(items, prices, SUPERMARKETS);

    expect(totals.find((t) => t.key === "coto")?.total).toBe(150);
    expect(totals.find((t) => t.key === "disco")?.total).toBe(180);
    expect(totals.find((t) => t.key === "carrefour")?.total).toBe(165);
  });

  it("treats missing prices as 0", () => {
    const items = [{ name: "Leche" }];
    const prices: ItemPrices = {
      Leche: [
        { supermarket: "coto", price: null, priceText: "—", productName: null, brand: null, productUrl: null, imageUrl: null },
        { supermarket: "disco", price: 120, priceText: "$120", productName: null, brand: null, productUrl: null, imageUrl: null },
        { supermarket: "carrefour", price: null, priceText: "—", productName: null, brand: null, productUrl: null, imageUrl: null },
      ],
    };

    const totals = calculateTotals(items, prices, SUPERMARKETS);

    expect(totals.find((t) => t.key === "coto")?.total).toBe(0);
    expect(totals.find((t) => t.key === "disco")?.total).toBe(120);
  });

  it("returns zero totals when prices map is empty", () => {
    const items = [{ name: "Leche" }];
    const totals = calculateTotals(items, {}, SUPERMARKETS);
    totals.forEach((t) => expect(t.total).toBe(0));
  });

  it("returns one entry per supermarket key", () => {
    const totals = calculateTotals([], {}, SUPERMARKETS);
    expect(totals.map((t) => t.key)).toEqual(SUPERMARKETS);
  });
});
