import { PrismaClient } from "@prisma/client";

declare global {
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

// 🔹 Exporta como prisma (não mais db)
export const prisma = prismaInstance;
