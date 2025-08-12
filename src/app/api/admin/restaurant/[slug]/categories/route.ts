export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { name, description } = await req.json();
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: params.slug },
    });
    if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

    const category = await prisma.menuCategory.create({
      data: {
        name,
        description,
        restaurantId: restaurant.id,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 });
  }
}
