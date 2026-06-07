"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { createList } from "@/lib/list-actions";

export default function NewListForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get("name") as string;
    setError(null);
    startTransition(async () => {
      try {
        const list = await createList(name);
        router.push(`/lists/${list.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Algo salió mal.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p
          className="text-sm px-3 py-2 rounded-lg"
          style={{
            color: "var(--destructive-500)",
            background: "var(--destructive-50)",
          }}
        >
          {error}
        </p>
      )}
      <input
        name="name"
        required
        autoFocus
        placeholder="ej: Casa, Trabajo, Cumpleaños…"
        className="w-full px-4 py-3 text-base focus:outline-none transition-colors"
        style={{
          borderRadius: "var(--radius-md)",
          border: "1.5px solid var(--border-strong)",
          background: "var(--surface)",
          color: "var(--text-primary)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-500)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
      />
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 px-4 text-sm font-medium transition-colors"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            background: "var(--surface-raised)",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 px-4 text-sm font-semibold text-white transition-all"
          style={{
            borderRadius: "var(--radius-md)",
            background: isPending ? "var(--brand-400)" : "var(--brand-500)",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Creando…" : "Crear lista"}
        </button>
      </div>
    </form>
  );
}
