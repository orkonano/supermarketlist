import { notFound } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import ShareForm from "@/app/components/ShareForm";

export default async function SharePage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const session = await verifySession();

  const list = await prisma.list.findUnique({
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

  if (!list) notFound();

  const isMember = list.members.some((m) => m.userId === session.userId);
  if (!isMember) notFound();

  const isOwner = list.ownerId === session.userId;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href={`/lists/${listId}`} className="text-gray-400 hover:text-gray-600 transition-colors">
            ← {list.name}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Compartir</h1>
        </div>

        {isOwner && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Invitar por correo electrónico</h2>
            <ShareForm listId={listId} />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Miembros ({list.members.length})
          </h2>
          <ul className="space-y-2">
            {list.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{m.user.name}</span>
                <span className="text-gray-400 text-xs">
                  {m.userId === list.ownerId ? "propietario" : m.user.email}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {list.invites.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Invitaciones pendientes ({list.invites.length})
            </h2>
            <ul className="space-y-2">
              {list.invites.map((inv) => (
                <li key={inv.id} className="text-sm text-gray-500">
                  {inv.email}
                  <span className="ml-2 text-xs text-gray-300">
                    vence {new Date(inv.expiresAt).toLocaleDateString("es-AR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
