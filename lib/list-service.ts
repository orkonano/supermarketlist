import { prisma } from "./prisma";
import { ServiceError } from "./errors";
import { ERRORS } from "./constants/errors";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";

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
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      owner: { select: { name: true } },
      members: { where: { userId }, select: { userId: true } },
      _count: { select: { members: true, items: true } },
    },
  });

  if (!list) return null;

  if (list.members.length === 0) {
    if (list.ownerId === userId) {
      // Self-heal: owner predates the ListMember write-invariant
      try {
        await prisma.listMember.create({ data: { listId, userId } });
      } catch (err) {
        if (!(err instanceof PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      }
    } else {
      throw new ServiceError(403, ERRORS.PERMISSION_DENIED);
    }
  }

  const { members: _members, ...result } = list;
  return result;
}

export async function serviceUpdateList(listId: string, userId: string, name: string) {
  try {
    return await prisma.list.update({
      where: { id: listId, ownerId: userId },
      data: { name: name.trim() },
    });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      throw new ServiceError(403, ERRORS.PERMISSION_DENIED);
    }
    throw err;
  }
}

export async function serviceDeleteList(listId: string, userId: string) {
  try {
    return await prisma.list.delete({ where: { id: listId, ownerId: userId } });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      throw new ServiceError(403, ERRORS.PERMISSION_DENIED);
    }
    throw err;
  }
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

// The item mutations scope the write with a compound `where: { id, listId }`. If the
// item belongs to a different list (cross-list access), that matches no row and Prisma
// throws P2025 — translate it to a clean 404 instead of letting it surface as a 500.
async function runScopedItemMutation<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      throw new ServiceError(404, ERRORS.ITEM_NOT_FOUND);
    }
    throw err;
  }
}

export async function serviceToggleListItem(listId: string, userId: string, itemId: string, checked: boolean) {
  await ensureMember(listId, userId);
  return runScopedItemMutation(() => prisma.item.update({ where: { id: itemId, listId }, data: { checked } }));
}

export async function serviceDeleteListItem(listId: string, userId: string, itemId: string) {
  await ensureMember(listId, userId);
  return runScopedItemMutation(() => prisma.item.delete({ where: { id: itemId, listId } }));
}

export async function serviceUpdateListItem(
  listId: string,
  userId: string,
  itemId: string,
  data: { name?: string; quantity?: string | null; category?: string | null; checked?: boolean }
) {
  await ensureMember(listId, userId);
  return runScopedItemMutation(() => prisma.item.update({ where: { id: itemId, listId }, data }));
}
