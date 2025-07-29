// src/app/api/restaurant/update/route.ts

import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

export async function PUT(request: Request) {
  const body = await request.json();
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const decoded: any = verify(token, process.env.JWT_SECRET!);
    const restaurantId = decoded.id;

    const updatedRestaurant = await db.restaurant.update({
      where: { id: restaurantId },
      data: body,
    });

    return NextResponse.json(updatedRestaurant);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar restaurante' }, { status: 500 });
  }
}
