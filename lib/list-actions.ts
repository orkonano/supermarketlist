"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./prisma";
import { verifySession } from "./dal";

const ListNameSchema = z.string().min(1, "Name is required.").max(100).trim();

async function assertOwner(listId: string, userId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== userId) throw new Error("Not authorized.");
  return list;
}

async function assertMember(listId: string, userId: string) {
  const member = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId } },
  });
  if (!member) throw new Error("Not authorized.");
}

export async function createList(name: string) {
  const session = await verifySession();
  const validName = ListNameSchema.parse(name);

  const list = await prisma.list.create({
    data: {
      name: validName,
      ownerId: session.userId,
      members: { create: { userId: session.userId } },
    },
  });

  revalidatePath("/lists");
  return list;
}

export async function updateList(listId: string, name: string) {
  const session = await verifySession();
  ListNameSchema.parse(name);
  await assertOwner(listId, session.userId);

  await prisma.list.update({
    where: { id: listId },
    data: { name: name.trim() },
  });

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
}

export async function deleteList(listId: string) {
  const session = await verifySession();
  await assertOwner(listId, session.userId);

  await prisma.list.delete({ where: { id: listId } });
  revalidatePath("/lists");
}

export async function getUserLists() {
  const session = await verifySession();

  return prisma.list.findMany({
    where: { members: { some: { userId: session.userId } } },
    include: {
      owner: { select: { name: true } },
      _count: { select: { members: true, items: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getListItems(listId: string, month: number, year: number) {
  const session = await verifySession();
  await assertMember(listId, session.userId);

  return prisma.item.findMany({
    where: { listId, month, year },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });
}

export async function addListItem(listId: string, formData: FormData) {
  const session = await verifySession();
  await assertMember(listId, session.userId);

  const name = formData.get("name") as string;
  const quantity = formData.get("quantity") as string;
  const category = formData.get("category") as string;
  const addedBy = formData.get("addedBy") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);

  if (!name?.trim() || !addedBy?.trim()) return;

  await prisma.item.create({
    data: {
      name: name.trim(),
      quantity: quantity?.trim() || null,
      category: category?.trim() || null,
      addedBy: addedBy.trim(),
      month,
      year,
      listId,
    },
  });

  revalidatePath(`/lists/${listId}`);
}

export async function toggleListItem(listId: string, id: string, checked: boolean) {
  const session = await verifySession();
  await assertMember(listId, session.userId);

  await prisma.item.update({ where: { id }, data: { checked } });
  revalidatePath(`/lists/${listId}`);
}

export async function deleteListItem(listId: string, id: string) {
  const session = await verifySession();
  await assertMember(listId, session.userId);

  await prisma.item.delete({ where: { id } });
  revalidatePath(`/lists/${listId}`);
}
