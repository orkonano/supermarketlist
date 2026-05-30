import type { ItemPrices } from "./price-service";

export function calculateTotals(
  items: { name: string }[],
  prices: ItemPrices,
  supermarketKeys: string[]
): { key: string; total: number }[] {
  return supermarketKeys.map((key) => ({
    key,
    total: items.reduce((sum, item) => {
      const r = prices[item.name]?.find((p) => p.supermarket === key);
      return sum + (r?.price ?? 0);
    }, 0),
  }));
}
