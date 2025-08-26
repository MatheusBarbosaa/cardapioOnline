import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ orders: [] });
  }

  const orders = await db.order.findMany({
    where: { restaurantId: Number(restaurantId) },
    orderBy: { createdAt: "desc" },
    include: { orderProducts: { include: { product: true } } },
  });

  return NextResponse.json({ orders });
}
