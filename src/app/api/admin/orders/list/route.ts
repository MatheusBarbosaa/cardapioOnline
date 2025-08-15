// app/api/admin/orders/list/route.js
import { NextResponse } from "next/server";

import { db } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const since = searchParams.get("since"); // ISO string opcional

    if (!slug) {
      return NextResponse.json({ orders: [] });
    }

    // Filtros dinâmicos baseados no parâmetro 'since'
    const whereConditions = { slug };
    const orderWhereConditions = {};

    // Se 'since' for fornecido, busca apenas pedidos modificados desde então
    if (since) {
      const sinceDate = new Date(since);
      orderWhereConditions.OR = [
        { createdAt: { gte: sinceDate } },
        { updatedAt: { gte: sinceDate } }
      ];
    }

    const restaurant = await db.restaurant.findUnique({
      where: whereConditions,
      include: {
        orders: {
          where: Object.keys(orderWhereConditions).length > 0 ? orderWhereConditions : undefined,
          include: {
            orderProducts: { 
              include: { product: true } 
            },
          },
          orderBy: [
            { status: 'asc' }, // Prioriza status importantes primeiro
            { updatedAt: 'desc' }, // Depois por mais recente
          ],
          // Limita quantidade para evitar sobrecarga
          take: since ? undefined : 50, // Se não tem 'since', pega apenas os 50 mais recentes
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ orders: [] });
    }

    // Adiciona metadados úteis para o frontend
    const orders = restaurant.orders;
    const metadata = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      confirmed: orders.filter(o => o.status === 'PAYMENT_CONFIRMED').length,
      preparing: orders.filter(o => o.status === 'IN_PREPARATION').length,
      finished: orders.filter(o => o.status === 'FINISHED').length,
      failed: orders.filter(o => o.status === 'PAYMENT_FAILED').length,
      lastUpdate: new Date().toISOString(),
    };

    // Headers para controle de cache
    const response = NextResponse.json({ 
      orders, 
      metadata,
      since: since || null 
    });

    // Não cacheia se há pedidos ativos importantes
    const hasActivePedidos = orders.some(o => 
      o.status === 'PAYMENT_CONFIRMED' || o.status === 'IN_PREPARATION'
    );

    if (hasActivePedidos) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      response.headers.set('Cache-Control', 'public, max-age=5'); // Cache de 5 segundos para pedidos inativos
    }

    return response;

  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    return NextResponse.json(
      { 
        orders: [], 
        error: "Erro interno do servidor",
        metadata: { total: 0 }
      }, 
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = 'force-dynamic'; // Sempre executa dinamicamente