import { NextResponse } from "next/server";

import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ order: null });
  }

  const order = await db.order.findUnique({
    where: { id: Number(id) },
    include: { orderProducts: { include: { product: true } } },
  });

  return NextResponse.json({ order });
}
