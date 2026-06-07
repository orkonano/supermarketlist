"use client";

import { useOptimistic, useTransition } from "react";
import type { Item } from "@/app/generated/prisma/client";
import { toggleListItem, deleteListItem } from "@/lib/list-actions";

const CheckIcon = (
  <svg className="w-full h-full p-0.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const DeleteIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function ItemRow({ item, listId }: { item: Item; listId: string }) {
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(item.checked);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      setOptimisticChecked(!item.checked);
      await toggleListItem(listId, item.id, !item.checked);
    });
  }

  function handleDelete() {
    startTransition(() => deleteListItem(listId, item.id));
  }

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 group transition-opacity ${pending ? "opacity-40" : "opacity-100"}`}
    >
      <button
        onClick={handleToggle}
        className="w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all duration-150 ease-out"
        style={
          optimisticChecked
            ? {
                backgroundColor: "var(--brand-500)",
                borderColor: "var(--brand-500)",
                transform: "scale(1.1)",
              }
            : {
                borderColor: "var(--border-strong)",
              }
        }
        aria-label={optimisticChecked ? "Desmarcar producto" : "Marcar producto"}
      >
        {optimisticChecked && CheckIcon}
      </button>

      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-medium transition-all duration-200"
          style={
            optimisticChecked
              ? { textDecoration: "line-through", color: "var(--text-muted)", opacity: 0.7 }
              : { color: "var(--text-primary)" }
          }
        >
          {item.name}
        </span>
        {item.quantity && (
          <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {item.quantity}
          </span>
        )}
        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Agregado por {item.addedBy}
        </div>
      </div>

      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all duration-150"
        style={{ color: "var(--text-muted)" }}
        aria-label="Eliminar producto"
      >
        {DeleteIcon}
      </button>
    </li>
  );
}
