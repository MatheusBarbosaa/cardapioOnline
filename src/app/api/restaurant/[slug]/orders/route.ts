// app/api/restaurants/[slug]/orders/route.ts

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAuthServer } from '@/lib/auth'
import { db } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Verificar autenticação
    const cookieStore = cookies()
    const token = (await cookieStore).get('auth-token')?.value
    const user = await verifyAuthServer(token)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado', success: false }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')

    // Validar paginação
    const validPage = Math.max(1, page)
    const validLimit = Math.min(Math.max(1, limit), 100) // Máximo 100 itens por página

    console.log(`🔍 Buscando pedidos do restaurante ${params.slug} - Página ${validPage}`)

    // Buscar restaurante
    const restaurant = await db.restaurant.findUnique({
      where: { slug: params.slug }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado', success: false }, 
        { status: 404 }
      )
    }

    // Verificar se usuário tem acesso ao restaurante
    if (user.restaurantId !== restaurant.id) {
      return NextResponse.json(
        { error: 'Acesso negado a este restaurante', success: false }, 
        { status: 403 }
      )
    }

    // Construir filtros
    const where: any = {
      restaurantId: restaurant.id
    }

    if (status && ['PENDING', 'PAYMENT_CONFIRMED', 'IN_PREPARATION', 'FINISHED', 'PAYMENT_FAILED'].includes(status)) {
      where.status = status
    }

    // Buscar pedidos com contagem total
    const [orders, totalCount] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          orderProducts: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (validPage - 1) * validLimit,
        take: validLimit
      }),
      db.order.count({ where })
    ])

    console.log(`✅ Encontrados ${orders.length} pedidos (${totalCount} total)`)

    const response = {
      success: true,
      orders: orders,
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalCount,
        pages: Math.ceil(totalCount / validLimit),
        hasNext: validPage * validLimit < totalCount,
        hasPrev: validPage > 1
      },
      filters: {
        status: status || null,
        restaurantId: restaurant.id
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar pedidos do restaurante:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        success: false,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Erro desconhecido' : undefined
      }, 
      { status: 500 }
    )
  }
}

// Listar apenas pedidos ativos (para polling mais eficiente)
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const cookieStore = cookies()
    const token = (await cookieStore).get('auth-token')?.value
    const user = await verifyAuthServer(token)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado', success: false }, { status: 401 })
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug: params.slug }
    })

    if (!restaurant || user.restaurantId !== restaurant.id) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado ou acesso negado', success: false }, 
        { status: 404 }
      )
    }

    // Buscar apenas pedidos ativos (não finalizados)
    const activeOrders = await db.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: {
          in: ['PENDING', 'PAYMENT_CONFIRMED', 'IN_PREPARATION'] // Excluir FINISHED e PAYMENT_FAILED
        }
      },
      include: {
        orderProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`🔄 ${activeOrders.length} pedidos ativos encontrados`)

    return NextResponse.json({
      success: true,
      orders: activeOrders,
      count: activeOrders.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro ao buscar pedidos ativos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', success: false }, 
      { status: 500 }
    )
  }
}