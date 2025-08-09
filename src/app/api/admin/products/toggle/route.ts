// src/app/api/admin/products/toggle/route.ts
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { productId, isActive } = body;

    if (!productId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'ID do produto e status são obrigatórios' },
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
      include: { 
        restaurant: true,
        menuCategory: true
      }
    });

    if (!product || product.restaurant.id !== decoded.restaurantId) {
      return NextResponse.json(
        { error: 'Produto não encontrado ou sem permissão' },
        { status: 403 }
      );
    }

    // Verificar se a categoria está ativa (só pode ativar produto se categoria estiver ativa)
    if (isActive && !product.menuCategory.isActive) {
      return NextResponse.json(
        { error: 'Não é possível ativar produto de uma categoria inativa' },
        { status: 400 }
      );
    }

    // Alterar status do produto
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: { isActive }
    });

    return NextResponse.json({
      message: `Produto ${isActive ? 'ativado' : 'desativado'} com sucesso`,
      product: updatedProduct
    });

  } catch (error) {
    console.error('Erro ao alterar status do produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// src/app/api/admin/products/delete/route.ts
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { productId } = body;

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

    // Excluir produto
    await db.product.delete({
      where: { id: productId }
    });

    return NextResponse.json({
      message: 'Produto excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}