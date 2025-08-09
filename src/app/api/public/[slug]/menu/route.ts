import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Busca o restaurante pelo slug e carrega categorias e produtos
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        MenuCategory: {
          orderBy: { createdAt: "asc" }, // Mantém ordem de criação
          select: {
            id: true,
            name: true,
            description: true,
            Product: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        categories: restaurant.MenuCategory
      }
    });
  } catch (error) {
    console.error("Erro ao buscar cardápio:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
