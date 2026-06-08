import { Suspense } from "react";
import { notFound } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { serviceGetListForMember } from "@/lib/list-service";
import { normalizeMonthYear } from "@/lib/date-utils";
import VerificationBanner from "@/app/components/VerificationBanner";
import RenameListForm from "@/app/components/RenameListForm";
import ItemsSection from "./ItemsSection";
import AppShell from "@/app/components/AppShell";
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
    <AppShell userName={user?.name ?? ""}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/lists"
            className="text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ← Listas
          </Link>
          <span style={{ color: "var(--border-strong)" }}>/</span>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {list.name}
          </h1>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href={`/lists/${listId}/share`}
              className="text-xs px-2 py-1 rounded-md transition-colors"
              style={{ color: "var(--brand-500)" }}
            >
              Compartir
            </Link>
            {isOwner && (
              <Link
                href={`/lists/${listId}?edit=1`}
                className="text-xs px-2 py-1 rounded-md transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Renombrar
              </Link>
            )}
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
    </AppShell>
  );
}
