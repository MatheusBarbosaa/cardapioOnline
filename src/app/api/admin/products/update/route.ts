// src/app/api/admin/products/update/route.ts
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { productId, name, description, price, ingredients } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'ID do produto é obrigatório' },
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

    // Verificar se o produto pertence ao restaurante do usuário
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { restaurant: true }
    });

    if (!product || product.restaurant.id !== decoded.restaurantId) {
      return NextResponse.json(
        { error: 'Produto não encontrado ou sem permissão' },
        { status: 403 }
      );
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined && price > 0) updateData.price = parseFloat(price);
    if (ingredients !== undefined) updateData.ingredients = ingredients;

    // Atualizar produto
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: updateData
    });

    return NextResponse.json({
      message: 'Produto atualizado com sucesso',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}