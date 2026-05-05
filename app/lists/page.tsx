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
      select: { name: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Lists</h1>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm text-gray-600">Hi, {user?.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

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
                  {list._count.members} member{list._count.members !== 1 ? "s" : ""} ·{" "}
                  {list._count.items} item{list._count.items !== 1 ? "s" : ""}
                  {list.ownerId !== session.userId && (
                    <span className="ml-1">· owned by {list.owner.name}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/lists/${list.id}/share`}
                  className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded transition-colors"
                >
                  Share
                </Link>
                {list.ownerId === session.userId && (
                  <>
                    <Link
                      href={`/lists/${list.id}?edit=1`}
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded transition-colors"
                    >
                      Rename
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteList(list.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                      >
                        Delete
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
              <p className="text-lg">No lists yet.</p>
              <p className="text-sm">Create your first list below!</p>
            </div>
          )}
        </div>

        <Link
          href="/lists/new"
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-2xl shadow-sm transition-colors"
        >
          <span className="text-xl">+</span>
          New List
        </Link>
      </div>
    </main>
  );
}
