import { createHash } from "crypto";
import { prisma } from "./prisma";
import type { User } from "../app/generated/prisma";

export class ApiAuthError extends Error {
  constructor() {
    super("No autorizado");
  }
}

export async function withApiKey(req: Request): Promise<{ user: User; keyId: string }> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new ApiAuthError();

  const rawKey = auth.slice(7);
  if (!rawKey) throw new ApiAuthError();

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) throw new ApiAuthError();
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new ApiAuthError();

  if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > 3_600_000) {
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return { user: apiKey.user, keyId: apiKey.id };
}
