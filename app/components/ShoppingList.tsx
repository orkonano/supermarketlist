"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Item } from "@/app/generated/prisma/client";
import AddItemForm from "./AddItemForm";
import ItemRow from "./ItemRow";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

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
  const router = useRouter();
  const [, startTransition] = useTransition();

  const grouped = CATEGORIES.reduce<Record<string, Item[]>>((acc, cat) => {
    const catItems = items.filter((i) => (i.category || "Other") === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  const uncategorized = items.filter(
    (i) => !i.category || !CATEGORIES.includes(i.category)
  );
  if (uncategorized.length > 0) grouped["Other"] = uncategorized;

  function navigate(m: number, y: number) {
    startTransition(() => {
      router.push(`/lists/${listId}?month=${m}&year=${y}`);
    });
  }

  function prevMonth() {
    if (month === 1) navigate(12, year - 1);
    else navigate(month - 1, year);
  }

  function nextMonth() {
    if (month === 12) navigate(1, year + 1);
    else navigate(month + 1, year);
  }

  const checked = items.filter((i) => i.checked).length;
  const total = items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm p-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Mes anterior"
        >
          &#8592;
        </button>
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900">
            {MONTHS[month - 1]} {year}
          </div>
          {total > 0 && (
            <div className="text-sm text-gray-400">
              {checked}/{total} productos marcados
            </div>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Mes siguiente"
        >
          &#8594;
        </button>
      </div>

      <AddItemForm month={month} year={year} categories={CATEGORIES} listId={listId} />

      {total === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🛒</div>
          <p className="text-lg">Todavía no hay productos este mes.</p>
          <p className="text-sm">¡Agregá el primero arriba!</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
