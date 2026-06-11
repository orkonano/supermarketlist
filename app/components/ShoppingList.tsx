import type { Item } from "@/app/generated/prisma/client";
import { groupItemsByCategory } from "@/lib/shopping-utils";
import AddItemForm from "./AddItemForm";
import CategoryList from "./CategoryList";
import MonthNav from "./MonthNav";
import PriceComparisonLazy from "./PriceComparisonLazy";

const CATEGORIES = [
  "Frutas y Verduras", "Lácteos", "Carnes", "Panadería", "Congelados",
  "Despensa", "Bebidas", "Limpieza", "Higiene Personal", "Otros",
];

type Props = {
  items: Item[];
  month: number;
  year: number;
  listId: string;
};

export default function ShoppingList({ items, month, year, listId }: Props) {
  const grouped = groupItemsByCategory(items, CATEGORIES);
  const checked = items.filter((i) => i.checked).length;
  const total = items.length;

  return (
    <div className="space-y-6">
      <MonthNav month={month} year={year} listId={listId} checked={checked} total={total} />

      <AddItemForm month={month} year={year} categories={CATEGORIES} listId={listId} />

      {total === 0 ? (
        <div
          className="text-center py-16 rounded-xl border-2 border-dashed"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <div className="text-5xl mb-4">🛒</div>
          <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
            Todavía no hay productos este mes.
          </p>
          <p className="text-sm mt-1">¡Agregá el primero arriba!</p>
        </div>
      ) : (
        <>
          <CategoryList grouped={grouped} listId={listId} />
          <PriceComparisonLazy listId={listId} items={items} />
        </>
      )}
    </div>
  );
}
