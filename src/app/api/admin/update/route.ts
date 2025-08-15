import { NextResponse } from "next/server";

import { db } from "@/lib/prisma";

export async function POST(req: Request) {
  const { orderId, status } = await req.json();

  if (!orderId || !status) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await db.order.update({
    where: { id: Number(orderId) },
    data: { status },
  });

  return NextResponse.json({ success: true });
}
