import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { restaurantId: string };

    const updatedRestaurant = await db.restaurant.update({
      where: { id: decoded.restaurantId },
      data: {
        name: body.name,
        description: body.description,
        avatarImageUrl: body.avatarImageUrl,
        coverImageUrl: body.coverImageUrl,
      },
    });

    return NextResponse.json(updatedRestaurant);
  } catch (error) {
    console.error('Erro ao atualizar restaurante:', error);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}