"use client";

import { useState, useEffect, useCallback } from "react";
import { getItemPrices } from "@/lib/price-actions";
import type { ItemPrices } from "@/lib/price-service";
import { formatARS } from "@/lib/price-adapters";
import type { Item } from "@/app/generated/prisma/client";

const SUPERMARKETS = [
  { key: "coto" as const, label: "Coto" },
  { key: "disco" as const, label: "Disco" },
  { key: "carrefour" as const, label: "Carrefour" },
];

type Props = {
  listId: string;
  items: Item[];
};

export default function PriceComparison({ listId, items }: Props) {
  const [prices, setPrices] = useState<ItemPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getItemPrices(listId, items.map((i) => i.name));
      setPrices(result);
    } finally {
      setLoading(false);
    }
  }, [listId, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch on mount and whenever the item count changes (new item added/removed)
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const totals =
    prices &&
    SUPERMARKETS.map(({ key }) => ({
      key,
      total: items.reduce((sum, item) => {
        const r = prices[item.name]?.find((p) => p.supermarket === key);
        return sum + (r?.price ?? 0);
      }, 0),
    }));

  const minTotal = totals
    ? Math.min(...totals.map((t) => t.total).filter((t) => t > 0))
    : null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm text-blue-500 hover:underline py-2"
      >
        Ver comparación de precios
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-semibold text-gray-900">Comparación de precios</span>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPrices}
            disabled={loading}
            className="text-xs text-blue-500 hover:underline disabled:opacity-40"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>

      {!prices ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          Buscando precios...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2 font-medium text-gray-500 w-2/5">
                  Producto
                </th>
                {SUPERMARKETS.map(({ key, label }) => (
                  <th key={key} className="text-right px-4 py-2 font-medium text-gray-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const row = prices[item.name] ?? [];
                const validPrices = row
                  .map((r) => r.price)
                  .filter((p): p is number => p != null);
                const minPrice = validPrices.length ? Math.min(...validPrices) : null;

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-gray-800 font-medium">
                      {item.name}
                      {item.quantity && (
                        <span className="ml-1 text-xs text-gray-400">({item.quantity})</span>
                      )}
                    </td>
                    {SUPERMARKETS.map(({ key }) => {
                      const r = row.find((p) => p.supermarket === key);
                      const isCheapest = r?.price != null && r.price === minPrice;
                      return (
                        <td key={key} className="px-4 py-2 text-right">
                          {r?.price != null ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span
                                className={`tabular-nums font-semibold ${
                                  isCheapest ? "text-green-600" : "text-gray-700"
                                }`}
                              >
                                {r.productUrl ? (
                                  <a
                                    href={r.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {r.priceText}
                                  </a>
                                ) : (
                                  r.priceText
                                )}
                              </span>
                              {(r.brand || r.productName) && (
                                <span className="text-xs text-gray-400 leading-tight max-w-[120px] text-right">
                                  {r.productUrl ? (
                                    <a
                                      href={r.productUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                    >
                                      {r.brand && (
                                        <span className="font-medium text-gray-500">{r.brand}</span>
                                      )}
                                      {r.brand && r.productName && " · "}
                                      {r.productName && (
                                        <span
                                          className="truncate block"
                                          title={r.productName}
                                        >
                                          {r.productName.length > 30
                                            ? r.productName.slice(0, 30) + "…"
                                            : r.productName}
                                        </span>
                                      )}
                                    </a>
                                  ) : (
                                    <>
                                      {r.brand && (
                                        <span className="font-medium text-gray-500">{r.brand}</span>
                                      )}
                                      {r.brand && r.productName && " · "}
                                      {r.productName && (
                                        <span
                                          className="truncate block"
                                          title={r.productName}
                                        >
                                          {r.productName.length > 30
                                            ? r.productName.slice(0, 30) + "…"
                                            : r.productName}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 tabular-nums">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-700">
                    Total estimado
                  </td>
                  {totals.map(({ key, total }) => {
                    const isCheapest = total > 0 && total === minTotal;
                    return (
                      <td
                        key={key}
                        className={`px-4 py-3 text-right tabular-nums font-semibold ${
                          isCheapest ? "text-green-600" : "text-gray-700"
                        }`}
                      >
                        {total > 0 ? (
                          formatARS(total)
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
          <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-50">
            Precios en ARS · Se actualizan cada 4 horas
          </p>
        </div>
      )}
    </div>
  );
}
