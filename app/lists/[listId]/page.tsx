import { Suspense } from "react";
import { notFound } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { serviceGetListForMember } from "@/lib/list-service";
import { normalizeMonthYear } from "@/lib/date-utils";
import VerificationBanner from "@/app/components/VerificationBanner";
import RenameListForm from "@/app/components/RenameListForm";
import ItemsSection from "./ItemsSection";
import ListPageHeader from "./ListPageHeader";
import AppShell from "@/app/components/AppShell";

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
        <ListPageHeader listId={listId} listName={list.name} isOwner={isOwner} />

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
