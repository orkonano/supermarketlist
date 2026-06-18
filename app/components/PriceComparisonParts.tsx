"use client";

import { formatARS } from "@/lib/price-adapters";
import type { Supermarket } from "@/lib/price-adapters";
import type { ItemPrices } from "@/lib/price-service";
import type { Item } from "@/app/generated/prisma/client";

const BORDER = "var(--border)";
const MUTED = "var(--text-muted)";
const PRIMARY = "var(--text-primary)";
const ACCENT = "var(--accent-500)";

export const SUPERMARKETS: { key: Supermarket; label: string }[] = [
  { key: "coto", label: "Coto" },
  { key: "disco", label: "Disco" },
  { key: "carrefour", label: "Carrefour" },
];

type Total = { key: string; total: number };
type PriceRow = ItemPrices[string];

export function ProductInfo({ brand, productName, url }: { brand?: string | null; productName?: string | null; url?: string | null }) {
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
    <span className="text-xs leading-tight max-w-[120px] text-right" style={{ color: MUTED }}>
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

export function CollapsedPriceButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-sm py-2 transition-colors hover:underline"
      style={{ color: "var(--brand-500)" }}
    >
      Ver comparación de precios
    </button>
  );
}

export function PriceComparisonHeader({
  loading,
  onRefresh,
  onClose,
}: {
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER }}>
      <span className="font-semibold" style={{ color: PRIMARY }}>
        Comparación de precios
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs transition-colors disabled:opacity-40 text-[var(--brand-500)] hover:text-[var(--brand-600)]"
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
        <button
          onClick={onClose}
          className="text-xs transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function ScoreboardCard({ label, total, cheapest }: { label: string; total: number; cheapest: boolean }) {
  return (
    <div
      className="rounded-xl p-3 text-center border transition-all"
      style={
        cheapest
          ? { background: "var(--accent-50)", borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` }
          : { background: "var(--surface-muted)", borderColor: BORDER }
      }
    >
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-1"
        style={{ color: cheapest ? ACCENT : MUTED }}
      >
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: cheapest ? ACCENT : PRIMARY }}>
        {total > 0 ? formatARS(total) : "—"}
      </div>
      {cheapest && (
        <div className="text-xs font-semibold mt-1" style={{ color: ACCENT }}>
          ★ Más barato
        </div>
      )}
    </div>
  );
}

export function PriceScoreboard({ totals, minTotal }: { totals: Total[]; minTotal: number | null }) {
  return (
    <div className="grid grid-cols-3 gap-3 p-4 border-b" style={{ borderColor: BORDER }}>
      {SUPERMARKETS.map(({ key, label }) => {
        const t = totals.find((t) => t.key === key)!;
        const cheapest = t.total > 0 && t.total === minTotal;
        return <ScoreboardCard key={key} label={label} total={t.total} cheapest={cheapest} />;
      })}
    </div>
  );
}

function PriceCell({ entry, isCheapest }: { entry: PriceRow[number] | undefined; isCheapest: boolean }) {
  if (entry?.price == null) {
    return <span className="tabular-nums" style={{ color: "var(--border-strong)" }}>—</span>;
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums font-semibold" style={{ color: isCheapest ? ACCENT : PRIMARY }}>
        {entry.productUrl ? (
          <a href={entry.productUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {entry.priceText}
          </a>
        ) : (
          entry.priceText
        )}
      </span>
      <ProductInfo brand={entry.brand} productName={entry.productName} url={entry.productUrl} />
    </div>
  );
}

function PriceTableRow({ item, row }: { item: Item; row: PriceRow }) {
  const validPrices = row.map((r) => r.price).filter((p): p is number => p != null);
  const minPrice = validPrices.length ? Math.min(...validPrices) : null;

  return (
    <tr className="border-b transition-colors" style={{ borderColor: BORDER }}>
      <td className="px-4 py-2 font-medium" style={{ color: PRIMARY }}>
        {item.name}
        {item.quantity && (
          <span className="ml-1 text-xs" style={{ color: MUTED }}>
            ({item.quantity})
          </span>
        )}
      </td>
      {SUPERMARKETS.map(({ key }) => {
        const entry = row.find((p) => p.supermarket === key);
        const isCheapest = entry?.price != null && entry.price === minPrice;
        return (
          <td key={key} className="px-4 py-2 text-right">
            <PriceCell entry={entry} isCheapest={isCheapest} />
          </td>
        );
      })}
    </tr>
  );
}

export function PriceDetailTable({ items, prices }: { items: Item[]; prices: ItemPrices }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ background: "var(--surface-muted)", borderColor: BORDER }}>
            <th className="text-left px-4 py-2 font-medium w-2/5" style={{ color: MUTED }}>
              Producto
            </th>
            {SUPERMARKETS.map(({ key, label }) => (
              <th key={key} className="text-right px-4 py-2 font-medium" style={{ color: MUTED }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <PriceTableRow key={item.id} item={item} row={prices[item.name] ?? []} />
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs border-t" style={{ color: MUTED, borderColor: BORDER }}>
        Precios en ARS · Se actualizan cada 4 horas
      </p>
    </div>
  );
}
