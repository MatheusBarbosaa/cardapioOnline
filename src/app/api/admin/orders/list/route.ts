import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma"; 

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const orderIdsParam = searchParams.get("orderIds");
    if (!orderIdsParam) {
      return NextResponse.json({ error: "Parâmetro orderIds é obrigatório" }, { status: 400 });
    }

    const orderIds = orderIdsParam.split(",").map((id) => parseInt(id, 10)).filter(Boolean);

    const lastUpdateParam = searchParams.get("lastUpdate");
    const lastUpdate = lastUpdateParam ? new Date(lastUpdateParam) : null;

    // Busca pedidos
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        ...(lastUpdate && { updatedAt: { gt: lastUpdate } }),
      },
      include: {
        restaurant: { select: { name: true, avatarImageUrl: true } },
        orderProducts: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    return NextResponse.json(
      {
        data: orders,
        timestamp: new Date().toISOString(),
        count: orders.length,
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("❌ Erro ao listar pedidos:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 }
    );
  }
}
