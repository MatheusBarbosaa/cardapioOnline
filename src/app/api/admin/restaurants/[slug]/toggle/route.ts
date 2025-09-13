import { verify } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";

export async function PUT(req: NextRequest, context: { params: { slug: string } }) {
  // Espera o params antes de usar
  const { slug } = await context.params; // ✅ Corrigido

  try {
    const cookieStore = req.cookies;
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    if (!decoded) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const body = await req.json();
    const { isOpen } = body;

    if (typeof isOpen !== "boolean") {
      return NextResponse.json({ error: "isOpen precisa ser boolean" }, { status: 400 });
    }

    const updatedRestaurant = await db.restaurant.update({
      where: { slug },
      data: { isOpen },
    });

    return NextResponse.json({ success: true, isOpen: updatedRestaurant.isOpen });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar status da loja" }, { status: 500 });
  }
}
