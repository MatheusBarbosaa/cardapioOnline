export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { categoryId, name, description, price, imageUrl } = await req.json();

    const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
    if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

    const product = await prisma.product.create({
      data: { categoryId, name, description, price, imageUrl },
    });

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar produto" }, { status: 500 });
  }
}
