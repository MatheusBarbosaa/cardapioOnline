import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient();
export const db = prisma; // Esta linha é CRUCIAL!

export default prisma;

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
