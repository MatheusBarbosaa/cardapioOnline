"use client"

import { Order, OrderProduct, Product } from "@prisma/client"
import { AlertCircle, Bell, CheckCircle, Clock, Package } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { pusherClient } from "@/lib/pusher"

interface OrderWithDetails extends Order {
  orderProducts: (OrderProduct & {
    product: Product
  })[]
}

interface OrdersManagementProps {
  initialOrders: OrderWithDetails[]
  restaurantId: string
}

const statusConfig = {
  PAYMENT_CONFIRMED: {
    label: "Pagamento Confirmado",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    next: "IN_PREPARATION"
  },
  IN_PREPARATION: {
    label: "Em Preparo",
    color: "bg-yellow-100 text-yellow-800", 
    icon: Clock,
    next: "FINISHED"
  },
  FINISHED: {
    label: "Pedido Pronto",
    color: "bg-blue-100 text-blue-800",
    icon: Package,
    next: null
  },
  PENDING: {
    label: "Aguardando Pagamento",
    color: "bg-gray-100 text-gray-800",
    icon: AlertCircle,
    next: null
  },
  PAYMENT_FAILED: {
    label: "Pagamento Falhou",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
    next: null
  }
}

export function OrdersManagement({ initialOrders, restaurantId }: OrdersManagementProps) {
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders)
  const [loading, setLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting")

  // Configurar Real-time subscription com Pusher
  useEffect(() => {
    if (!pusherClient) {
      console.error('Pusher client não está disponível')
      return
    }

    const channel = pusherClient.subscribe('orders-changes')
    
    // Escutar novos pedidos
    channel.bind('order-created', async (data: { orderId: number; restaurantId: string }) => {
      console.log('Novo pedido recebido via Pusher:', data)
      
      if (data.restaurantId === restaurantId) {
        // Buscar o pedido completo
        const { data: newOrder } = await fetchOrderWithProducts(data.orderId)
        if (newOrder) {
          setOrders(prev => [newOrder, ...prev])
          toast.success(`Novo pedido #${data.orderId} recebido!`, {
            description: `Cliente: ${newOrder.customerName}`
          })
          playNotificationSound()
        }
      }
    })

    // Escutar atualizações de pedidos
    channel.bind('order-updated', (data: { orderId: number; status: string; restaurantId: string; order: OrderWithDetails }) => {
      console.log('Pedido atualizado via Pusher:', data)
      
      if (data.restaurantId === restaurantId) {
        setOrders(prev => prev.map(order => 
          order.id === data.orderId 
            ? { ...order, status: data.status, updatedAt: new Date() }
            : order
        ))
      }
    })

    // Monitorar conexão
    pusherClient.connection.bind('state_change', (states: any) => {
      setConnectionStatus(states.current)
      console.log('Pusher connection state:', states.current)
    })

    return () => {
      channel.unbind('order-created')
      channel.unbind('order-updated')
      pusherClient.unsubscribe('orders-changes')
    }
  }, [restaurantId])

  async function fetchOrderWithProducts(orderId: number) {
    const response = await fetch(`/api/orders/${orderId}?includeProducts=true`)
    if (response.ok) {
      return await response.json()
    }
    return { data: null }
  }

  function playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3')
      audio.play().catch(() => {
        // Fallback silencioso se não conseguir tocar
      })
    } catch (error) {
      // Ignore se não conseguir tocar o som
    }
  }

  async function updateOrderStatus(orderId: number, newStatus: string) {
    setLoading(`${orderId}-${newStatus}`)
    
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar status')
      }

      // O evento Pusher irá atualizar automaticamente via real-time
      toast.success('Status do pedido atualizado!')
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status do pedido')
    } finally {
      setLoading(null)
    }
  }

  // Filtrar pedidos por status
  const filteredOrders = orders.filter(order => {
    if (activeTab === "all") return true
    if (activeTab === "pending") return ["PAYMENT_CONFIRMED", "IN_PREPARATION"].includes(order.status)
    if (activeTab === "finished") return order.status === "FINISHED"
    return order.status === activeTab
  })

  const pendingOrdersCount = orders.filter(order => 
    ["PAYMENT_CONFIRMED", "IN_PREPARATION"].includes(order.status)
  ).length

  // Função para obter informações de conexão
  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case "connecting":
        return { color: "text-blue-600", text: "Conectando...", icon: "🔄" };
      case "connected":
        return { color: "text-green-600", text: "Conectado - Tempo real ativo", icon: "✅" };
      case "unavailable":
      case "failed":
        return { color: "text-red-600", text: "Erro de conexão", icon: "⚠️" };
      default:
        return { color: "text-gray-600", text: "Conectando...", icon: "⏳" };
    }
  };

  const connectionInfo = getConnectionStatusInfo();

  return (
    <div className="space-y-6">
      {/* Header com notificações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Pedidos</h2>
          {pendingOrdersCount > 0 && (
            <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full">
              <Bell className="w-4 h-4" />
              <span className="font-medium">{pendingOrdersCount} pendente(s)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Status da conexão */}
          <div className="flex items-center gap-2 text-sm">
            <span>{connectionInfo.icon}</span>
            <span className={connectionInfo.color}>{connectionInfo.text}</span>
          </div>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Todos ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes ({pendingOrdersCount})
          </TabsTrigger>
          <TabsTrigger value="FINISHED">
            Finalizados ({orders.filter(o => o.status === "FINISHED").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">
                  {activeTab === "all" 
                    ? "Nenhum pedido encontrado" 
                    : `Nenhum pedido ${activeTab === "pending" ? "pendente" : "nesta categoria"}`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map(order => {
              const config = statusConfig[order.status as keyof typeof statusConfig]
              const StatusIcon = config?.icon || AlertCircle
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Pedido #{order.id}</CardTitle>
                        <div className="text-sm text-gray-600 space-y-1 mt-2">
                          <p><strong>Cliente:</strong> {order.customerName}</p>
                          <p><strong>CPF:</strong> {order.customerCpf}</p>
                          <p><strong>Tipo:</strong> {order.consumptionMethod === "TAKEAWAY" ? "Retirada" : "No Local"}</p>
                          <p><strong>Data:</strong> {new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-3">
                        <div className="text-2xl font-bold text-green-600">
                          R$ {order.total.toFixed(2)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <Badge className={config?.color || "bg-gray-100 text-gray-800"}>
                            {config?.label || order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Lista de produtos */}
                    <div>
                      <h4 className="font-medium mb-2">Itens do Pedido:</h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        {order.orderProducts.map(orderProduct => (
                          <div key={orderProduct.id} className="flex justify-between items-center">
                            <span className="text-sm">
                              {orderProduct.quantity}x {orderProduct.product.name}
                            </span>
                            <span className="text-sm font-medium">
                              R$ {(orderProduct.quantity * orderProduct.price).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Botão de ação */}
                    {config?.next && (
                      <div className="pt-2">
                        <Button
                          onClick={() => updateOrderStatus(order.id, config.next!)}
                          disabled={loading === `${order.id}-${config.next}`}
                          className="w-full"
                          size="lg"
                        >
                          {loading === `${order.id}-${config.next}` ? (
                            "Atualizando..."
                          ) : (
                            <>
                              {config.next === "IN_PREPARATION" && "Iniciar Preparo"}
                              {config.next === "FINISHED" && "Marcar como Pronto"}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}