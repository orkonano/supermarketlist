import type { Item } from "@/app/generated/prisma/client";

export function groupItemsByCategory(items: Item[], categories: string[]): Record<string, Item[]> {
  const grouped = categories.reduce<Record<string, Item[]>>((acc, cat) => {
    const catItems = items.filter((i) => (i.category || "Otros") === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});
  const uncategorized = items.filter((i) => !i.category || !categories.includes(i.category));
  if (uncategorized.length > 0) grouped["Otros"] = uncategorized;
  return grouped;
}
