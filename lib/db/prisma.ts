import { PrismaClient } from "@/lib/generated/prisma";

/**
 * Client singleton do Prisma, escopo restrito à tabela
 * `insights_user_provisioning_requests` (ver prisma/schema.prisma).
 *
 * Padrão de singleton via `globalThis` para evitar múltiplas conexões em
 * hot-reload de desenvolvimento (Next.js App Router).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
