import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Buscar restaurante
    const restaurant = await db.restaurant.findUnique({
      where: { id: payload.restaurantId }
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
    }

    let accountId = restaurant.stripeAccountId;

    // Criar conta do Stripe se não existir
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email: payload.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Salvar no banco
      await db.restaurant.update({
        where: { id: restaurant.id },
        data: { stripeAccountId: accountId }
      });
    }

    // Criar link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/${restaurant.slug}/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/${restaurant.slug}/stripe/success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error) {
    console.error('Erro ao criar conta Stripe:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    );
  }
}