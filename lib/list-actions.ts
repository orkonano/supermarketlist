"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./prisma";
import { verifySession } from "./dal";
import {
  serviceCreateList,
  serviceUpdateList,
  serviceDeleteList,
  serviceGetUserLists,
  serviceGetListItems,
  serviceAddListItem,
  serviceToggleListItem,
  serviceDeleteListItem,
} from "./list-service";

const ListNameSchema = z.string().min(1, "El nombre es obligatorio.").max(100).trim();
const AddItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().max(50).optional(),
});

export async function createList(name: string) {
  const session = await verifySession();
  const validName = ListNameSchema.parse(name);
  const list = await serviceCreateList(session.userId, validName);
  revalidatePath("/lists");
  return list;
}

export async function updateList(listId: string, name: string) {
  const session = await verifySession();
  ListNameSchema.parse(name);
  await serviceUpdateList(listId, session.userId, name);
  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
}

export async function deleteList(listId: string) {
  const session = await verifySession();
  await serviceDeleteList(listId, session.userId);
  revalidatePath("/lists");
}

export async function getUserLists() {
  const session = await verifySession();
  return serviceGetUserLists(session.userId);
}

export async function getListItems(listId: string, month: number, year: number) {
  const session = await verifySession();
  return serviceGetListItems(listId, session.userId, month, year);
}

export async function addListItem(listId: string, formData: FormData) {
  const session = await verifySession();

  const name = formData.get("name") as string;
  const quantity = formData.get("quantity") as string;
  const category = formData.get("category") as string;
  const now = new Date();
  const rawMonth = parseInt(formData.get("month") as string, 10);
  const rawYear = parseInt(formData.get("year") as string, 10);
  const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1;
  const year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : now.getFullYear();

  const parsed = AddItemSchema.safeParse({ name: name?.trim(), quantity: quantity?.trim() || undefined });
  if (!parsed.success) return;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { name: true } });

  await serviceAddListItem(listId, session.userId, user.name, {
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    category: category?.trim() || undefined,
    month,
    year,
  });

  revalidatePath(`/lists/${listId}`);
}

export async function toggleListItem(listId: string, id: string, checked: boolean) {
  const session = await verifySession();
  await serviceToggleListItem(listId, session.userId, id, checked);
  revalidatePath(`/lists/${listId}`);
}

export async function deleteListItem(listId: string, id: string) {
  const session = await verifySession();
  await serviceDeleteListItem(listId, session.userId, id);
  revalidatePath(`/lists/${listId}`);
}
