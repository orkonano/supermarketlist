import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { acceptInvite } from "@/lib/invite-actions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) return Response.redirect(new URL("/lists?error=missing-token", req.url));

  const invite = await prisma.listInvite.findUnique({ where: { token } });
  if (!invite) return Response.redirect(new URL("/lists?error=invalid-invite", req.url));
  if (invite.expiresAt < new Date()) return Response.redirect(new URL("/lists?error=invite-expired", req.url));

  const session = await getOptionalSession();

  if (!session) {
    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    const path = existing
      ? `/login?inviteToken=${encodeURIComponent(token)}`
      : `/signup?inviteToken=${encodeURIComponent(token)}`;
    return Response.redirect(new URL(path, req.url));
  }

  const sessionUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  if (sessionUser?.email !== invite.email) {
    return Response.redirect(new URL("/lists?error=wrong-account", req.url));
  }

  const result = await acceptInvite(token, session.userId);
  if ("error" in result) {
    return Response.redirect(new URL(`/lists?error=${encodeURIComponent(result.error)}`, req.url));
  }

  return Response.redirect(new URL(`/lists/${result.listId}`, req.url));
}
