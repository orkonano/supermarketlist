"use client";

import { useRef, useState, useTransition } from "react";
import { addListItem } from "@/lib/list-actions";

type Props = {
  month: number;
  year: number;
  categories: string[];
  listId: string;
};

export default function AddItemForm({ month, year, categories, listId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("month", String(month));
    fd.set("year", String(year));
    startTransition(async () => {
      await addListItem(listId, fd);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-2xl shadow-sm transition-colors"
      >
        <span className="text-xl">+</span>
        Agregar producto
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Nuevo producto</h2>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <input
          name="name"
          required
          placeholder="Nombre del producto *"
          autoFocus
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <div className="flex gap-2">
          <input
            name="quantity"
            placeholder="Cantidad (ej. 2kg)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <select
            name="category"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          >
            <option value="">Categoría</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <input
          name="addedBy"
          required
          placeholder="Tu nombre *"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {isPending ? "Agregando…" : "Agregar"}
          </button>
        </div>
      </form>
    </div>
  );
}
