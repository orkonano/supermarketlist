import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/auth-actions";
import { getListItems } from "@/lib/list-actions";
import ShoppingList from "@/app/components/ShoppingList";
import VerificationBanner from "@/app/components/VerificationBanner";
import RenameListForm from "@/app/components/RenameListForm";
import Link from "next/link";

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ month?: string; year?: string; verified?: string; error?: string; edit?: string }>;
}) {
  const { listId } = await params;
  const sp = await searchParams;
  const now = new Date();
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1;
  const year = sp.year ? parseInt(sp.year) : now.getFullYear();

  const session = await verifySession();

  const [list, user, items] = await Promise.all([
    prisma.list.findUnique({
      where: { id: listId },
      include: { members: { where: { userId: session.userId } } },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, emailVerified: true },
    }),
    getListItems(listId, month, year).catch(() => null),
  ]);

  if (!list || list.members.length === 0) notFound();
  if (!items) notFound();

  const isOwner = list.ownerId === session.userId;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/lists" className="text-gray-400 hover:text-gray-600 transition-colors">
              ← Lists
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm text-gray-600">Hi, {user?.name}</span>
            <div className="flex gap-3">
              <Link href={`/lists/${listId}/share`} className="text-xs text-blue-500 hover:underline">
                Share
              </Link>
              {isOwner && (
                <Link href={`/lists/${listId}?edit=1`} className="text-xs text-gray-500 hover:underline">
                  Rename
                </Link>
              )}
              <form action={logout} className="inline">
                <button type="submit" className="text-xs text-gray-500 hover:text-red-600 underline transition-colors">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>

        {sp.edit === "1" && isOwner && <RenameListForm listId={listId} currentName={list.name} />}

        {sp.verified === "1" && <VerificationBanner verified />}
        {sp.error && <VerificationBanner error={sp.error} />}

        {!user?.emailVerified && !sp.verified && (
          <div className="mb-6 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Please check your email and click the verification link to confirm your account.
          </div>
        )}

        <ShoppingList items={items} month={month} year={year} listId={listId} />
      </div>
    </main>
  );
}
