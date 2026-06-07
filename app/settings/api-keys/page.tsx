import Link from "next/link";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { getUserApiKeys, createApiKey, deleteApiKey } from "@/lib/api-key-actions";
import AppShell from "@/app/components/AppShell";

export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const session = await verifySession();
  const [keys, params, user] = await Promise.all([
    getUserApiKeys(),
    searchParams,
    getCurrentUser(session.userId),
  ]);

  return (
    <AppShell userName={user?.name ?? ""}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/lists"
            className="text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ← Volver
          </Link>
          <span style={{ color: "var(--border-strong)" }}>/</span>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            API Keys
          </h1>
        </div>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Conectá herramientas externas como Claude. Cada key da acceso completo — nunca la compartás.
        </p>

        {/* Error banner */}
        {params.error && (
          <div
            className="mb-4 px-4 py-3 text-sm rounded-lg border"
            style={{
              background: "var(--destructive-50)",
              borderColor: "var(--destructive-500)",
              color: "var(--destructive-500)",
            }}
          >
            {params.error}
          </div>
        )}

        {/* New key reveal */}
        {params.created && (
          <div
            className="mb-6 p-4 border rounded-xl"
            style={{
              background: "var(--brand-50)",
              borderColor: "var(--brand-400)",
            }}
          >
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--brand-600)" }}>
              ¡API Key creada! Guardala ahora — no la vamos a mostrar de nuevo.
            </p>
            <code
              className="block text-xs font-mono break-all px-3 py-2 rounded-lg"
              style={{
                background: "color-mix(in oklch, var(--brand-500) 12%, white)",
                color: "var(--brand-600)",
              }}
            >
              {params.created}
            </code>
            <div className="mt-3">
              <a
                href={`/docs?token=${encodeURIComponent(params.created)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium underline underline-offset-2 transition-colors"
                style={{ color: "var(--brand-500)" }}
              >
                Probar en el explorador →
              </a>
            </div>
          </div>
        )}

        {/* Create form */}
        <section
          className="border p-5 mb-6"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            Generá una nueva API Key
          </h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              const name = formData.get("name") as string;
              const result = await createApiKey(name);
              if ("error" in result) {
                const { redirect } = await import("next/navigation");
                redirect(`/settings/api-keys?error=${encodeURIComponent(result.error ?? "")}`);
              }
              const { redirect } = await import("next/navigation");
              redirect(`/settings/api-keys?created=${encodeURIComponent(result.key ?? "")}`);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              name="name"
              placeholder="ej: Claude Desktop"
              required
              className="flex-1 px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white transition-colors flex-shrink-0"
              style={{
                borderRadius: "var(--radius-md)",
                background: "var(--brand-500)",
              }}
            >
              Crear
            </button>
          </form>
        </section>

        {/* Key list */}
        <div className="space-y-3">
          {keys.length === 0 ? (
            <div
              className="text-center py-12 border-2 border-dashed"
              style={{
                borderColor: "var(--border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--text-muted)",
              }}
            >
              <div className="text-3xl mb-3">🔑</div>
              <p className="text-sm">Todavía no tenés API Keys.</p>
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border"
                style={{
                  background: "var(--surface-raised)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {key.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Creada {key.createdAt.toLocaleDateString("es-AR")}
                    {key.lastUsedAt && ` · Último uso ${key.lastUsedAt.toLocaleDateString("es-AR")}`}
                    {key.expiresAt && ` · Vence ${key.expiresAt.toLocaleDateString("es-AR")}`}
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteApiKey(key.id);
                    const { revalidatePath } = await import("next/cache");
                    revalidatePath("/settings/api-keys");
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs px-3 py-1.5 rounded-md transition-colors border"
                    style={{
                      color: "var(--destructive-500)",
                      borderColor: "var(--border)",
                    }}
                  >
                    Revocar
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
