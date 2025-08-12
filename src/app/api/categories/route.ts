import { cookies } from 'next/headers';
import { NextResponse } from "next/server"

import { verifyToken } from "@/lib/auth"
import { getRestaurantBySlug } from "@/lib/GetRestaurantBySlug"
import { db } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    // Verificar autenticação usando o sistema de auth que você já tem
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Usar o verifyToken do seu arquivo auth.ts
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await req.json()
    const { name, description, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Nome e slug são obrigatórios" }, { status: 400 })
    }

    const restaurant = await getRestaurantBySlug(slug)
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 })
    }

    // Verificar se o restaurante pertence ao usuário
    if (restaurant.id !== decoded.restaurantId) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Verificar se já existe categoria com esse nome
    const existingCategory = await db.menuCategory.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: name.trim()
      }
    });

    if (existingCategory) {
      return NextResponse.json({ error: 'Já existe uma categoria com este nome' }, { status: 400 });
    }

    const category = await db.menuCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        //image: imageUrl || null,
        restaurantId: restaurant.id,
      },
    })

    return NextResponse.json({
      message: 'Categoria criada com sucesso',
      category
    })
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}