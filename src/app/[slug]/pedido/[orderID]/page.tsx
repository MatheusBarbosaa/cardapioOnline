// app/[slug]/pedido/[orderId]/page.tsx
import { notFound } from 'next/navigation'

import { OrderTracking } from '@/components/OrderTracking'
import { db } from '@/lib/prisma'

interface OrderTrackingPageProps {
  params: Promise<{
    slug: string // ✅ Agora usa 'slug' igual às outras páginas
    orderId: string
  }>
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { slug, orderId: orderIdParam } = await params
  const orderId = parseInt(orderIdParam)
  
  if (isNaN(orderId)) {
    notFound()
  }

  // Buscar o pedido com todos os dados necessários
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      restaurant: {
        slug: slug // ✅ Agora usa a variável slug diretamente
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
        </div>
        
        <OrderTracking 
          order={order}
          restaurantName={order.restaurant.name}
        />
      </div>
    </div>
  )
}

// Função para gerar metadados dinâmicos
export async function generateMetadata({ params }: OrderTrackingPageProps) {
  const { slug, orderId: orderIdParam } = await params
  const orderId = parseInt(orderIdParam)
  
  if (isNaN(orderId)) {
    return {
      title: 'Pedido não encontrado'
    }
  }

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      restaurant: {
        slug: slug // ✅ Agora usa a variável slug diretamente
      }
    },
    include: {
      restaurant: {
        select: {
          name: true
        }
      }
    }
  })

  if (!order) {
    return {
      title: 'Pedido não encontrado'
    }
  }

  return {
    title: `Pedido #${order.id} - ${order.restaurant.name}`,
    description: `Acompanhe o status do seu pedido #${order.id} no ${order.restaurant.name}`
  }
}