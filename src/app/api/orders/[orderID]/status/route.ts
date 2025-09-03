// app/api/orders/[orderId]/status/route.ts
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAuthServer } from '@/lib/auth'
import { db } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

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

    // 🚀 ENVIAR EVENTO PUSHER PARA O CLIENTE
    if (pusherServer) {
      try {
        await pusherServer.trigger(
          `order-${orderId}`, // Canal específico do pedido
          'status-update',     // Nome do evento
          {
            orderId: orderId,
            status: status,
            updatedAt: new Date().toISOString()
          }
        )
        console.log(`✅ Pusher event sent: order-${orderId} status-update`)
      } catch (pusherError) {
        console.error('❌ Erro ao enviar evento Pusher:', pusherError)
        // Não retornamos erro aqui para não quebrar a atualização do status
      }
    } else {
      console.error('❌ pusherServer não está configurado')
    }

    // 🚀 TAMBÉM ENVIAR PARA O CANAL DE ADMINISTRAÇÃO (para atualizar listas do admin)
    if (pusherServer) {
      try {
        await pusherServer.trigger(
          'orders-changes', // Canal geral para administração
          'order-updated',  // Nome do evento
          {
            orderId: orderId,
            status: status,
            restaurantId: user.restaurantId,
            updatedAt: new Date().toISOString(),
            order: updatedOrder // Enviar o pedido completo
          }
        )
        console.log(`✅ Pusher admin event sent: orders-changes order-updated`)
      } catch (pusherError) {
        console.error('❌ Erro ao enviar evento Pusher para admin:', pusherError)
      }
    }

    return NextResponse.json(updatedOrder)

  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}