// app/api/admin/orders/update/route.js
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/lib/prisma";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar token
    const decoded = verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { orderId, status } = await request.json();

    // Validar status permitidos
    const validStatuses = ["PAYMENT_CONFIRMED", "IN_PREPARATION", "FINISHED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Verificar se o pedido pertence ao restaurante do admin
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        restaurantId: decoded.restaurantId,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // Atualizar status
    await db.order.update({
      where: { id: orderId },
      data: { 
        status,
        updatedAt: new Date()
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";