import path from "path";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function resolveLocalDbUrl(): string {
  const env = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const rel = env.replace(/^file:/, "");
  return `file:${path.join(process.cwd(), rel)}`;
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname}`;
  } catch {
    // file: URLs aren't valid URL objects
    return url.replace(/^file:/, "file:").split("?")[0];
  }
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    console.log(
      `[prisma] connecting to Turso — url=${sanitizeUrl(tursoUrl)} token=${tursoToken ? "set" : "MISSING"}`
    );
  } else {
    const localUrl = resolveLocalDbUrl();
    console.log(`[prisma] TURSO_DATABASE_URL not set — falling back to local SQLite: ${sanitizeUrl(localUrl)}`);
  }

  const url = tursoUrl ?? resolveLocalDbUrl();
  const adapter = new PrismaLibSql({ url, ...(tursoToken ? { authToken: tursoToken } : {}) });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
