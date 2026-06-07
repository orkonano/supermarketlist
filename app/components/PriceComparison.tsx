"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getItemPrices } from "@/lib/price-actions";
import type { ItemPrices } from "@/lib/price-service";
import { formatARS } from "@/lib/price-adapters";
import { calculateTotals } from "@/lib/price-utils";
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

function ProductInfo({ brand, productName, url }: { brand?: string | null; productName?: string | null; url?: string | null }) {
  if (!brand && !productName) return null;
  const content = (
    <>
      {brand && <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{brand}</span>}
      {brand && productName && " · "}
      {productName && (
        <span className="truncate block" title={productName}>
          {productName.length > 30 ? productName.slice(0, 30) + "…" : productName}
        </span>
      )}
    </>
  );
  return (
    <span className="text-xs leading-tight max-w-[120px] text-right" style={{ color: "var(--text-muted)" }}>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {content}
        </a>
      ) : (
        content
      )}
    </span>
  );
}

export default function PriceComparison({ listId, items }: Props) {
  const [prices, setPrices] = useState<ItemPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const itemNames = useMemo(() => items.map((i) => i.name), [items]);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getItemPrices(listId, itemNames);
      setPrices(result);
    } finally {
      setLoading(false);
    }
  }, [listId, itemNames]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const { totals, minTotal } = useMemo(() => {
    if (!prices) return { totals: null, minTotal: null };
    const totals = calculateTotals(items, prices, SUPERMARKETS.map((s) => s.key));
    const minTotal = Math.min(...totals.map((t) => t.total).filter((t) => t > 0));
    return { totals, minTotal };
  }, [prices, items]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm py-2 transition-colors hover:underline"
        style={{ color: "var(--brand-500)" }}
      >
        Ver comparación de precios
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Comparación de precios
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPrices}
            disabled={loading}
            className="text-xs transition-colors disabled:opacity-40"
            style={{ color: "var(--brand-500)" }}
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Cerrar
          </button>
        </div>
      </div>

      {!prices ? (
        <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
          Buscando precios...
        </div>
      ) : (
        <div>
          {/* Scoreboard totals */}
          {totals && (
            <div className="grid grid-cols-3 gap-3 p-4 border-b" style={{ borderColor: "var(--border)" }}>
              {SUPERMARKETS.map(({ key, label }) => {
                const t = totals.find((t) => t.key === key)!;
                const cheapest = t.total > 0 && t.total === minTotal;
                return (
                  <div
                    key={key}
                    className="rounded-xl p-3 text-center border transition-all"
                    style={
                      cheapest
                        ? {
                            background: "var(--accent-50)",
                            borderColor: "var(--accent-500)",
                            boxShadow: "0 0 0 1px var(--accent-500)",
                          }
                        : {
                            background: "var(--surface-muted)",
                            borderColor: "var(--border)",
                          }
                    }
                  >
                    <div
                      className="text-xs font-semibold uppercase tracking-widest mb-1"
                      style={{ color: cheapest ? "var(--accent-500)" : "var(--text-muted)" }}
                    >
                      {label}
                    </div>
                    <div
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: cheapest ? "var(--accent-500)" : "var(--text-primary)" }}
                    >
                      {t.total > 0 ? formatARS(t.total) : "—"}
                    </div>
                    {cheapest && (
                      <div
                        className="text-xs font-semibold mt-1"
                        style={{ color: "var(--accent-500)" }}
                      >
                        ★ Más barato
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Detail table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}>
                  <th className="text-left px-4 py-2 font-medium w-2/5" style={{ color: "var(--text-muted)" }}>
                    Producto
                  </th>
                  {SUPERMARKETS.map(({ key, label }) => (
                    <th key={key} className="text-right px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const row = prices[item.name] ?? [];
                  const validPrices = row.map((r) => r.price).filter((p): p is number => p != null);
                  const minPrice = validPrices.length ? Math.min(...validPrices) : null;

                  return (
                    <tr
                      key={item.id}
                      className="border-b transition-colors"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="px-4 py-2 font-medium" style={{ color: "var(--text-primary)" }}>
                        {item.name}
                        {item.quantity && (
                          <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>
                            ({item.quantity})
                          </span>
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
                                  className="tabular-nums font-semibold"
                                  style={{ color: isCheapest ? "var(--accent-500)" : "var(--text-primary)" }}
                                >
                                  {r.productUrl ? (
                                    <a href={r.productUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                      {r.priceText}
                                    </a>
                                  ) : (
                                    r.priceText
                                  )}
                                </span>
                                <ProductInfo brand={r.brand} productName={r.productName} url={r.productUrl} />
                              </div>
                            ) : (
                              <span className="tabular-nums" style={{ color: "var(--border-strong)" }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs border-t" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
              Precios en ARS · Se actualizan cada 4 horas
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
