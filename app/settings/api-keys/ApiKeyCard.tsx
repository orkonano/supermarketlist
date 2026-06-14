import { deleteApiKey } from "@/lib/api-key-actions";

type ApiKeyData = {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-AR");
}

export default function ApiKeyCard({ apiKey }: { apiKey: ApiKeyData }) {
  return (
    <div
      className="flex items-center justify-between p-4 border"
      style={{
        background: "var(--surface-raised)",
        borderColor: "var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {apiKey.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Creada {formatDate(apiKey.createdAt)}
          {apiKey.lastUsedAt && ` · Último uso ${formatDate(apiKey.lastUsedAt)}`}
          {apiKey.expiresAt && ` · Vence ${formatDate(apiKey.expiresAt)}`}
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await deleteApiKey(apiKey.id);
          const { revalidatePath } = await import("next/cache");
          revalidatePath("/settings/api-keys");
        }}
      >
        <button
          type="submit"
          className="text-xs px-3 py-1.5 rounded-md transition-colors border hover:bg-[var(--destructive-50)]"
          style={{ color: "var(--destructive-500)", borderColor: "var(--border)" }}
        >
          Revocar
        </button>
      </form>
    </div>
  );
}
