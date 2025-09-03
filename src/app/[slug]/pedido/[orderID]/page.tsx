// app/[slug]/pedido/[orderId]/page.tsx MELHORADO
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { OrderTracking } from '@/components/OrderTracking'
import { db } from '@/lib/prisma'

interface OrderTrackingPageProps {
  params: Promise<{
    slug: string
    orderId: string
  }>
  searchParams: Promise<{
    payment?: string // ✅ Detectar se vem do Stripe
  }>
}

// ✅ Loading component para o Suspense
function OrderTrackingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Carregando seu Pedido...
          </h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

export default async function OrderTrackingPage({ params, searchParams }: OrderTrackingPageProps) {
  const { slug, orderId: orderIdParam } = await params
  const { payment } = await searchParams
  const orderId = parseInt(orderIdParam)
  
  if (isNaN(orderId)) {
    notFound()
  }

  // ✅ Buscar o pedido com retry para casos de race condition
  let order = null
  let retryCount = 0
  const maxRetries = 3
  
  while (!order && retryCount < maxRetries) {
    order = await db.order.findFirst({
      where: {
        id: orderId,
        restaurant: {
          slug: slug
        }
      },
      include: {
        orderProducts: {
          include: {
            product: true
          }
        },
        restaurant: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    })

    // ✅ Se vem do Stripe e status ainda é PENDING, aguardar webhook
    if (order && payment === 'success' && order.status === 'PENDING') {
      console.log(`⏳ Aguardando webhook processar pedido ${orderId}...`)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Aguardar 1s
      retryCount++
      order = null // Forçar nova busca
    } else {
      break // Sair do loop se pedido encontrado com status correto
    }
  }

  if (!order) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Acompanhe seu Pedido
          </h1>
          <p className="text-gray-600">
            Acompanhe o status do seu pedido em tempo real
          </p>
          
          {/* ✅ Mostrar feedback se vem do pagamento */}
          {payment === 'success' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Pagamento confirmado! Seu pedido está sendo processado.
              </p>
            </div>
          )}
        </div>
        
        <Suspense fallback={<OrderTrackingLoading />}>
          <OrderTracking 
            order={order}
            restaurantName={order.restaurant.name}
          />
        </Suspense>
      </div>
    </div>
  )
}