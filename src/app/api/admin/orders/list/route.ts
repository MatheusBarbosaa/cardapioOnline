import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const orderIdsParam = searchParams.get("orderIds");
    const lastUpdateParam = searchParams.get("lastUpdate");

    console.log("🔍 API List - Parâmetros recebidos:", {
      slug,
      orderIds: orderIdsParam ? `${orderIdsParam.substring(0, 30)}...` : null,
      lastUpdate: lastUpdateParam,
      allParams: Object.fromEntries(searchParams.entries()),
    });

    // Busca por IDs específicos (quando orderIds é enviado)
    if (orderIdsParam) {
      const orderIds = orderIdsParam
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));

      console.log("📋 Buscando por IDs específicos:", { count: orderIds.length });

      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: {
          orderProducts: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
          coupon: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const timestamp = new Date().toISOString();
      console.log("✅ Retornando pedidos por IDs:", { count: orders.length });

      return NextResponse.json(
        { orders, timestamp, count: orders.length },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Validação do slug
    if (!slug || slug === "undefined" || slug === "null") {
      console.log("❌ Slug inválido:", { slug });
      return NextResponse.json(
        { error: "Slug é obrigatório e deve ser válido para buscar pedidos" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // lastUpdate opcional
    let lastUpdate: Date | undefined;
    if (lastUpdateParam) {
      const parsed = new Date(lastUpdateParam);
      if (!isNaN(parsed.getTime())) {
        lastUpdate = parsed;
      } else {
        console.log("⚠️ lastUpdate inválido, ignorando filtro por data");
      }
    }

    console.log("🏪 Buscando pedidos por slug:", { slug, lastUpdate });

    const orders = await prisma.order.findMany({
      where: {
        restaurant: { slug },
        ...(lastUpdate && { updatedAt: { gte: lastUpdate } }),
      },
      include: {
        orderProducts: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
        coupon: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const timestamp = new Date().toISOString();

    console.log("✅ Retornando pedidos por slug:", {
      count: orders.length,
      slug,
      sampleIds: orders.slice(0, 3).map((o) => o.id),
    });

    // 🔧 CORREÇÃO: padroniza retorno como { orders: [...] }
    return NextResponse.json(
      { orders, timestamp, count: orders.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("❌ Erro ao buscar pedidos:", {
      message: error?.message || "Erro desconhecido",
      stack: error?.stack || "Stack não disponível",
    });
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error?.message || "Erro desconhecido" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
