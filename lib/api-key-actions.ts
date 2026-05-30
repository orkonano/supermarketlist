"use server";

import { randomBytes, createHash } from "crypto";
import { prisma } from "./prisma";
import { verifySession } from "./dal";

const MAX_KEYS_PER_USER = 10;
const API_KEY_PREFIX = "sml_";

export async function createApiKey(name: string) {
  const session = await verifySession();

  const trimmed = name.trim();
  if (!trimmed) return { error: "El nombre es obligatorio." };

  const count = await prisma.apiKey.count({ where: { userId: session.userId } });
  if (count >= MAX_KEYS_PER_USER) {
    return { error: `Alcanzaste el límite de ${MAX_KEYS_PER_USER} API Keys.` };
  }

  const rawKey = API_KEY_PREFIX + randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  await prisma.apiKey.create({
    data: { keyHash, name: trimmed, userId: session.userId },
  });

  return { key: rawKey };
}

export async function deleteApiKey(id: string) {
  const session = await verifySession();
  await prisma.apiKey.delete({ where: { id, userId: session.userId } });
}

export async function getUserApiKeys() {
  const session = await verifySession();
  return prisma.apiKey.findMany({
    where: { userId: session.userId },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });
}
