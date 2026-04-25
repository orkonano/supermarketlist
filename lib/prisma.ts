import path from "path";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function resolveDbUrl(): string {
  const env = process.env.DATABASE_URL;
  if (env && !env.startsWith("file:./") && !env.startsWith("file:../")) {
    return env;
  }
  const rel = env ? env.replace(/^file:/, "") : "./prisma/dev.db";
  return `file:${path.join(process.cwd(), rel)}`;
}

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: resolveDbUrl() });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
