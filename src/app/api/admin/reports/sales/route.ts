// app/api/admin/reports/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const period = searchParams.get('period') || 'monthly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!slug) {
      return NextResponse.json(
        { error: 'Restaurant slug é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o restaurante
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, name: true }
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      );
    }

    // Definir período de consulta
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const queryStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const queryEndDate = endDate ? new Date(endDate) : defaultEndDate;

    // Buscar pedidos - QUERY MAIS DEFENSIVA
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: {
          in: ['PAYMENT_CONFIRMED', 'FINISHED']
        },
        createdAt: {
          gte: queryStartDate,
          lte: queryEndDate
        }
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        customerCpf: true,
        status: true,
        orderProducts: {
          select: {
            quantity: true,
            price: true,
            product: {
              select: {
                id: true,
                name: true,
                menuCategory: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Processar dados baseado no período
    const salesData = processSalesDataByPeriod(orders, period, queryStartDate, queryEndDate);
    
    // KPIs principais
    const kpiData = calculateKPIs(orders);
    
    // Top produtos
    const topProducts = getTopProducts(orders);
    
    // Vendas por categoria
    const categoryData = getSalesByCategory(orders);

    // Headers para evitar cache
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    return NextResponse.json(
      {
        salesData,
        kpiData,
        topProducts,
        categoryData,
        metadata: {
          restaurant: restaurant.name,
          period,
          startDate: queryStartDate.toISOString(),
          endDate: queryEndDate.toISOString(),
          totalOrders: orders.length,
          timestamp: new Date().toISOString()
        }
      },
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Erro na API de relatórios:', error);
    
    // Log mais detalhado para debug
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erro no banco de dados'
      },
      { status: 500 }
    );
  }
}

function processSalesDataByPeriod(orders: any[], period: string, startDate: Date, endDate: Date) {
  const groupedData = new Map();

  orders.forEach(order => {
    let key: string;
    const orderDate = new Date(order.createdAt);

    switch (period) {
      case 'daily':
        key = orderDate.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = getWeekStart(orderDate);
        key = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
        break;
      case 'monthly':
        key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
        key = `${orderDate.getFullYear()}-Q${quarter}`;
        break;
      case 'yearly':
        key = orderDate.getFullYear().toString();
        break;
      default:
        key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        period: key,
        vendas: 0,
        pedidos: 0,
        clientes: new Set(),
        data: orderDate
      });
    }

    const data = groupedData.get(key);
    // TRATAMENTO DEFENSIVO - usar total ou calcular dos produtos
    const orderTotal = order.total || calculateOrderTotal(order.orderProducts);
    data.vendas += orderTotal;
    data.pedidos += 1;
    
    // Tratamento defensivo para CPF
    if (order.customerCpf) {
      data.clientes.add(order.customerCpf);
    }
  });

  // Converter para array e formatar
  const result = Array.from(groupedData.values())
    .map(item => ({
      ...item,
      clientes: item.clientes.size,
      data: undefined
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Formatar labels baseado no período
  return result.map(item => {
    let label: string;
    
    switch (period) {
      case 'daily':
        const date = new Date(item.period);
        label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'weekly':
        label = `Sem ${item.period.split('-W')[1]}`;
        break;
      case 'monthly':
        const [year, month] = item.period.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        label = monthNames[parseInt(month) - 1];
        break;
      case 'quarterly':
        label = item.period.replace('-Q', ' T');
        break;
      case 'yearly':
        label = item.period;
        break;
      default:
        label = item.period;
    }

    return {
      [period === 'daily' ? 'date' : period === 'weekly' ? 'periodo' : 'mes']: label,
      vendas: Math.round(item.vendas * 100) / 100,
      pedidos: item.pedidos,
      clientes: item.clientes
    };
  });
}

// FUNÇÃO AUXILIAR para calcular total se não existir
function calculateOrderTotal(orderProducts: any[]): number {
  if (!orderProducts || !Array.isArray(orderProducts)) return 0;
  
  return orderProducts.reduce((total, op) => {
    const price = op.price || 0;
    const quantity = op.quantity || 0;
    return total + (price * quantity);
  }, 0);
}

function calculateKPIs(orders: any[]) {
  // CÁLCULO DEFENSIVO do total
  const totalVendas = orders.reduce((sum, order) => {
    const orderTotal = order.total || calculateOrderTotal(order.orderProducts);
    return sum + orderTotal;
  }, 0);
  
  const totalPedidos = orders.length;
  const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;
  
  // Clientes únicos com tratamento defensivo
  const clientesUnicos = new Set(
    orders
      .filter(order => order.customerCpf)
      .map(order => order.customerCpf)
  ).size;

  const crescimento = 12.5; // Placeholder
  const taxaConversao = 3.8; // Placeholder

  return {
    totalVendas: Math.round(totalVendas * 100) / 100,
    totalPedidos,
    ticketMedio: Math.round(ticketMedio * 100) / 100,
    crescimento: Math.round(crescimento * 10) / 10,
    clientesAtivos: clientesUnicos,
    taxaConversao: Math.round(taxaConversao * 10) / 10
  };
}

function getTopProducts(orders: any[]) {
  const productStats = new Map();

  orders.forEach(order => {
    if (!order.orderProducts || !Array.isArray(order.orderProducts)) return;
    
    order.orderProducts.forEach((op: any) => {
      if (!op.product || !op.product.id) return;
      
      const productId = op.product.id;
      
      if (!productStats.has(productId)) {
        productStats.set(productId, {
          produto: op.product.name || 'Produto sem nome',
          vendas: 0,
          unidades: 0
        });
      }

      const stats = productStats.get(productId);
      const price = op.price || 0;
      const quantity = op.quantity || 0;
      
      stats.vendas += price * quantity;
      stats.unidades += quantity;
    });
  });

  return Array.from(productStats.values())
    .sort((a, b) => b.vendas - a.vendas)
    .slice(0, 5)
    .map(item => ({
      ...item,
      vendas: Math.round(item.vendas * 100) / 100
    }));
}

function getSalesByCategory(orders: any[]) {
  const categoryStats = new Map();
  let totalSales = 0;

  orders.forEach(order => {
    if (!order.orderProducts || !Array.isArray(order.orderProducts)) return;
    
    order.orderProducts.forEach((op: any) => {
      if (!op.product) return;
      
      const categoryName = op.product.menuCategory?.name || 'Outros';
      const price = op.price || 0;
      const quantity = op.quantity || 0;
      const sales = price * quantity;
      
      if (!categoryStats.has(categoryName)) {
        categoryStats.set(categoryName, 0);
      }
      
      categoryStats.set(categoryName, categoryStats.get(categoryName) + sales);
      totalSales += sales;
    });
  });

  const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];
  let colorIndex = 0;

  const result = Array.from(categoryStats.entries())
    .map(([name, value]) => ({
      name,
      value: totalSales > 0 ? Math.round((value / totalSales) * 1000) / 10 : 0,
      color: colors[colorIndex++ % colors.length]
    }))
    .sort((a, b) => b.value - a.value);

  return result;
}

// Funções auxiliares para cálculos de semana
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
