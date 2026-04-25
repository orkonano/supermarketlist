"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";

export async function addItem(formData: FormData) {
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
    },
  });

  revalidatePath("/");
}

export async function toggleItem(id: string, checked: boolean) {
  await prisma.item.update({
    where: { id },
    data: { checked },
  });
  revalidatePath("/");
}

export async function deleteItem(id: string) {
  await prisma.item.delete({ where: { id } });
  revalidatePath("/");
}

export async function getItems(month: number, year: number) {
  return prisma.item.findMany({
    where: { month, year },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });
}
