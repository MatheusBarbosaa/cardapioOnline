// src/app/api/orders/stream/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { db } from "@/lib/prisma";
import { subscribe } from "@/lib/realtime";

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // CORS opcional (ajuste se necessário)
    "Access-Control-Allow-Origin": "*",
  };
}

function send(controller: ReadableStreamDefaultController, data: any) {
  controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return new Response("Missing orderId", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      // 1) Envia um "hello" e estado inicial do pedido
      send(controller, { type: "hello" });

      try {
        const current = await db.order.findUnique({
          where: { id: Number(orderId) },
          include: {
            orderProducts: {
              include: { product: true },
            },
          },
        });
        if (current) {
          send(controller, { type: "snapshot", order: current });
        }
      } catch (e) {
        // ignora erro de snapshot
      }

      // 2) Assina atualizações para esse pedido
      const unsubscribe = subscribe(orderId, (payload) => {
        send(controller, payload);
      });

      // 3) Keep-alive para evitar timeouts de proxies
      const ping = setInterval(() => {
        controller.enqueue(`: keepalive\n\n`);
      }, 15000);

      // 4) Encerramento
      // Nota: o App Router chama cancel() quando o cliente desconecta
      // @ts-ignore - métodos privados, mas funcionam para limpar
      controller.signal?.addEventListener?.("abort", () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
