"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getItemPrices } from "@/lib/price-actions";
import type { ItemPrices } from "@/lib/price-service";
import { calculateTotals } from "@/lib/price-utils";
import type { Item } from "@/app/generated/prisma/client";
import {
  SUPERMARKETS,
  CollapsedPriceButton,
  PriceComparisonHeader,
  PriceScoreboard,
  PriceDetailTable,
} from "./PriceComparisonParts";

type Props = {
  listId: string;
  items: Item[];
};

export default function PriceComparison({ listId, items }: Props) {
  const [prices, setPrices] = useState<ItemPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  // `items` is a fresh array on every parent re-render — and a Server Action call
  // auto-revalidates the route, so `ShoppingList` re-renders and hands us a new `items`
  // reference each time. Keying `itemNames` on the reference would give `fetchPrices` a
  // new identity, re-firing the effect below in an infinite fetch→revalidate→re-render
  // loop. Key on the serialized names instead so the identity is stable when names are.
  const itemNamesKey = JSON.stringify(items.map((i) => i.name));
  const itemNames = useMemo(() => JSON.parse(itemNamesKey) as string[], [itemNamesKey]);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getItemPrices(listId, itemNames);
      setPrices(result);
    } finally {
      setLoading(false);
    }
  }, [listId, itemNames]);

  // fetchPrices is async (useCallback); setState is not called synchronously here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPrices();
  }, [fetchPrices]);

  const { totals, minTotal } = useMemo(() => {
    if (!prices) return { totals: null, minTotal: null };
    const totals = calculateTotals(items, prices, SUPERMARKETS.map((s) => s.key));
    const minTotal = Math.min(...totals.map((t) => t.total).filter((t) => t > 0));
    return { totals, minTotal };
  }, [prices, items]);

  if (!open) {
    return <CollapsedPriceButton onOpen={() => setOpen(true)} />;
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
    >
      <PriceComparisonHeader loading={loading} onRefresh={fetchPrices} onClose={() => setOpen(false)} />

      {!prices ? (
        <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
          Buscando precios...
        </div>
      ) : (
        <div>
          {totals && <PriceScoreboard totals={totals} minTotal={minTotal} />}
          <PriceDetailTable items={items} prices={prices} />
        </div>
      )}
    </div>
  );
}
