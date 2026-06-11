"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { updateList } from "@/lib/list-actions";

const inputStyle = {
  flex: 1,
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
  fontSize: "14px",
  color: "var(--text-primary)",
  background: "var(--surface-raised)",
  outline: "none",
};

function RenameListActions({ isPending, onCancel }: { isPending: boolean; onCancel: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-2 rounded-lg text-sm transition-colors"
        style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent" }}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{
          background: isPending ? "var(--brand-400)" : "var(--brand-500)",
          color: "white",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "Guardando…" : "Guardar"}
      </button>
    </>
  );
}

export default function RenameListForm({ listId, currentName }: { listId: string; currentName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get("name") as string;
    setError(null);
    startTransition(async () => {
      try {
        await updateList(listId, name);
        router.replace(`/lists/${listId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Algo salió mal.");
      }
    });
  }

  return (
    <div
      className="rounded-xl p-5 mb-5 border"
      style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
        Renombrar lista
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        {error && (
          <p className="text-xs" style={{ color: "var(--destructive-500)" }}>{error}</p>
        )}
        <input name="name" defaultValue={currentName} required autoFocus style={inputStyle} />
        <RenameListActions isPending={isPending} onCancel={() => router.replace(`/lists/${listId}`)} />
      </form>
    </div>
  );
}
