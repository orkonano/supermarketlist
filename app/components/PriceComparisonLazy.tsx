"use client";

import dynamic from "next/dynamic";
import type { Item } from "@/app/generated/prisma/client";

const PriceComparison = dynamic(() => import("./PriceComparison"), {
  loading: () => (
    <div className="bg-white rounded-2xl shadow-sm p-4 text-sm text-gray-400">
      Cargando comparación de precios…
    </div>
  ),
  ssr: false,
});

type Props = { listId: string; items: Item[] };

export default function PriceComparisonLazy({ listId, items }: Props) {
  return <PriceComparison listId={listId} items={items} />;
}
