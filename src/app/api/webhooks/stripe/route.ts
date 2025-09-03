import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import Pusher from "pusher";
import Stripe from "stripe";

import { db } from "@/lib/prisma";

// Configurar Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  });

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.error();
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_KEY!;
  const text = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(text, signature, webhookSecret);
  } catch (err) {
    console.error("Erro ao validar webhook:", err);
    return NextResponse.error();
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        return NextResponse.json({ received: true });
      }

      // Atualizar no banco
      const order = await db.order.update({
        where: { id: Number(orderId) },
        data: { status: "PAYMENT_CONFIRMED" },
        include: {
          restaurant: { select: { slug: true } },
          orderProducts: {
            include: {
              product: true
            }
          }
        },
      });

      // 🔥 ADICIONAR: Disparar evento Pusher
      try {
        await pusher.trigger(`order-${orderId}`, 'status-updated', {
          orderId: Number(orderId),
          status: "PAYMENT_CONFIRMED",
          timestamp: new Date().toISOString(),
          order: order // Dados completos do pedido
        });
        
        console.log(`✅ Pusher event sent for order ${orderId}: PAYMENT_CONFIRMED`);
      } catch (pusherError) {
        console.error("❌ Erro ao enviar evento Pusher:", pusherError);
      }

      revalidatePath(`/${order.restaurant.slug}/orders`);
      break;
    }

    case "charge.failed": {
      const charge = event.data.object as Stripe.Charge;
      const orderId = charge.metadata?.orderId;

      if (!orderId) {
        return NextResponse.json({ received: true });
      }

      // Atualizar no banco
      const order = await db.order.update({
        where: { id: Number(orderId) },
        data: { status: "PAYMENT_FAILED" },
        include: {
          restaurant: { select: { slug: true } },
          orderProducts: {
            include: {
              product: true
            }
          }
        },
      });

      // 🔥 ADICIONAR: Disparar evento Pusher para falha
      try {
        await pusher.trigger(`order-${orderId}`, 'status-updated', {
          orderId: Number(orderId),
          status: "PAYMENT_FAILED",
          timestamp: new Date().toISOString(),
          order: order
        });
        
        console.log(`✅ Pusher event sent for order ${orderId}: PAYMENT_FAILED`);
      } catch (pusherError) {
        console.error("❌ Erro ao enviar evento Pusher:", pusherError);
      }

      revalidatePath(`/${order.restaurant.slug}/orders`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}