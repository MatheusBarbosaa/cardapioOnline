// app/api/orders/[orderId]/stream/route.ts
import { NextRequest } from 'next/server'

import { db } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const orderId = parseInt(params.orderId)
  
  if (isNaN(orderId)) {
    return new Response('Invalid order ID', { status: 400 })
  }

  // Verificar se o pedido existe
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      orderProducts: {
        include: { product: true }
      }
    }
  })

  if (!order) {
    return new Response('Order not found', { status: 404 })
  }

  // Configurar SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  }

  // Criar stream
  const stream = new ReadableStream({
    start(controller) {
      // Enviar dados iniciais
      const initialData = `data: ${JSON.stringify({
        type: 'initial',
        order: order,
        timestamp: new Date().toISOString()
      })}\n\n`
      
      controller.enqueue(new TextEncoder().encode(initialData))

      // Função para buscar atualizações
      const checkForUpdates = async () => {
        try {
          const updatedOrder = await db.order.findUnique({
            where: { id: orderId },
            include: {
              orderProducts: {
                include: { product: true }
              }
            }
          })

          if (updatedOrder && updatedOrder.updatedAt > order.updatedAt) {
            const updateData = `data: ${JSON.stringify({
              type: 'update',
              order: updatedOrder,
              timestamp: new Date().toISOString()
            })}\n\n`
            
            controller.enqueue(new TextEncoder().encode(updateData))
            
            // Atualizar referência local
            order.updatedAt = updatedOrder.updatedAt
            order.status = updatedOrder.status
          }

          // Keepalive
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`
          
          controller.enqueue(new TextEncoder().encode(heartbeat))
          
        } catch (error) {
          console.error('Error checking for updates:', error)
        }
      }

      // Verificar atualizações a cada 2 segundos
      const interval = setInterval(checkForUpdates, 2000)

      // Cleanup quando conexão for fechada
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })

      // Timeout após 5 minutos para evitar conexões órfãs
      setTimeout(() => {
        clearInterval(interval)
        controller.close()
      }, 300000) // 5 minutos
    }
  })

  return new Response(stream, { headers })
}

// app/api/orders/[orderId]/status/route.ts - PATCH atualizado
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // ... código de autenticação existente ...

    const orderId = parseInt(params.orderId)
    const { status } = await request.json()

    // ... validações existentes ...

    // Atualizar status com timestamp para detectar mudanças
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { 
        status,
        updatedAt: new Date() // Importante: sempre atualizar timestamp
      },
      include: {
        orderProducts: {
          include: {
            product: true
          }
        }
      }
    })

    // ✅ SSE detectará automaticamente a mudança via updatedAt
    console.log(`Status do pedido ${orderId} atualizado para: ${status}`)

    return NextResponse.json(updatedOrder)

  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}