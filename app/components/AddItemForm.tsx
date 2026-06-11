"use client";

import { useRef, useState, useTransition } from "react";
import { addListItem } from "@/lib/list-actions";
import { FormMessage } from "./form-helpers";

type Props = {
  month: number;
  year: number;
  categories: string[];
  listId: string;
};

const inputStyle = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
  fontSize: "14px",
  color: "var(--text-primary)",
  background: "var(--surface-raised)",
  width: "100%",
  outline: "none",
};

function AddItemActions({ isPending, onClose }: { isPending: boolean; onClose: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-2 px-4 rounded-lg text-sm transition-colors"
        style={{
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          background: "transparent",
        }}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
        style={{
          background: isPending ? "var(--brand-400)" : "var(--brand-500)",
          color: "white",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "Agregando…" : "Agregar"}
      </button>
    </div>
  );
}

type ExpandedProps = {
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
  error: string | null;
  categories: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

function AddItemFormExpanded({ formRef, isPending, error, categories, onClose, onSubmit }: ExpandedProps) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
    >
      <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Nuevo producto
      </h2>
      <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
        <FormMessage message={error ?? undefined} />
        <input
          name="name"
          required
          placeholder="Nombre del producto *"
          autoFocus
          style={inputStyle}
        />
        <div className="flex gap-2">
          <input
            name="quantity"
            placeholder="Cantidad (ej. 2kg)"
            style={{ ...inputStyle, width: "auto", flex: 1 }}
          />
          <select
            name="category"
            style={{ ...inputStyle, width: "auto", flex: 1 }}
          >
            <option value="">Categoría</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <AddItemActions isPending={isPending} onClose={onClose} />
      </form>
    </div>
  );
}

export default function AddItemForm({ month, year, categories, listId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("month", String(month));
    fd.set("year", String(year));
    startTransition(async () => {
      const result = await addListItem(listId, fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-colors"
        style={{ background: "var(--brand-500)", color: "white" }}
      >
        <span className="text-xl leading-none">+</span>
        Agregar producto
      </button>
    );
  }

  return (
    <AddItemFormExpanded
      formRef={formRef}
      isPending={isPending}
      error={error}
      categories={categories}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit}
    />
  );
}
