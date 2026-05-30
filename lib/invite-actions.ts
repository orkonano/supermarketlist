"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { prisma } from "./prisma";
import { verifySession } from "./dal";
import { start } from "workflow/api";
import { listInviteWorkflow } from "@/workflows/list-invite";
import { INVITE_EXPIRY_MS } from "./constants/time";

const EmailSchema = z.string().email("Ingresá un correo electrónico válido.");

export type InviteResult =
  | { success: true }
  | { error: string };

export async function inviteToList(listId: string, email: string): Promise<InviteResult> {
  const session = await verifySession();

  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const list = await prisma.list.findUnique({ where: { id: listId }, select: { ownerId: true } });
  if (!list || list.ownerId !== session.userId) return { error: "Solo el propietario de la lista puede invitar personas." };

  const existing = await prisma.listInvite.findFirst({
    where: { listId, email, accepted: false },
  });
  if (existing) return { error: "Ya se envió una invitación a este correo electrónico." };

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (invitee && invitee.id === session.userId) return { error: "No podés invitarte a vos mismo." };
  if (invitee) {
    const alreadyMember = await prisma.listMember.findUnique({
      where: { listId_userId: { listId, userId: invitee.id } },
    });
    if (alreadyMember) return { error: "Este usuario ya es miembro de la lista." };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

  await prisma.listInvite.create({
    data: { listId, email, invitedById: session.userId, token, expiresAt },
  });

  const [listDetails, inviter] = await Promise.all([
    prisma.list.findUnique({ where: { id: listId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
  ]);

  if (!listDetails) throw new Error("La lista fue eliminada durante la invitación.");
  if (!inviter) throw new Error("El usuario fue eliminado durante la invitación.");

  await start(listInviteWorkflow, [email, inviter.name, listDetails.name, token, !!invitee]);

  revalidatePath(`/lists/${listId}/share`);
  return { success: true };
}

export async function acceptInvite(token: string, userId: string): Promise<{ listId: string } | { error: string }> {
  const invite = await prisma.listInvite.findUnique({ where: { token } });
  if (!invite) return { error: "El enlace de invitación es inválido." };
  if (invite.expiresAt < new Date()) return { error: "Esta invitación expiró." };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user || user.email !== invite.email) return { error: "Esta invitación no corresponde a tu correo electrónico." };

  if (invite.accepted) return { listId: invite.listId };

  try {
    await prisma.$transaction([
      prisma.listMember.create({ data: { listId: invite.listId, userId } }),
      prisma.listInvite.update({ where: { id: invite.id }, data: { accepted: true } }),
    ]);
  } catch (err) {
    if (!(err instanceof PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
  }

  revalidatePath("/lists");
  return { listId: invite.listId };
}
