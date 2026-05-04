"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { updateList } from "@/lib/list-actions";

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
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Rename list</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input
          name="name"
          defaultValue={currentName}
          required
          autoFocus
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={() => router.replace(`/lists/${listId}`)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
