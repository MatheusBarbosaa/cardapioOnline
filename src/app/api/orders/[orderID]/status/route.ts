// app/api/orders/[orderId]/status/route.ts
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAuthServer } from '@/lib/auth'
import { db } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verificar autenticação
    const cookieStore = cookies()
    const token = (await cookieStore).get('auth-token')?.value
    const user = await verifyAuthServer(token)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orderId = parseInt(params.orderId)
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID do pedido inválido' }, { status: 400 })
    }

    const { status } = await request.json()

    // Validar status
    const validStatuses = ['PENDING', 'PAYMENT_CONFIRMED', 'IN_PREPARATION', 'FINISHED', 'PAYMENT_FAILED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    // Verificar se o pedido pertence ao restaurante do usuário
    const existingOrder = await db.order.findFirst({
      where: {
        id: orderId,
        restaurantId: user.restaurantId
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Atualizar status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        orderProducts: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json(updatedOrder)

  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}

// app/api/orders/[orderId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = parseInt(params.orderId)
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID do pedido inválido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const includeProducts = searchParams.get('includeProducts') === 'true'

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: includeProducts ? {
        orderProducts: {
          include: {
            product: true
          }
        }
      } : undefined
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: order })

  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}