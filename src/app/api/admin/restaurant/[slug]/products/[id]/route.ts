import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { slug: string, productId: string } }) {
  try {
    const { name, description, price, imageUrl } = await req.json();

    const updated = await prisma.product.update({
      where: { id: params.productId },
      data: { name, description, price, imageUrl },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 });
  }
}
