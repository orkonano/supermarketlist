import Link from "next/link";
import { getUserLists, deleteList } from "@/lib/list-actions";
import { verifySession, getCurrentUser } from "@/lib/dal";
import AppShell from "@/app/components/AppShell";

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const session = await verifySession();
  const [lists, user] = await Promise.all([
    getUserLists(),
    getCurrentUser(session.userId),
  ]);

  return (
    <AppShell userName={user?.name ?? ""}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1
          className="text-3xl font-bold mb-8"
          style={{ color: "var(--text-primary)" }}
        >
          Mis listas
        </h1>

        {!user?.emailVerified && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm border"
            style={{
              background: "oklch(97% 0.05 85)",
              borderColor: "oklch(82% 0.08 85)",
              color: "oklch(40% 0.06 85)",
            }}
          >
            Revisá tu correo y hacé clic en el enlace de verificación para confirmar tu cuenta.
          </div>
        )}

        {params.error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm border"
            style={{
              background: "var(--destructive-50)",
              borderColor: "var(--destructive-500)",
              color: "var(--destructive-500)",
            }}
          >
            {params.error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {lists.map((list) => (
            <div
              key={list.id}
              data-testid="list-card"
              className="rounded-xl p-4 flex items-center justify-between border transition-shadow hover:shadow-md"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border)",
              }}
            >
              <div>
                <Link
                  href={`/lists/${list.id}`}
                  className="text-lg font-semibold transition-colors hover:underline"
                  style={{ color: "var(--text-primary)" }}
                >
                  {list.name}
                </Link>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {list._count.members}{" "}
                  {list._count.members !== 1 ? "miembros" : "miembro"} ·{" "}
                  {list._count.items}{" "}
                  {list._count.items !== 1 ? "productos" : "producto"}
                  {list.ownerId !== session.userId && (
                    <span className="ml-1">· de {list.owner.name}</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href={`/lists/${list.id}/share`}
                  className="text-xs px-2 py-1.5 rounded-md transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Compartir
                </Link>
                {list.ownerId === session.userId && (
                  <>
                    <Link
                      href={`/lists/${list.id}?edit=1`}
                      className="text-xs px-2 py-1.5 rounded-md transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Renombrar
                    </Link>
                    <form action={deleteList.bind(null, list.id)}>
                      <button
                        type="submit"
                        className="text-xs px-2 py-1.5 rounded-md transition-colors"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Eliminar
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          ))}

          {lists.length === 0 && (
            <div
              className="text-center py-16 rounded-xl border-2 border-dashed"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <div className="text-5xl mb-4">🛒</div>
              <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
                Todavía no tenés listas.
              </p>
              <p className="text-sm mt-1">¡Creá tu primera lista abajo!</p>
            </div>
          )}
        </div>

        <Link
          href="/lists/new"
          className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-colors"
          style={{
            background: "var(--brand-500)",
            color: "white",
          }}
        >
          <span className="text-xl leading-none">+</span>
          Nueva lista
        </Link>
      </div>
    </AppShell>
  );
}
