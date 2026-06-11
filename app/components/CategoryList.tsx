import type { Item } from "@/app/generated/prisma/client";
import ItemRow from "./ItemRow";

const BORDER = "var(--border)";

export default function CategoryList({
  grouped,
  listId,
}: {
  grouped: Record<string, Item[]>;
  listId: string;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, catItems]) => (
        <div
          key={category}
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--surface-raised)", borderColor: BORDER }}
        >
          <div
            className="px-4 py-2 border-b"
            style={{ background: "var(--surface-muted)", borderColor: BORDER }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {category}
            </span>
          </div>
          <ul className="divide-y" style={{ borderColor: BORDER }}>
            {catItems.map((item) => (
              <ItemRow key={item.id} item={item} listId={listId} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
