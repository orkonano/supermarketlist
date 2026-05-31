import { prisma } from "./prisma";
import { ServiceError } from "./errors";
import { ERRORS } from "./constants/errors";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";

export async function assertOwner(listId: string, userId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== userId) throw new ServiceError(403, ERRORS.PERMISSION_DENIED);
  return list;
}

export async function ensureMember(listId: string, userId: string) {
  const member = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId } },
  });
  if (member) return;

  // TODO: remove this self-heal once the ListMember backfill is fully verified in production.
  // Owners created before the ListMember write-invariant was enforced may lack a record.
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (list?.ownerId === userId) {
    try {
      await prisma.listMember.create({ data: { listId, userId } });
    } catch (err) {
      if (!(err instanceof PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
    return;
  }

  throw new ServiceError(403, ERRORS.PERMISSION_DENIED);
}

export async function serviceGetListForMember(listId: string, userId: string) {
  return prisma.list.findUnique({
    where: { id: listId },
    include: { members: { where: { userId } } },
  });
}

export async function serviceCreateList(userId: string, name: string) {
  return prisma.list.create({
    data: {
      name,
      ownerId: userId,
      members: { create: { userId } },
    },
  });
}

export async function serviceGetUserLists(userId: string) {
  return prisma.list.findMany({
    where: { members: { some: { userId } } },
    include: {
      owner: { select: { name: true } },
      _count: { select: { members: true, items: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function serviceGetList(listId: string, userId: string) {
  await ensureMember(listId, userId);
  return prisma.list.findUnique({
    where: { id: listId },
    include: {
      owner: { select: { name: true } },
      _count: { select: { members: true, items: true } },
    },
  });
}

export async function serviceUpdateList(listId: string, userId: string, name: string) {
  await assertOwner(listId, userId);
  return prisma.list.update({
    where: { id: listId },
    data: { name: name.trim() },
  });
}

export async function serviceDeleteList(listId: string, userId: string) {
  await assertOwner(listId, userId);
  return prisma.list.delete({ where: { id: listId } });
}

export async function serviceGetListItems(listId: string, userId: string, month: number, year: number) {
  return prisma.item.findMany({
    where: {
      listId,
      month,
      year,
      list: { members: { some: { userId } } },
    },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });
}

export async function serviceAddListItem(
  listId: string,
  userId: string,
  addedBy: string,
  data: { name: string; quantity?: string; category?: string; month: number; year: number }
) {
  await ensureMember(listId, userId);
  return prisma.item.create({
    data: {
      name: data.name,
      quantity: data.quantity ?? null,
      category: data.category ?? null,
      addedBy,
      month: data.month,
      year: data.year,
      listId,
    },
  });
}

export async function serviceToggleListItem(listId: string, userId: string, itemId: string, checked: boolean) {
  await ensureMember(listId, userId);
  return prisma.item.update({ where: { id: itemId, listId }, data: { checked } });
}

export async function serviceDeleteListItem(listId: string, userId: string, itemId: string) {
  await ensureMember(listId, userId);
  return prisma.item.delete({ where: { id: itemId, listId } });
}

export async function serviceUpdateListItem(
  listId: string,
  userId: string,
  itemId: string,
  data: { name?: string; quantity?: string | null; category?: string | null; checked?: boolean }
) {
  await ensureMember(listId, userId);
  return prisma.item.update({ where: { id: itemId, listId }, data });
}
