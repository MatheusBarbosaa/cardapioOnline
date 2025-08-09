// src/app/api/admin/categories/create/route.ts
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantSlug, name, description } = body;

    if (!name || !restaurantSlug) {
      return NextResponse.json(
        { error: 'Nome da categoria e slug do restaurante são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar autenticação
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded: any = verify(token, process.env.JWT_SECRET!);

    // Buscar o restaurante e verificar se pertence ao usuário
    const restaurant = await db.restaurant.findUnique({
      where: { slug: restaurantSlug }
    });

    if (!restaurant || restaurant.id !== decoded.restaurantId) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado ou sem permissão' },
        { status: 403 }
      );
    }

    // Verificar se já existe categoria com esse nome
    const existingCategory = await db.menuCategory.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: name.trim()
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este nome' },
        { status: 400 }
      );
    }

    // Criar a categoria
    const category = await db.menuCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        restaurantId: restaurant.id,
      }
    });

    return NextResponse.json({ 
      message: 'Categoria criada com sucesso',
      category 
    });

  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}