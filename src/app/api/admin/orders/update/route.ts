// src/app/api/admin/orders/update/route.ts
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status } = body;

    console.log("🔄 Update Order - Dados recebidos:", { orderId, status });

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId e status são obrigatórios" },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        restaurant: { select: { id: true, slug: true, name: true } },
        orderProducts: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        restaurant: { select: { id: true, slug: true, name: true } },
        orderProducts: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });

    console.log("✅ Pedido atualizado:", {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      restaurantSlug: updatedOrder.restaurant?.slug,
    });

    if (pusherServer && updatedOrder.restaurant?.slug) {
      try {
        // Notificar admin
        await pusherServer.trigger(
          `restaurant-${updatedOrder.restaurant.slug}`,
          "update-order",
          {
            orderId: updatedOrder.id,
            status: updatedOrder.status,
            order: updatedOrder,
            timestamp: new Date().toISOString(),
          }
        );

        // Notificar cliente
        await pusherServer.trigger(
          `order-${updatedOrder.id}`,
          "status-update", // <-- corrigido (sem o "d" no final)
          {
            orderId: updatedOrder.id,
            status: updatedOrder.status,
            order: updatedOrder,
            timestamp: new Date().toISOString(),
          }
        );

        console.log("📡 Notificações enviadas:", {
          adminChannel: `restaurant-${updatedOrder.restaurant.slug}`,
          clientChannel: `order-${updatedOrder.id}`,
          status: updatedOrder.status,
        });
      } catch (err) {
        console.error("❌ Erro ao enviar notificação Pusher:", err);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar pedido:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
