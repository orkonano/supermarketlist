import { Suspense } from "react";
import { notFound } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { serviceGetListForMember } from "@/lib/list-service";
import { logout } from "@/lib/auth-actions";
import { normalizeMonthYear } from "@/lib/date-utils";
import VerificationBanner from "@/app/components/VerificationBanner";
import RenameListForm from "@/app/components/RenameListForm";
import ItemsSection from "./ItemsSection";
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
  const { month, year } = normalizeMonthYear(sp.month, sp.year);

  const session = await verifySession();

  const [list, user] = await Promise.all([
    serviceGetListForMember(listId, session.userId),
    getCurrentUser(session.userId),
  ]);

  if (!list || list.members.length === 0) notFound();

  const isOwner = list.ownerId === session.userId;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/lists" className="text-gray-400 hover:text-gray-600 transition-colors">
              ← Listas
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm text-gray-600">Hola, {user?.name}</span>
            <div className="flex gap-3">
              <Link href={`/lists/${listId}/share`} className="text-xs text-blue-500 hover:underline">
                Compartir
              </Link>
              {isOwner && (
                <Link href={`/lists/${listId}?edit=1`} className="text-xs text-gray-500 hover:underline">
                  Renombrar
                </Link>
              )}
              <form action={logout} className="inline">
                <button type="submit" className="text-xs text-gray-500 hover:text-red-600 underline transition-colors">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>

        {sp.edit === "1" && isOwner && <RenameListForm listId={listId} currentName={list.name} />}

        {sp.verified === "1" && <VerificationBanner verified />}
        {sp.error && <VerificationBanner error={sp.error} />}

        <Suspense
          fallback={
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm h-24 animate-pulse" />
              ))}
            </div>
          }
        >
          <ItemsSection listId={listId} month={month} year={year} />
        </Suspense>
      </div>
    </main>
  );
}
