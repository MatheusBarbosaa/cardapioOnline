import { NextResponse } from "next/server";

import { pusherServer } from "@/lib/pusher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Dispara evento para o canal específico do pedido
    await pusherServer.trigger(`order-${orderId}`, "status-update", {
      status,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro no Pusher" }, { status: 500 });
  }
}
