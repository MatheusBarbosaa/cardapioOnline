/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/categories/update/route.ts
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { categoryId, name, description } = body;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'ID da categoria é obrigatório' },
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

    // Verificar se a categoria pertence ao restaurante do usuário
    const category = await db.menuCategory.findUnique({
      where: { id: categoryId },
      include: { restaurant: true }
    });

    if (!category || category.restaurant.id !== decoded.restaurantId) {
      return NextResponse.json(
        { error: 'Categoria não encontrada ou sem permissão' },
        { status: 403 }
      );
    }

    // Atualizar categoria
    const updatedCategory = await db.menuCategory.update({
      where: { id: categoryId },
      data: {
        name: name?.trim() || category.name,
        description: description?.trim() || category.description,
      }
    });

    return NextResponse.json({
      message: 'Categoria atualizada com sucesso',
      category: updatedCategory
    });

  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}