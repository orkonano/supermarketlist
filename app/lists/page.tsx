import Link from "next/link";
import { getUserLists, deleteList } from "@/lib/list-actions";
import { verifySession } from "@/lib/dal";
import { logout } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const session = await verifySession();
  const [lists, user] = await Promise.all([
    getUserLists(),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, emailVerified: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis listas</h1>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm text-gray-600">Hola, {user?.name}</span>
            <div className="flex items-center gap-3">
              <Link
                href="/settings/api-keys"
                className="text-xs text-gray-500 hover:text-blue-600 underline transition-colors"
              >
                API Keys
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>

        {!user?.emailVerified && (
          <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Revisá tu correo y hacé clic en el enlace de verificación para confirmar tu cuenta.
          </div>
        )}

        {params.error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {params.error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between"
            >
              <div>
                <Link
                  href={`/lists/${list.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {list.name}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                  {list._count.members} {list._count.members !== 1 ? "miembros" : "miembro"} ·{" "}
                  {list._count.items} {list._count.items !== 1 ? "productos" : "producto"}
                  {list.ownerId !== session.userId && (
                    <span className="ml-1">· de {list.owner.name}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/lists/${list.id}/share`}
                  className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded transition-colors"
                >
                  Compartir
                </Link>
                {list.ownerId === session.userId && (
                  <>
                    <Link
                      href={`/lists/${list.id}?edit=1`}
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded transition-colors"
                    >
                      Renombrar
                    </Link>
                    <form action={deleteList.bind(null, list.id)}>
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
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
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-lg">Todavía no tenés listas.</p>
              <p className="text-sm">¡Creá tu primera lista abajo!</p>
            </div>
          )}
        </div>

        <Link
          href="/lists/new"
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-2xl shadow-sm transition-colors"
        >
          <span className="text-xl">+</span>
          Nueva lista
        </Link>
      </div>
    </main>
  );
}
