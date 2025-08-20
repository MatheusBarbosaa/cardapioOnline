import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma'; // Ajuste o caminho conforme sua estrutura

export async function POST(request: NextRequest) {
  try {
    const { orderIds, timestamp } = await request.json();

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de IDs de pedidos é obrigatória' },
        { status: 400 }
      );
    }

    console.log(`🔍 Verificando status de ${orderIds.length} pedidos...`);

    // Busca todos os pedidos de uma vez
    const orders = await prisma.order.findMany({
      where: {
        id: {
          in: orderIds
        }
      },
      include: {
        restaurant: {
          select: {
            name: true,
            avatarImageUrl: true,
          },
        },
        orderProducts: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Encontrados ${orders.length} pedidos no banco`);

    // Headers para evitar cache
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    };

    return NextResponse.json(
      { 
        data: orders,
        timestamp: new Date().toISOString(),
        count: orders.length
      },
      { 
        status: 200,
        headers 
      }
    );

  } catch (error) {
    console.error('❌ Erro na verificação de status:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Método GET alternativo caso precise
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderIds = searchParams.get('orderIds')?.split(',').map(id => parseInt(id, 10));
  
  if (!orderIds || orderIds.length === 0) {
    return NextResponse.json(
      { error: 'Parâmetro orderIds é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        id: {
          in: orderIds
        }
      },
      include: {
        restaurant: {
          select: {
            name: true,
            avatarImageUrl: true,
          },
        },
        orderProducts: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    return NextResponse.json(
      { 
        data: orders,
        timestamp: new Date().toISOString()
      },
      { 
        status: 200,
        headers 
      }
    );

  } catch (error) {
    console.error('Erro na verificação de status (GET):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}