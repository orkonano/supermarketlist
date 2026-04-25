"use client";

import { useTransition } from "react";
import type { Item } from "@/app/generated/prisma/client";
import { toggleItem, deleteItem } from "@/lib/actions";

// Hoisted outside component — static JSX is never re-created (rendering-hoist-jsx)
const CheckIcon = (
  <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const DeleteIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function ItemRow({ item }: { item: Item }) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(() => toggleItem(item.id, !item.checked));
  }

  function handleDelete() {
    startTransition(() => deleteItem(item.id));
  }

  return (
    <li className={`flex items-center gap-3 px-4 py-3 group ${pending ? "opacity-50" : ""}`}>
      <button
        onClick={handleToggle}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
          item.checked
            ? "bg-green-500 border-green-500"
            : "border-gray-300 hover:border-green-400"
        }`}
        aria-label={item.checked ? "Uncheck item" : "Check item"}
      >
        {item.checked && CheckIcon}
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
          {item.name}
        </span>
        {item.quantity && (
          <span className="ml-2 text-xs text-gray-400">{item.quantity}</span>
        )}
        <div className="text-xs text-gray-400 mt-0.5">Added by {item.addedBy}</div>
      </div>

      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 transition-all"
        aria-label="Delete item"
      >
        {DeleteIcon}
      </button>
    </li>
  );
}
