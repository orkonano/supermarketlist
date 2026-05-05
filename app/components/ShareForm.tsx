"use client";

import { useTransition, useState } from "react";
import { inviteToList } from "@/lib/invite-actions";

export default function ShareForm({ listId }: { listId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email") as string;
    setMessage(null);
    startTransition(async () => {
      const result = await inviteToList(listId, email);
      if ("error" in result) {
        setMessage({ text: result.error, ok: false });
      } else {
        setMessage({ text: "Invite sent!", ok: true });
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="email"
        type="email"
        required
        placeholder="email@example.com"
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Invite"}
      </button>
      {message && (
        <p className={`text-xs mt-2 ${message.ok ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
