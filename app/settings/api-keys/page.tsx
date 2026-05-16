import Link from "next/link";
import { getUserApiKeys, createApiKey, deleteApiKey } from "@/lib/api-key-actions";

export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const [keys, params] = await Promise.all([getUserApiKeys(), searchParams]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/lists" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            ← Volver
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        </div>

        {params.error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {params.error}
          </div>
        )}

        {params.created && (
          <div className="mb-6 px-4 py-4 bg-green-50 border border-green-200 rounded-2xl">
            <p className="text-sm font-semibold text-green-800 mb-1">¡API Key creada! Guardala ahora — no la vamos a mostrar de nuevo.</p>
            <code className="block text-xs font-mono text-green-900 bg-green-100 rounded-lg px-3 py-2 break-all">
              {params.created}
            </code>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-6">
          Usá estas API Keys para conectar herramientas externas como Claude. Cada API Key te da acceso completo a tu cuenta.
          Nunca la compartás.
        </p>

        {/* Create form */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Generá una nueva API Key</h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              const name = formData.get("name") as string;
              const result = await createApiKey(name);
              if ("error" in result) {
                // Surface error via redirect pattern used throughout the app
                const { redirect } = await import("next/navigation");
                redirect(`/settings/api-keys?error=${encodeURIComponent(result.error)}`);
              }
              // After creation, redirect with the raw key to display once
              const { redirect } = await import("next/navigation");
              redirect(`/settings/api-keys?created=${encodeURIComponent(result.key)}`);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              name="name"
              placeholder="Nombre de la API Key, ej: Claude Desktop"
              required
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Crear
            </button>
          </form>
        </div>

        {/* Key list */}
        <div className="space-y-3">
          {keys.length === 0 && (
            <p className="text-center py-8 text-gray-400 text-sm">Todavía no tenés API Keys.</p>
          )}
          {keys.map((key) => (
            <div key={key.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{key.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
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
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                >
                  Revocar
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
