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
        setMessage({ text: "¡Invitación enviada!", ok: true });
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="email@example.com"
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px",
            fontSize: "14px",
            color: "var(--text-primary)",
            background: "var(--surface-raised)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: isPending ? "var(--brand-400)" : "var(--brand-500)",
            color: "white",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Enviando…" : "Invitar"}
        </button>
      </form>
      {message && (
        <p
          className="text-xs"
          style={{ color: message.ok ? "var(--brand-600)" : "var(--destructive-500)" }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
