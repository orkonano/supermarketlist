"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./prisma";
import { verifySession } from "./dal";
import { normalizeMonthYear } from "./date-utils";
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
  name: z.string().min(1, "El nombre del producto es obligatorio."),
  quantity: z.string().max(50, "La cantidad no puede superar los 50 caracteres.").optional(),
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
  const { month, year } = normalizeMonthYear(
    formData.get("month") as string,
    formData.get("year") as string
  );

  const parsed = AddItemSchema.safeParse({ name: name?.trim(), quantity: quantity?.trim() || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

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
