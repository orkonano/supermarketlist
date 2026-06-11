import { notFound } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AppShell from "@/app/components/AppShell";
import PageHeader from "@/app/components/PageHeader";
import SectionCard from "@/app/components/SectionCard";
import ShareForm from "@/app/components/ShareForm";
import MembersList from "./MembersList";
import PendingInvitesList from "./PendingInvitesList";

function getListForShare(listId: string) {
  return prisma.list.findUnique({
    where: { id: listId },
    include: {
      members: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      invites: {
        where: { accepted: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const session = await verifySession();

  const [list, user] = await Promise.all([
    getListForShare(listId),
    getCurrentUser(session.userId),
  ]);

  if (!list) notFound();

  const isMember = list.members.some((m) => m.userId === session.userId);
  if (!isMember) notFound();

  const isOwner = list.ownerId === session.userId;

  return (
    <AppShell userName={user?.name ?? ""}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PageHeader backHref={`/lists/${listId}`} backLabel={list.name} title="Compartir" />

        <div className="space-y-4">
          {isOwner && (
            <SectionCard title="Invitar por correo">
              <ShareForm listId={listId} />
            </SectionCard>
          )}

          <SectionCard title={`Miembros (${list.members.length})`}>
            <MembersList members={list.members} ownerId={list.ownerId} />
          </SectionCard>

          {list.invites.length > 0 && (
            <SectionCard title={`Invitaciones pendientes (${list.invites.length})`}>
              <PendingInvitesList invites={list.invites} />
            </SectionCard>
          )}
        </div>
      </div>
    </AppShell>
  );
}
