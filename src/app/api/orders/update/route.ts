import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: Request) {
  try {
    // Verificar se pusherServer existe
    if (!pusherServer) {
      console.error("Pusher Server não está configurado");
      return NextResponse.json({ 
        error: "Pusher não está configurado" 
      }, { status: 500 });
    }

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
    console.error("Erro na API orders/update:", err);
    return NextResponse.json({ 
      error: "Erro interno do servidor" 
    }, { status: 500 });
  }
}
