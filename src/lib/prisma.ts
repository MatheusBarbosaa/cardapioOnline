import { PrismaClient } from "@prisma/client";

declare global {
  // Evita criar múltiplas instâncias no hot reload do Next.js dev
  // @ts-ignore
  var cachedPrisma: PrismaClient;
}

let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prismaInstance = new PrismaClient();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient();
  }
  prismaInstance = global.cachedPrisma;
}

// Exporta named export prisma
export const prisma = prismaInstance;
