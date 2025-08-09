// src/app/api/admin/categories/toggle/route.ts
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { categoryId, isActive } = body;

    if (!categoryId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'ID da categoria e status são obrigatórios' },
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
      include: { restaurant: true }
    });

    if (!category || category.restaurant.id !== decoded.restaurantId) {
      return NextResponse.json(
        { error: 'Categoria não encontrada ou sem permissão' },
        { status: 403 }
      );
    }

    const updatedCategory = await db.menuCategory.update({
      where: { id: categoryId },
      data: { isActive }
    });

    if (!isActive) {
      await db.product.updateMany({
        where: { menuCategoryId: categoryId },
        data: { isActive: false }
      });
    }

    return NextResponse.json({
      message: `Categoria ${isActive ? 'ativada' : 'desativada'} com sucesso`,
      category: updatedCategory
    });

  } catch (error) {
    console.error('Erro ao alterar status da categoria:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

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

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded: any = verify(token, process.env.JWT_SECRET!);

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