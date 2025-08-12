import { PrismaClient } from "@prisma/client";

declare global {
  // Evita múltiplas instâncias do PrismaClient no ambiente de desenvolvimento
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient();
export const db = prisma; // Adiciona export do db que o código está tentando importar

// Também exporta como default para compatibilidade
export default prisma;

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
