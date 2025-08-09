import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";

// Função para verificar autenticação
async function getAuthenticatedUser(slug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    
    const restaurant = await db.restaurant.findFirst({
      where: {
        slug,
        users: {
          some: {
            id: decoded.userId
          }
        }
      }
    });

    if (!restaurant) {
      return null;
    }

    return { user: decoded, restaurant };
  } catch {
    return null;
  }
}

// PUT - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const auth = await getAuthenticatedUser(slug);

    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    // Validações
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    // Verifica se a categoria existe e pertence ao restaurante
    const existingCategory = await db.menuCategory.findFirst({
      where: {
        id,
        restaurantId: auth.restaurant.id
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    // Verifica se já existe outra categoria com esse nome
    const duplicateCategory = await db.menuCategory.findFirst({
      where: {
        name: name.trim(),
        restaurantId: auth.restaurant.id,
        NOT: {
          id
        }
      }
    });

    if (duplicateCategory) {
      return NextResponse.json(
        { error: "Já existe uma categoria com este nome" },
        { status: 400 }
      );
    }

    // Atualiza a categoria
    const updatedCategory = await db.menuCategory.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : existingCategory.isActive
      },
      include: {
        products: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Excluir categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const auth = await getAuthenticatedUser(slug);

    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verifica se a categoria existe e pertence ao restaurante
    const existingCategory = await db.menuCategory.findFirst({
      where: {
        id,
        restaurantId: auth.restaurant.id
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    // Verifica se há produtos na categoria
    if (existingCategory._count.products > 0) {
      return NextResponse.json(
        { 
          error: "Não é possível excluir categoria que possui produtos. Exclua os produtos primeiro." 
        },
        { status: 400 }
      );
    }

    // Exclui a categoria
    await db.menuCategory.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Categoria excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}