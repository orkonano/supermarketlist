import type { Item } from "@/app/generated/prisma/client";
import { groupItemsByCategory } from "@/lib/shopping-utils";
import AddItemForm from "./AddItemForm";
import ItemRow from "./ItemRow";
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
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🛒</div>
          <p className="text-lg">Todavía no hay productos este mes.</p>
          <p className="text-sm">¡Agregá el primero arriba!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {category}
                  </span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {catItems.map((item) => (
                    <ItemRow key={item.id} item={item} listId={listId} />
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <PriceComparisonLazy listId={listId} items={items} />
        </>
      )}
    </div>
  );
}
