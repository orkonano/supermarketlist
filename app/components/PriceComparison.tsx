"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
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

const fetcher = (url: string): Promise<ItemPrices> => fetch(url).then((r) => r.json());

type Props = {
  listId: string;
  items: Item[];
};

export default function PriceComparison({ listId, items }: Props) {
  const [open, setOpen] = useState(true);

  const itemNamesKey = JSON.stringify(items.map((i) => i.name));
  const priceUrl = useMemo(
    () => {
      const names: string[] = JSON.parse(itemNamesKey);
      return `/api/lists/${listId}/prices?` + names.map((n) => `name=${encodeURIComponent(n)}`).join("&");
    },
    [listId, itemNamesKey],
  );

  const { data: prices, isValidating, mutate } = useSWR<ItemPrices>(priceUrl, fetcher);

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
      <PriceComparisonHeader loading={isValidating} onRefresh={() => mutate()} onClose={() => setOpen(false)} />

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
