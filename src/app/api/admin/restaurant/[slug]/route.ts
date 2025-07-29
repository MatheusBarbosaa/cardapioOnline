import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";

// Verificar autenticação
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    return decoded;
  } catch {
    return null;
  }
}

// GET - Buscar dados do restaurante
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatarImageUrl: true,
        coverImageUrl: true,
        isActive: true,
        stripeOnboarded: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado" },
        { status: 404 },
      );
    }

    // Verificar se o usuário tem permissão para este restaurante
    if (user.restaurant?.slug !== params.slug) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error("Erro ao buscar restaurante:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// PUT - Atualizar dados do restaurante
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se o usuário tem permissão para este restaurante
    if (user.restaurant?.slug !== params.slug) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { name, description, avatarImageUrl, coverImageUrl, isActive } =
      await request.json();

    // Validações básicas
    if (!name || !description) {
      return NextResponse.json(
        { error: "Nome e descrição são obrigatórios" },
        { status: 400 },
      );
    }

    // Validar URLs se fornecidas
    if (avatarImageUrl && !isValidUrl(avatarImageUrl)) {
      return NextResponse.json(
        { error: "URL do avatar inválida" },
        { status: 400 },
      );
    }

    if (coverImageUrl && !isValidUrl(coverImageUrl)) {
      return NextResponse.json(
        { error: "URL da capa inválida" },
        { status: 400 },
      );
    }

    const updatedRestaurant = await db.restaurant.update({
      where: { slug: params.slug },
      data: {
        name,
        description,
        avatarImageUrl,
        coverImageUrl,
        isActive,
      },
    });

    return NextResponse.json(updatedRestaurant);
  } catch (error) {
    console.error("Erro ao atualizar restaurante:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// Função auxiliar para validar URL
function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
