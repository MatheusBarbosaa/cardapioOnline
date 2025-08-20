export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/prisma';
import { publish } from '@/lib/realtime'; // <── novo

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed.');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;

      if (account.details_submitted && account.charges_enabled) {
        await db.restaurant.update({
          where: { stripeAccountId: account.id },
          data: { stripeOnboarded: true }
        });
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      if (paymentIntent.metadata.orderId) {
        const orderId = parseInt(paymentIntent.metadata.orderId);

        const updated = await db.order.update({
          where: { id: orderId },
          data: { status: 'PAYMENT_CONFIRMED' },
          include: {
            orderProducts: { include: { product: true } }
          }
        });

        // 🔔 Empurra atualização em tempo real para quem estiver ouvindo
        publish(String(orderId), {
          type: 'order.updated',
          order: updated,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
