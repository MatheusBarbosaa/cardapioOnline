import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { db } from '@/lib/prisma';

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
    case 'account.updated':
      const account = event.data.object as Stripe.Account;
      
      // Atualizar status do onboarding
      if (account.details_submitted && account.charges_enabled) {
        await db.restaurant.update({
          where: { stripeAccountId: account.id },
          data: { stripeOnboarded: true }
        });
      }
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Atualizar status do pedido
      if (paymentIntent.metadata.orderId) {
        await db.order.update({
          where: { id: parseInt(paymentIntent.metadata.orderId) },
          data: { status: 'PAYMENT_CONFIRMED' }
        });
      }
      break;
  }

  return NextResponse.json({ received: true });
}