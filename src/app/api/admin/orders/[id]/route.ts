import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const orderId = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const includeProducts = searchParams.get("includeProducts") === "true";

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: includeProducts
        ? {
            products: {
              include: { product: true },
            },
          }
        : undefined,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
