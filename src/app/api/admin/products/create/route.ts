import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma"; // named import corrigido

interface DecodedToken {
  restaurantId: string;
  // adicione outros campos se usar
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantSlug, name, description, price, categoryId, ingredients, imageUrl } = body;

    if (!name || !description || !price || !categoryId || !restaurantSlug) {
      return NextResponse.json(
        { error: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      );
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: "Preço deve ser maior que zero" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant || restaurant.id !== decoded.restaurantId) {
      return NextResponse.json(
        { error: "Restaurante não encontrado ou sem permissão" },
        { status: 403 }
      );
    }

    const category = await prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.restaurantId !== restaurant.id) {
      return NextResponse.json(
        { error: "Categoria não encontrada ou não pertence ao restaurante" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        imageUrl: imageUrl || null,
        ingredients: ingredients || [],
        restaurantId: restaurant.id,
        menuCategoryId: categoryId,
      },
    });

    return NextResponse.json({
      message: "Produto criado com sucesso",
      product,
    });
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
