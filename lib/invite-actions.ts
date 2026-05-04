"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./prisma";
import { verifySession } from "./dal";
import { start } from "workflow/api";
import { listInviteWorkflow } from "@/workflows/list-invite";

const EmailSchema = z.string().email("Please enter a valid email.");

export type InviteResult =
  | { success: true }
  | { error: string };

export async function inviteToList(listId: string, email: string): Promise<InviteResult> {
  const session = await verifySession();

  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const member = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId: session.userId } },
  });
  if (!member) return { error: "Not authorized." };

  const existing = await prisma.listInvite.findFirst({
    where: { listId, email, accepted: false },
  });
  if (existing) return { error: "An invite has already been sent to this email." };

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (invitee) {
    const alreadyMember = await prisma.listMember.findUnique({
      where: { listId_userId: { listId, userId: invitee.id } },
    });
    if (alreadyMember) return { error: "This user is already a member of the list." };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.listInvite.create({
    data: { listId, email, invitedById: session.userId, token, expiresAt },
  });

  const [list, inviter] = await Promise.all([
    prisma.list.findUnique({ where: { id: listId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
  ]);

  await start(listInviteWorkflow, [email, inviter!.name, list!.name, token, !!invitee]);

  revalidatePath(`/lists/${listId}/share`);
  return { success: true };
}

export async function acceptInvite(token: string, userId: string): Promise<{ listId: string } | { error: string }> {
  const invite = await prisma.listInvite.findUnique({ where: { token } });
  if (!invite) return { error: "Invalid invite link." };
  if (invite.expiresAt < new Date()) return { error: "This invite has expired." };

  if (invite.accepted) return { listId: invite.listId };

  try {
    await prisma.$transaction([
      prisma.listMember.create({ data: { listId: invite.listId, userId } }),
      prisma.listInvite.update({ where: { id: invite.id }, data: { accepted: true } }),
    ]);
  } catch {
    // Member already exists — idempotent
  }

  revalidatePath("/lists");
  return { listId: invite.listId };
}
