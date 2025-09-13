// app/api/admin/reports/sales/excel/route.ts
import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const slug = searchParams.get("slug");
    const period = searchParams.get("period") || "monthly";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!slug) {
      return new Response(JSON.stringify({ error: "Slug não fornecido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Export Excel chamado com:", { slug, period, startDate, endDate });

    // 1️⃣ Buscar restaurante
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
    });

    if (!restaurant) {
      return new Response(JSON.stringify({ error: "Restaurante não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2️⃣ Buscar pedidos com produtos
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      include: {
        orderProducts: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log("Pedidos encontrados:", orders.length);

    // 3️⃣ Criar planilha
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Relatório de Vendas");

    sheet.addRow(["Período", period]);
    sheet.addRow(["Início", startDate || ""]);
    sheet.addRow(["Fim", endDate || ""]);
    sheet.addRow([]);
    sheet.addRow(["ID Pedido", "Cliente", "Produtos", "Quantidade Total", "Total", "Data"]);

    // 4️⃣ Preencher linhas
    orders.forEach((order) => {
      const produtos = order.orderProducts.map(op => op.product.name).join(", ");
      const totalQuantidade = order.orderProducts.reduce((acc, op) => acc + op.quantity, 0);

      sheet.addRow([
        order.id,
        order.customerName || "",
        produtos,
        totalQuantidade,
        order.total,
        order.createdAt.toLocaleDateString("pt-BR"),
      ]);
    });

    // 5️⃣ Ajustar colunas
    sheet.columns.forEach((col) => {
      let max = 12;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        max = Math.max(max, cell.value?.toString().length ?? 0);
      });
      col.width = max + 2;
    });

    // 6️⃣ Gerar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename=relatorio-vendas-${period}.xlsx`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (err) {
    console.error("Erro no endpoint Excel:", err instanceof Error ? err.stack : err);

    return new Response(
      JSON.stringify({ error: "Erro interno ao gerar Excel" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
