import { notFound } from "next/navigation";
import Link from "next/link";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AppShell from "@/app/components/AppShell";
import ShareForm from "@/app/components/ShareForm";

export default async function SharePage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const session = await verifySession();

  const [list, user] = await Promise.all([
    prisma.list.findUnique({
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
    }),
    getCurrentUser(session.userId),
  ]);

  if (!list) notFound();

  const isMember = list.members.some((m) => m.userId === session.userId);
  if (!isMember) notFound();

  const isOwner = list.ownerId === session.userId;

  return (
    <AppShell userName={user?.name ?? ""}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <Link
            href={`/lists/${listId}`}
            className="text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ← {list.name}
          </Link>
          <span style={{ color: "var(--border-strong)" }}>/</span>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            Compartir
          </h1>
        </div>

        <div className="space-y-4">
          {/* Invite section — owner only */}
          {isOwner && (
            <section
              className="border p-5"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: "var(--text-muted)" }}
              >
                Invitar por correo
              </h2>
              <ShareForm listId={listId} />
            </section>
          )}

          {/* Members */}
          <section
            className="border p-5"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Miembros ({list.members.length})
            </h2>
            <ul className="space-y-3">
              {list.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: "var(--brand-500)" }}
                    >
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {m.user.name}
                    </span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={
                      m.userId === list.ownerId
                        ? {
                            background: "var(--brand-50)",
                            color: "var(--brand-600)",
                          }
                        : {
                            color: "var(--text-muted)",
                          }
                    }
                  >
                    {m.userId === list.ownerId ? "propietario" : m.user.email}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Pending invites */}
          {list.invites.length > 0 && (
            <section
              className="border p-5"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: "var(--text-muted)" }}
              >
                Invitaciones pendientes ({list.invites.length})
              </h2>
              <ul className="space-y-2">
                {list.invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span style={{ color: "var(--text-secondary)" }}>{inv.email}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      vence {new Date(inv.expiresAt).toLocaleDateString("es-AR")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
