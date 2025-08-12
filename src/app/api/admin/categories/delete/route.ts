/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/categories/delete/route.ts
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { categoryId } = body;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'ID da categoria é obrigatório' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded: any = verify(token, process.env.JWT_SECRET!);

    const category = await db.menuCategory.findUnique({
      where: { id: categoryId },
      include: { 
        restaurant: true,
        _count: { select: { products: true } }
      }
    });

    if (!category || category.restaurant.id !== decoded.restaurantId) {
      return NextResponse.json(
        { error: 'Categoria não encontrada ou sem permissão' },
        { status: 403 }
      );
    }

    await db.menuCategory.delete({
      where: { id: categoryId }
    });

    return NextResponse.json({
      message: `Categoria excluída com sucesso. ${category._count.products} produto(s) também foram removidos.`
    });

  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}